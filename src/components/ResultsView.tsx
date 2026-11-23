import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  FileDown,
  Loader2,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GeneratedOutput, OutputFormatId, TransformationJob } from '../types/transform';
import { parseApiResponse } from '../utils/api';

interface ResultsViewProps {
  job: TransformationJob | null;
  sourceText: string;
  onJobUpdated: (job: TransformationJob) => void;
  onGoToSource: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  job,
  sourceText,
  onJobUpdated,
  onGoToSource,
}) => {
  const [filterType, setFilterType] = useState<OutputFormatId | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  const [regenTarget, setRegenTarget] = useState<OutputFormatId | null>(null);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [regeneratingType, setRegeneratingType] = useState<OutputFormatId | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exportingDocxId, setExportingDocxId] = useState<string | null>(null);

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white/90 dark:bg-[#131720]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            No transformation results yet
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Provide source content, pick your target formats, and click Generate to review, edit, validate, and export your deliverables.
          </p>
          <button
            type="button"
            onClick={onGoToSource}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Configure Source & Settings
          </button>
        </div>
      </div>
    );
  }

  const visibleOutputs =
    filterType === 'all' ? job.outputs : job.outputs.filter((o) => o.type === filterType);

  async function handleCopy(output: GeneratedOutput) {
    try {
      await navigator.clipboard.writeText(output.content);
      setCopiedId(output.output_id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setActionError('Clipboard write failed in this browser context. Use Download instead.');
    }
  }

  function handleDownloadText(output: GeneratedOutput, ext: 'md' | 'txt') {
    const content =
      ext === 'txt'
        ? output.content.replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '$1')
        : output.content;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${output.type}_v${output.version}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadJobJson() {
    const blob = new Blob([JSON.stringify(job, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transformation_job_${job!.job_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadDocx(outputId?: string) {
    setActionError(null);
    const key = outputId || 'full_dossier';
    setExportingDocxId(key);
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job!.job_id, output_id: outputId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'DOCX export failed.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputId ? `${outputId}.docx` : `dossier_${job!.job_id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to export DOCX.');
    } finally {
      setExportingDocxId(null);
    }
  }

  async function handleSaveEdit(output: GeneratedOutput) {
    setActionError(null);
    setSavingEditId(output.output_id);
    try {
      const res = await fetch(`/api/jobs/${job!.job_id}/outputs/${output.output_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editDraft }),
      });
      const data = await parseApiResponse<{ job: TransformationJob }>(
        res,
        'Failed to save edits.'
      );
      onJobUpdated(data.job);
      setEditingId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save edited output.');
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleRegenerateSingle(outputType: OutputFormatId) {
    setActionError(null);
    setRegeneratingType(outputType);
    try {
      const res = await fetch(`/api/jobs/${job!.job_id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output_type: outputType,
          instruction: regenInstruction,
          source_text: sourceText,
        }),
      });
      const data = await parseApiResponse<{ job: TransformationJob }>(
        res,
        'Failed to regenerate output.'
      );
      onJobUpdated(data.job);
      setRegenTarget(null);
      setRegenInstruction('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Regeneration failed.');
    } finally {
      setRegeneratingType(null);
    }
  }

  function renderStructuredBody(output: GeneratedOutput) {
    const payload = output.structured_payload;

    if (output.type === 'x_thread' && payload?.x_posts && payload.x_posts.length > 0) {
      return (
        <div className="space-y-3">
          {payload.x_posts.map((post) => {
            const over = post.text.length > 280;
            const ratio = Math.min(post.text.length / 280, 1);
            return (
              <div
                key={post.index}
                className={`p-3.5 rounded-lg border transition-colors ${
                  over
                    ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b0e14]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mb-1.5">
                  <span>Post {post.index}</span>
                  <span className={over ? 'text-red-700 dark:text-red-400 font-semibold' : ''}>
                    {post.text.length} / 280 chars
                  </span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {post.text}
                </p>
                <div className="mt-2.5 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: ratio }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: 'left center' }}
                    className={`h-full w-full ${
                      over
                        ? 'bg-red-600'
                        : ratio > 0.88
                          ? 'bg-amber-500'
                          : 'bg-sky-600 dark:bg-blue-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (output.type === 'presentation' && payload?.slides && payload.slides.length > 0) {
      return (
        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
          {payload.slides.map((slide) => (
            <div key={slide.slide_number} className="p-4 space-y-2.5">
              <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Slide {slide.slide_number}. {slide.title}
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {slide.bullets.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
              <div className="pt-1 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Visual direction:{' '}
                  </span>
                  {slide.visual_suggestion}
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Speaker notes:{' '}
                  </span>
                  {slide.speaker_notes}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (
      output.type === 'infographic_plan' &&
      payload?.infographic_sections &&
      payload.infographic_sections.length > 0
    ) {
      return (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0b0e14] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Section</th>
                <th className="py-2.5 px-3 font-semibold">Key Copy / Data</th>
                <th className="py-2.5 px-3 font-semibold">Visual / Chart</th>
                <th className="py-2.5 px-3 font-semibold">Layout Cue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {payload.infographic_sections.map((sec) => (
                <tr key={sec.order} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {sec.order}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                    {sec.heading}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{sec.data_point}</td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{sec.visual_type}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{sec.layout_note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (
      output.type === 'video_package' &&
      payload?.video_scenes &&
      payload.video_scenes.length > 0
    ) {
      return (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0b0e14] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Scene</th>
                <th className="py-2.5 px-3 font-semibold">Duration</th>
                <th className="py-2.5 px-3 font-semibold">Visual Direction</th>
                <th className="py-2.5 px-3 font-semibold">Voiceover Narration</th>
                <th className="py-2.5 px-3 font-semibold">Subtitles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {payload.video_scenes.map((sc) => (
                <tr key={sc.scene_number} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 align-top">
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {sc.scene_number}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {sc.duration_sec}s
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                    {sc.visual_direction}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">{sc.narration}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 italic">
                    {sc.subtitle_text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
        {output.content}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto px-6 py-6 space-y-6"
    >
      {/* Job Summary & Full Export Bar */}
      <div className="bg-white/90 dark:bg-[#131720]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Generated Deliverables
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {job.source.filename}
            </span>
            <span aria-hidden="true">·</span>
            <span>{job.settings.audience}</span>
            <span aria-hidden="true">·</span>
            <span>{job.settings.tone}</span>
            <span aria-hidden="true">·</span>
            <span>{job.settings.language}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {(job.latency_ms / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            disabled={exportingDocxId === 'full_dossier'}
            onClick={() => void handleDownloadDocx()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-blue-500 disabled:opacity-60 rounded-lg whitespace-nowrap transition-colors"
          >
            {exportingDocxId === 'full_dossier' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Export Dossier (.docx)
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadJobJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap transition-colors"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Job JSON
          </motion.button>
        </div>
      </div>

      {/* Partial Errors Alert */}
      {job.errors.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <div className="font-semibold">Some formats reported generation errors:</div>
          {job.errors.map((err, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span>
                {err.output_type}: {err.message}
              </span>
              {err.output_type && (
                <button
                  type="button"
                  onClick={() => void handleRegenerateSingle(err.output_type!)}
                  className="text-xs font-semibold underline whitespace-nowrap"
                >
                  Retry {err.output_type}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {actionError && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-700 dark:text-red-300 hover:text-red-900"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Animated Format Filter Bar */}
      {job.outputs.length > 1 && (
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-[#131720] border border-transparent dark:border-slate-800 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`relative px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              filterType === 'all'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {filterType === 'all' && (
              <motion.span
                layoutId="deliverable-filter-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-md shadow-xs"
              />
            )}
            <span className="relative z-10">All Outputs ({job.outputs.length})</span>
          </button>
          {job.outputs.map((out) => {
            const active = filterType === out.type;
            return (
              <button
                key={out.output_id}
                type="button"
                onClick={() => setFilterType(out.type)}
                className={`relative px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="deliverable-filter-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-md shadow-xs"
                  />
                )}
                <span className="relative z-10">{out.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Deliverable Cards */}
      <div className="space-y-5">
        <AnimatePresence mode="popLayout">
          {visibleOutputs.map((output, index) => {
            const isEditing = editingId === output.output_id;
            const isRegenOpen = regenTarget === output.type;
            const isRegenerating = regeneratingType === output.type;

            return (
              <motion.article
                key={output.output_id}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(index * 0.04, 0.16),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="bg-white dark:bg-[#131720] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors duration-200"
              >
                {/* Card Header */}
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {output.title}
                    </h2>
                    <span className="text-xs text-slate-400 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      v{output.version}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {output.metrics.word_count} words / {output.metrics.char_count} chars
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    {output.validation_status === 'passed' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Validation passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        {output.validation_warnings.length} validation warning
                        {output.validation_warnings.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {/* Card Controls */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(output.output_id);
                          setEditDraft(output.content);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md whitespace-nowrap transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        Edit
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isRegenerating}
                      onClick={() => setRegenTarget(isRegenOpen ? null : output.type)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md whitespace-nowrap disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                      Regenerate
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopy(output)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md whitespace-nowrap transition-colors"
                    >
                      {copiedId === output.output_id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          Copy
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadText(output, 'md')}
                      className="px-2 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Download Markdown"
                    >
                      .md
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadText(output, 'txt')}
                      className="px-2 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Download Plain Text"
                    >
                      .txt
                    </button>

                    <button
                      type="button"
                      disabled={exportingDocxId === output.output_id}
                      onClick={() => void handleDownloadDocx(output.output_id)}
                      className="px-2 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md disabled:opacity-50 transition-colors"
                      title="Download Word Document"
                    >
                      {exportingDocxId === output.output_id ? '...' : '.docx'}
                    </button>
                  </div>
                </div>

                {/* Validation Warnings Strip */}
                {output.validation_warnings.length > 0 && (
                  <div className="px-5 py-2.5 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-800/60 space-y-1">
                    {output.validation_warnings.map((w, idx) => (
                      <div key={idx} className="text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Single-Output Regeneration Refinement Bar */}
                <AnimatePresence>
                  {isRegenOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                      className="px-5 py-3 bg-slate-50 dark:bg-[#0b0e14] border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                    >
                      <input
                        type="text"
                        value={regenInstruction}
                        onChange={(e) => setRegenInstruction(e.target.value)}
                        placeholder="Optional refinement instruction (e.g. Make shorter, highlight deadlines)..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#131720] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:border-sky-600 dark:focus:border-blue-500"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          disabled={isRegenerating}
                          onClick={() => void handleRegenerateSingle(output.type)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 whitespace-nowrap"
                        >
                          {isRegenerating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          Regenerate {output.title}
                        </motion.button>
                        <button
                          type="button"
                          onClick={() => setRegenTarget(null)}
                          className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Deliverable Body or Inline Editor */}
                <div className="p-5">
                  {isEditing ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={12}
                        className="w-full p-3.5 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-[#0b0e14] border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-[#0f131b] focus:border-blue-600 dark:focus:border-blue-500"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Saving creates version v{output.version + 1} and re-runs format validation.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          >
                            Cancel
                          </button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            disabled={savingEditId === output.output_id}
                            onClick={() => void handleSaveEdit(output)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
                          >
                            <Save className="w-3.5 h-3.5" aria-hidden="true" />
                            {savingEditId === output.output_id ? 'Saving...' : 'Save Changes'}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    renderStructuredBody(output)
                  )}
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
