import 'dotenv/config';
import crypto from 'crypto';
import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_SETTINGS,
  GeneratedOutput,
  JobErrorItem,
  OUTPUT_FORMAT_CATALOG,
  OutputFormatId,
  TransformationJob,
  TransformSettings,
} from './src/types/transform';
import { isGeminiConfigured, normalizeGeminiError } from './server/geminiClient';
import { generateSingleOutput } from './server/generator';
import {
  cleanAndNormalizeText,
  countWords,
  extractSourceFromUpload,
  IngestionError,
  MAX_SOURCE_CHARS,
  MAX_UPLOAD_BYTES,
  MIN_SOURCE_CHARS,
} from './server/ingestion';
import { deleteJobById, getJobById, listJobs, recordAuditEvent, saveJob } from './server/store';
import { extractStructuredRepresentation } from './server/understanding';
import { validateGeneratedOutput } from './server/validator';
import { buildFullDossierDocx, buildSingleOutputDocx } from './server/exporter';

const PORT = 3000;
const VALID_OUTPUT_IDS = new Set<string>(OUTPUT_FORMAT_CATALOG.map((item) => item.id));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

function sanitizeSettings(input: Partial<TransformSettings> | undefined): TransformSettings {
  return {
    audience: (input?.audience || DEFAULT_SETTINGS.audience).toString().slice(0, 120),
    tone: (input?.tone || DEFAULT_SETTINGS.tone).toString().slice(0, 80),
    language: (input?.language || DEFAULT_SETTINGS.language).toString().slice(0, 60),
    detail_level:
      input?.detail_level === 'concise' || input?.detail_level === 'comprehensive'
        ? input.detail_level
        : 'medium',
    objective: (input?.objective || DEFAULT_SETTINGS.objective).toString().slice(0, 120),
    style: (input?.style || DEFAULT_SETTINGS.style).toString().slice(0, 80),
  };
}

function sanitizeOutputTypes(raw: unknown): OutputFormatId[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<OutputFormatId>();
  for (const item of raw) {
    if (typeof item === 'string' && VALID_OUTPUT_IDS.has(item)) {
      unique.add(item as OutputFormatId);
    }
  }
  return Array.from(unique);
}

