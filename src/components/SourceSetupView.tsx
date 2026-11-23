import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileUp,
  Info,
  Loader2,
  Play,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AUDIENCE_OPTIONS,
  DETAIL_OPTIONS,
  ExtractedSourceResponse,
  LANGUAGE_OPTIONS,
  OBJECTIVE_OPTIONS,
  OUTPUT_FORMAT_CATALOG,
  OutputFormatId,
  STYLE_OPTIONS,
  TONE_OPTIONS,
  TransformSettings,
} from '../types/transform';
import { parseApiResponse } from '../utils/api';

interface SourceSetupViewProps {
  sourceText: string;
  sourceName: string;
  sourceType: string;
  onSourceChange: (text: string, name?: string, type?: string) => void;
  selectedFormats: OutputFormatId[];
  onToggleFormat: (id: OutputFormatId) => void;
  onSetFormats: (ids: OutputFormatId[]) => void;
  settings: TransformSettings;
  onSettingsChange: (next: TransformSettings) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

const MIN_CHARS = 20;

const PIPELINE_STEPS = [
  { id: 1, label: '01. Normalize & Guard' },
  { id: 2, label: '02. Extract Source Schema' },
  { id: 3, label: '03. Parallel Generation' },
  { id: 4, label: '04. Validate Deliverables' },
];

export const SourceSetupView: React.FC<SourceSetupViewProps> = ({
  sourceText,
  sourceName,
  sourceType,
  onSourceChange,
  selectedFormats,
  onToggleFormat,
  onSetFormats,
  settings,
  onSettingsChange,
  onGenerate,
  isGenerating,
  errorMessage,
  onClearError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractInfo, setExtractInfo] = useState<{
    filename: string;
    method: string;
    warnings: string[];
  } | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [activePipelineStep, setActivePipelineStep] = useState(1);

  useEffect(() => {
    if (!isGenerating) {
      setActivePipelineStep(1);
      return;
    }
    const t1 = setTimeout(() => setActivePipelineStep(2), 900);
    const t2 = setTimeout(() => setActivePipelineStep(3), 2600);
    const t3 = setTimeout(() => setActivePipelineStep(4), 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isGenerating]);

  const charCount = sourceText.length;
  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
  const canGenerate = charCount >= MIN_CHARS && selectedFormats.length > 0 && !isGenerating && !isExtracting;

  async function handleFileUpload(file: File) {
    setExtractError(null);
    setExtractInfo(null);
    onClearError();
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const extracted = await parseApiResponse<ExtractedSourceResponse>(
        res,
        'Failed to extract content from uploaded file.'
      );
      onSourceChange(extracted.extracted_text, extracted.filename, extracted.source_type);
      setExtractInfo({
        filename: extracted.filename,
        method: extracted.extraction_method,
        warnings: extracted.warnings,
      });
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Unable to process uploaded file.');
    } finally {
      setIsExtracting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  }

  const coreFiveIds: OutputFormatId[] = [
    'executive_summary',
    'linkedin_post',
    'x_thread',
    'advisory',
    'presentation',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-6xl mx-auto px-6 py-6 space-y-6"
    >
      {/* Main Two-Column Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Source Content Input & Upload */}
        <section className="lg:col-span-7 bg-white/55 dark:bg-[#101624]/55 backdrop-blur-xl border border-white/70 dark:border-white/12 shadow-[0_8px_32px_rgba(15,23,42,0.06)] rounded-xl p-5 space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Source content
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {sourceName !== 'Pasted source text' ? (
                  <>
                    Loaded from{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {sourceName}
                    </span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span className="uppercase">{sourceType}</span>
                  </>
                ) : (
                  'Paste text directly or upload a document, image, audio, or video file.'
                )}
              </p>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
              {charCount.toLocaleString()} chars · {wordCount.toLocaleString()} words
            </div>
          </div>

          <div>
            <label htmlFor="source-textarea" className="sr-only">
              Source text
            </label>
            <textarea
              id="source-textarea"
              value={sourceText}
              onChange={(e) => {
                onSourceChange(e.target.value, sourceName, sourceType);
                if (errorMessage) onClearError();
              }}
              placeholder="Paste a report, threat bulletin, research abstract, policy brief, incident post-mortem, or notes here..."
              className="w-full min-h-[268px] p-3.5 text-sm leading-relaxed text-slate-900 dark:text-slate-100 bg-white/40 dark:bg-[#090d16]/45 backdrop-blur-md border border-white/65 dark:border-white/12 rounded-lg resize-y placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:bg-white/70 dark:focus:bg-[#0d121e]/75 focus:border-sky-600 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Drag & Drop / File Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border border-dashed rounded-lg px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md transition-colors ${
              isDragging
                ? 'border-sky-500 bg-sky-500/15 dark:bg-sky-500/20'
                : 'border-slate-400/45 dark:border-white/20 bg-white/30 dark:bg-white/[0.04] hover:border-slate-500/60 dark:hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={isExtracting}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/75 dark:border-white/15 hover:bg-white/80 dark:hover:bg-white/15 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                {isExtracting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-blue-400" aria-hidden="true" />
                ) : (
                  <FileUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                )}
                {isExtracting ? 'Extracting...' : 'Upload file'}
              </motion.button>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                TXT, MD, PDF, DOCX, PNG/JPG (OCR), MP3/WAV, MP4/WEBM · max 10 MB
              </div>
            </div>

            {sourceText.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSourceChange('', 'Pasted source text', 'text');
                  setExtractInfo(null);
                  setExtractError(null);
                }}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap shrink-0"
              >
                Clear text
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.mp4,.webm,.mov"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleFileUpload(file);
                }
                e.target.value = '';
              }}
            />
          </div>

          <AnimatePresence>
            {extractError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-start gap-2.5 px-3.5 py-2.5 bg-red-500/15 dark:bg-red-950/45 backdrop-blur-md border border-red-400/40 dark:border-red-700/50 rounded-lg text-xs text-red-900 dark:text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{extractError}</span>
              </motion.div>
            )}

            {extractInfo && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-start gap-2.5 px-3.5 py-2.5 bg-white/45 dark:bg-white/[0.06] backdrop-blur-md border border-white/65 dark:border-white/12 rounded-lg text-xs text-slate-700 dark:text-slate-300"
              >
                <Info className="w-4 h-4 text-sky-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <div>
                    Extracted <span className="font-medium">{extractInfo.filename}</span> ({extractInfo.method}). Review or edit the text above before generating.
                  </div>
                  {extractInfo.warnings.map((w, i) => (
                    <div key={i} className="text-amber-700 dark:text-amber-300">
                      {w}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right: Output Format Selection */}
        <section className="lg:col-span-5 bg-white/55 dark:bg-[#101624]/55 backdrop-blur-xl border border-white/70 dark:border-white/12 shadow-[0_8px_32px_rgba(15,23,42,0.06)] rounded-xl p-5 space-y-3.5 transition-colors duration-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Output formats
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                {selectedFormats.length} of {OUTPUT_FORMAT_CATALOG.length} selected
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium whitespace-nowrap shrink-0">
              <button
                type="button"
                onClick={() => onSetFormats(coreFiveIds)}
                className="text-sky-600 dark:text-blue-400 hover:underline"
              >
                Core 5
              </button>
              <button
                type="button"
                onClick={() => onSetFormats(OUTPUT_FORMAT_CATALOG.map((f) => f.id))}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onSetFormats([])}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
              >
                None
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {OUTPUT_FORMAT_CATALOG.map((format) => {
              const checked = selectedFormats.includes(format.id);
              return (
                <motion.button
                  key={format.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => onToggleFormat(format.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg border backdrop-blur-md transition-colors flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    checked
                      ? 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/55 dark:border-sky-400/50 shadow-xs'
                      : 'bg-white/35 dark:bg-white/[0.04] border-white/60 dark:border-white/10 hover:bg-white/55 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                      checked
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-white/50 dark:bg-white/10 border-slate-400/50 dark:border-white/25'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {format.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {format.tier}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      {format.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Generation Settings */}
      <section className="bg-white/55 dark:bg-[#101624]/55 backdrop-blur-xl border border-white/70 dark:border-white/12 shadow-[0_8px_32px_rgba(15,23,42,0.06)] rounded-xl p-5 space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Generation settings
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Applied consistently across all selected outputs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="setting-audience"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Target audience
            </label>
            <select
              id="setting-audience"
              value={settings.audience}
              onChange={(e) => onSettingsChange({ ...settings, audience: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-white/50 dark:bg-[#0b101b]/55 backdrop-blur-md border border-white/70 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white/75 dark:focus:bg-[#0d121e]/80 focus:border-sky-600 dark:focus:border-blue-400 dark:[color-scheme:dark] transition-colors"
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="setting-tone"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Tone
            </label>
            <select
              id="setting-tone"
              value={settings.tone}
              onChange={(e) => onSettingsChange({ ...settings, tone: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-white/50 dark:bg-[#0b101b]/55 backdrop-blur-md border border-white/70 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white/75 dark:focus:bg-[#0d121e]/80 focus:border-sky-600 dark:focus:border-blue-400 dark:[color-scheme:dark] transition-colors"
            >
              {TONE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="setting-language"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Language
            </label>
            <select
              id="setting-language"
              value={settings.language}
              onChange={(e) => onSettingsChange({ ...settings, language: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-white/50 dark:bg-[#0b101b]/55 backdrop-blur-md border border-white/70 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white/75 dark:focus:bg-[#0d121e]/80 focus:border-sky-600 dark:focus:border-blue-400 dark:[color-scheme:dark] transition-colors"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="setting-detail"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Detail level
            </label>
            <select
              id="setting-detail"
              value={settings.detail_level}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  detail_level: e.target.value as TransformSettings['detail_level'],
                })
              }
              className="w-full h-10 px-3 text-sm bg-white/50 dark:bg-[#0b101b]/55 backdrop-blur-md border border-white/70 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white/75 dark:focus:bg-[#0d121e]/80 focus:border-sky-600 dark:focus:border-blue-400 dark:[color-scheme:dark] transition-colors"
            >
              {DETAIL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="setting-objective"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Communication objective
            </label>
            <select
              id="setting-objective"
              value={settings.objective}
              onChange={(e) => onSettingsChange({ ...settings, objective: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-white/50 dark:bg-[#0b101b]/55 backdrop-blur-md border border-white/70 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white/75 dark:focus:bg-[#0d121e]/80 focus:border-sky-600 dark:focus:border-blue-400 dark:[color-scheme:dark] transition-colors"
            >
              {OBJECTIVE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="setting-style"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Content style
            </label>
            <select
              id="setting-style"
              value={settings.style}
              onChange={(e) => onSettingsChange({ ...settings, style: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-white/50 dark:bg-[#0b101b]/55 backdrop-blur-md border border-white/70 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white/75 dark:focus:bg-[#0d121e]/80 focus:border-sky-600 dark:focus:border-blue-400 dark:[color-scheme:dark] transition-colors"
            >
              {STYLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Error State Banner */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start justify-between gap-4 px-4 py-3.5 bg-red-500/15 dark:bg-red-950/45 backdrop-blur-xl border border-red-400/45 dark:border-red-700/50 rounded-xl text-sm text-red-950 dark:text-red-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-semibold">Transformation failed</div>
                <div className="text-xs text-red-800 dark:text-red-300 mt-0.5">{errorMessage}</div>
              </div>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onGenerate}
              disabled={!canGenerate}
              className="px-3 py-1.5 text-xs font-semibold text-red-900 dark:text-red-200 bg-white/60 dark:bg-red-950/60 backdrop-blur-md border border-red-300/70 dark:border-red-700 hover:bg-white/80 dark:hover:bg-red-900/50 rounded-lg whitespace-nowrap shrink-0"
            >
              Retry
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Footer Panel + Live Pipeline Stepper */}
      <section className="bg-white/55 dark:bg-[#101624]/55 backdrop-blur-xl border border-white/70 dark:border-white/12 shadow-[0_8px_32px_rgba(15,23,42,0.06)] rounded-xl p-5 space-y-4 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-700 dark:text-slate-300">
              {isGenerating ? (
                <span className="font-medium text-sky-700 dark:text-blue-400">
                  Running transformation pipeline for {selectedFormats.length} deliverable
                  {selectedFormats.length === 1 ? '' : 's'}...
                </span>
              ) : charCount < MIN_CHARS ? (
                <span>Enter or upload at least {MIN_CHARS} characters to enable Generate.</span>
              ) : selectedFormats.length === 0 ? (
                <span>Select at least one output format on the right.</span>
              ) : (
                <span>
                  Ready to extract structured source intelligence and generate{' '}
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedFormats.length}
                  </strong>{' '}
                  deliverable{selectedFormats.length === 1 ? '' : 's'}.
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Generated content is AI-assisted and must be reviewed by a human before external distribution.
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={canGenerate ? { y: -1 } : undefined}
            whileTap={canGenerate ? { scale: 0.97 } : undefined}
            transition={{ duration: 0.14 }}
            disabled={!canGenerate}
            onClick={onGenerate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600/85 hover:bg-sky-600 backdrop-blur-md border border-sky-400/50 shadow-md shadow-sky-600/15 disabled:bg-slate-900/10 dark:disabled:bg-white/10 disabled:border-white/60 dark:disabled:border-white/10 disabled:shadow-none disabled:text-slate-500 dark:disabled:text-slate-400 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Transforming...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" aria-hidden="true" />
                Generate
              </>
            )}
          </motion.button>
        </div>

        {/* Live Animated Pipeline Stepper during active generation */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="pt-3 border-t border-slate-900/10 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {PIPELINE_STEPS.map((step) => {
                const done = activePipelineStep > step.id;
                const active = activePipelineStep === step.id;
                return (
                  <div
                    key={step.id}
                    className={`px-3 py-2 rounded-lg border backdrop-blur-md text-xs transition-colors ${
                      done
                        ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/40 dark:border-emerald-400/40 text-emerald-900 dark:text-emerald-200'
                        : active
                          ? 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/45 dark:border-sky-400/45 text-sky-900 dark:text-sky-200 font-medium'
                          : 'bg-white/35 dark:bg-white/[0.04] border-white/60 dark:border-white/10 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{step.label}</span>
                      {done ? (
                        <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : active ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  );
};