async function createAppServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health check (never exposes API keys)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      ai_configured: isGeminiConfigured(),
      supported_formats: OUTPUT_FORMAT_CATALOG.map((f) => f.id),
    });
  });

  // M2: Upload & extract file into editable text
  app.post('/api/extract', (req: Request, res: Response) => {
    upload.single('file')(req, res, async (multerErr: unknown) => {
      if (multerErr) {
        const msg =
          multerErr instanceof multer.MulterError && multerErr.code === 'LIMIT_FILE_SIZE'
            ? 'File exceeds the 10 MB maximum upload limit.'
            : 'Invalid file upload request.';
        res.status(400).json({ error: msg });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file provided for extraction.' });
        return;
      }

      const start = Date.now();
      try {
        const extracted = await extractSourceFromUpload(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        recordAuditEvent({
          action: 'extract_file',
          status: 'success',
          latency_ms: Date.now() - start,
          detail: `${extracted.source_type}:${extracted.extraction_method}`,
        });
        res.json(extracted);
      } catch (err) {
        const statusCode =
          err instanceof IngestionError
            ? err.statusCode
            : normalizeGeminiError(err).statusCode;
        const message =
          err instanceof IngestionError
            ? err.message
            : normalizeGeminiError(err).message;
        recordAuditEvent({
          action: 'extract_file',
          status: 'error',
          latency_ms: Date.now() - start,
          detail: message.slice(0, 120),
        });
        res.status(statusCode).json({ error: message });
      }
    });
  });

  // M3 + M4 + M5 + M6: Transform source text into multiple outputs
  app.post('/api/transform', async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const { source_text, source_name, source_type, output_types, settings } = req.body ?? {};

    const cleanedText = cleanAndNormalizeText(typeof source_text === 'string' ? source_text : '');
    if (cleanedText.length < MIN_SOURCE_CHARS) {
      res.status(400).json({
        error: `Please provide at least ${MIN_SOURCE_CHARS} characters of source content.`,
      });
      return;
    }

    const boundedText = cleanedText.slice(0, MAX_SOURCE_CHARS);
    const requestedTypes = sanitizeOutputTypes(output_types);
    if (requestedTypes.length === 0) {
      res.status(400).json({ error: 'Select at least one output format to generate.' });
      return;
    }

    const cleanSettings = sanitizeSettings(settings);
    const safeFilename = path.basename(
      typeof source_name === 'string' && source_name.trim() ? source_name.trim() : 'Pasted source text'
    );
    const safeSourceType =
      typeof source_type === 'string' && source_type.trim() ? source_type.trim().slice(0, 24) : 'text';
    const jobId = `job_${crypto.randomUUID().slice(0, 10)}`;

    try {
      // M3: Structured source representation (shared across all outputs)
      const sourceRepresentation = await extractStructuredRepresentation(boundedText, safeFilename);

      // M4 + M5 + M6: Generate each selected output independently from shared representation
      const settled = await Promise.allSettled(
        requestedTypes.map((type) =>
          generateSingleOutput(type, sourceRepresentation, cleanSettings, boundedText)
        )
      );

      const outputs: GeneratedOutput[] = [];
      const errors: JobErrorItem[] = [];

      settled.forEach((result, idx) => {
        const formatId = requestedTypes[idx];
        if (result.status === 'fulfilled') {
          outputs.push(result.value);
        } else {
          const normErr = normalizeGeminiError(result.reason);
          errors.push({
            output_type: formatId,
            stage: 'generation',
            message: normErr.message,
            retryable: normErr.retryable,
          });
        }
      });

      const latencyMs = Date.now() - startedAt;
      const status: TransformationJob['status'] =
        outputs.length === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'completed';

      if (status === 'failed') {
        recordAuditEvent({
          action: 'transform',
          job_id: jobId,
          status: 'error',
          latency_ms: latencyMs,
          detail: errors[0]?.message,
        });
        res.status(502).json({
          error: errors[0]?.message || 'All requested output generations failed.',
          errors,
        });
        return;
      }

      const now = new Date().toISOString();
      const job: TransformationJob = {
        job_id: jobId,
        created_at: now,
        updated_at: now,
        status,
        latency_ms: latencyMs,
        source: {
          filename: safeFilename,
          source_type: safeSourceType,
          char_count: boundedText.length,
          word_count: countWords(boundedText),
          preview: boundedText.slice(0, 420),
        },
        settings: cleanSettings,
        source_representation: sourceRepresentation,
        outputs,
        errors,
      };

      saveJob(job);
      recordAuditEvent({
        action: 'transform',
        job_id: jobId,
        status: status === 'partial' ? 'partial' : 'success',
        latency_ms: latencyMs,
        detail: `outputs=${outputs.length}/${requestedTypes.length}`,
      });

      res.json(job);
    } catch (err) {
      const normErr = normalizeGeminiError(err);
      const latencyMs = Date.now() - startedAt;
      recordAuditEvent({
        action: 'transform',
        job_id: jobId,
        status: 'error',
        latency_ms: latencyMs,
        detail: normErr.code,
      });
      res.status(normErr.statusCode).json({
        error: normErr.message,
        code: normErr.code,
        retryable: normErr.retryable,
      });
    }
  });

  // FR-18: Regenerate a single output without regenerating all others
  app.post('/api/jobs/:jobId/regenerate', async (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const { output_type, instruction, settings, source_text } = req.body ?? {};
    const job = getJobById(jobId);

    if (!job) {
      res.status(404).json({ error: 'Transformation job not found in history.' });
      return;
    }

    if (typeof output_type !== 'string' || !VALID_OUTPUT_IDS.has(output_type)) {
      res.status(400).json({ error: 'Invalid output_type specified for regeneration.' });
      return;
    }

    const formatId = output_type as OutputFormatId;
    const effectiveSettings = settings ? sanitizeSettings(settings) : job.settings;
    const existingOutput = job.outputs.find((o) => o.type === formatId);
    const boundedSource =
      typeof source_text === 'string' && source_text.trim().length >= MIN_SOURCE_CHARS
        ? cleanAndNormalizeText(source_text).slice(0, MAX_SOURCE_CHARS)
        : job.source.preview;

    const startedAt = Date.now();
    try {
      const regenerated = await generateSingleOutput(
        formatId,
        job.source_representation,
        effectiveSettings,
        boundedSource,
        {
          existingVersion: existingOutput?.version ?? 0,
          extraInstruction: typeof instruction === 'string' ? instruction.trim().slice(0, 400) : undefined,
        }
      );

      const nextOutputs = existingOutput
        ? job.outputs.map((o) => (o.type === formatId ? regenerated : o))
        : [...job.outputs, regenerated];

      const updatedJob: TransformationJob = {
        ...job,
        settings: effectiveSettings,
        outputs: nextOutputs,
        errors: job.errors.filter((e) => e.output_type !== formatId),
        status: 'completed',
        updated_at: new Date().toISOString(),
      };

      saveJob(updatedJob);
      recordAuditEvent({
        action: 'regenerate',
        job_id: jobId,
        status: 'success',
        latency_ms: Date.now() - startedAt,
        detail: `${formatId}:v${regenerated.version}`,
      });

      res.json({ job: updatedJob, output: regenerated });
    } catch (err) {
      const normErr = normalizeGeminiError(err);
      recordAuditEvent({
        action: 'regenerate',
        job_id: jobId,
        status: 'error',
        latency_ms: Date.now() - startedAt,
        detail: `${formatId}:${normErr.code}`,
      });
      res.status(normErr.statusCode).json({ error: normErr.message, retryable: normErr.retryable });
    }
  });

  // FR-17: Save operator edits to a single output and re-run validation
  app.patch('/api/jobs/:jobId/outputs/:outputId', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const outputId = String(req.params.outputId || '');
    const { content } = req.body ?? {};
    const job = getJobById(jobId);

    if (!job) {
      res.status(404).json({ error: 'Transformation job not found.' });
      return;
    }

    const idx = job.outputs.findIndex((o) => o.output_id === outputId);
    if (idx === -1) {
      res.status(404).json({ error: 'Output artifact not found.' });
      return;
    }

    if (typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'Edited content cannot be empty.' });
      return;
    }

    const existing = job.outputs[idx];
    const nextContent = content.trim();

    // Update structured x_posts counts if editing x_thread text blocks
    let nextStructured = existing.structured_payload;
    if (existing.type === 'x_thread') {
      const blocks = nextContent
        .split(/\n{2,}/)
        .map((b) => b.trim())
        .filter(Boolean);
      nextStructured = {
        ...existing.structured_payload,
        x_posts: blocks.map((text, i) => ({
          index: i + 1,
          text,
          char_count: text.length,
        })),
      };
    }

    const validation = validateGeneratedOutput(
      existing.type,
      nextContent,
      job.source_representation,
      job.settings,
      nextStructured
    );

    const updatedOutput: GeneratedOutput = {
      ...existing,
      content: nextContent,
      structured_payload: nextStructured,
      validation_status: validation.validation_status,
      validation_warnings: validation.validation_warnings,
      metrics: validation.metrics,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    };

    const nextOutputs = [...job.outputs];
    nextOutputs[idx] = updatedOutput;

    const updatedJob: TransformationJob = {
      ...job,
      outputs: nextOutputs,
      updated_at: new Date().toISOString(),
    };

    saveJob(updatedJob);
    recordAuditEvent({
      action: 'edit_output',
      job_id: jobId,
      status: 'success',
      detail: `${existing.type}:v${updatedOutput.version}`,
    });

    res.json({ job: updatedJob, output: updatedOutput });
  });

  // FR-21: History endpoints
  app.get('/api/jobs', (_req: Request, res: Response) => {
    res.json({ jobs: listJobs() });
  });

  app.get('/api/jobs/:jobId', (req: Request, res: Response) => {
    const job = getJobById(String(req.params.jobId || ''));
    if (!job) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    res.json(job);
  });

  app.delete('/api/jobs/:jobId', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const deleted = deleteJobById(jobId);
    if (!deleted) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    recordAuditEvent({ action: 'delete_job', job_id: jobId, status: 'success' });
    res.json({ deleted: true });
  });

  // FR-19 / SRS Should: Real DOCX export for single deliverable or full dossier
  app.post('/api/export/docx', async (req: Request, res: Response) => {
    const { job_id, output_id } = req.body ?? {};
    const job = typeof job_id === 'string' ? getJobById(job_id) : null;

    if (!job) {
      res.status(404).json({ error: 'Transformation job not found for export.' });
      return;
    }

    try {
      let buffer: Buffer;
      let filename: string;

      if (typeof output_id === 'string' && output_id.trim()) {
        const output = job.outputs.find((o) => o.output_id === output_id);
        if (!output) {
          res.status(404).json({ error: 'Requested deliverable not found in job.' });
          return;
        }
        buffer = await buildSingleOutputDocx(output, job);
        filename = `${output.type}_v${output.version}.docx`;
      } else {
        buffer = await buildFullDossierDocx(job);
        filename = `transformation_dossier_${job.job_id}.docx`;
      }

      recordAuditEvent({ action: 'export_docx', job_id: job.job_id, status: 'success' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch {
      recordAuditEvent({ action: 'export_docx', job_id: job.job_id, status: 'error' });
      res.status(500).json({ error: 'Failed to build DOCX export file.' });
    }
  });

  // Mount Vite middleware in development, or serve static dist/ in production
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gen AI Content Transformation Platform running on http://0.0.0.0:${PORT}`);
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
