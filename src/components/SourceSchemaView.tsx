import React, { useState } from 'react';
import { Check, Code2, Copy, Download, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { TransformationJob } from '../types/transform';

interface SourceSchemaViewProps {
  job: TransformationJob | null;
  onGoToSource: () => void;
}

export const SourceSchemaView: React.FC<SourceSchemaViewProps> = ({ job, onGoToSource }) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white/90 dark:bg-[#131720]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
          <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" aria-hidden="true" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            No structured source representation yet
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Run a transformation first. Module M3 extracts a shared schema of summary, facts, entities, dates, and caveats used to ground every deliverable.
          </p>
          <button
            type="button"
            onClick={onGoToSource}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go to Source & Settings
          </button>
        </div>
      </div>
    );
  }

  const rep = job.source_representation;
  const fullAppendixJson = JSON.stringify(
    {
      job_id: job.job_id,
      source: {
        filename: job.source.filename,
        source_type: job.source.source_type,
        language: job.settings.language,
      },
      settings: job.settings,
      source_representation: rep,
    },
    null,
    2
  );

  async function handleCopyJson() {
    try {
      await navigator.clipboard.writeText(fullAppendixJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked
    }
  }

  function handleDownloadJson() {
    const blob = new Blob([fullAppendixJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `source_schema_${job!.job_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto px-6 py-6 space-y-6"
    >
      <div className="bg-white/90 dark:bg-[#131720]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Structured Source Representation
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{job.source.filename}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{job.source.word_count.toLocaleString()} words</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Job {job.job_id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRawJson((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            {showRawJson ? 'Structured View' : 'Inspect JSON'}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy JSON
              </>
            )}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap transition-colors"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            .json
          </motion.button>
        </div>
      </div>

      {showRawJson ? (
        <motion.div
          key="raw-json"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-5 overflow-x-auto"
        >
          <pre className="font-mono text-xs leading-relaxed">{fullAppendixJson}</pre>
        </motion.div>
      ) : (
        <motion.div
          key="structured-view"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-white/90 dark:bg-[#131720]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800"
        >
          <div className="p-5 space-y-2">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Summary</h2>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{rep.summary}</p>
            {rep.context && (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Context: </span>
                {rep.context}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-5 space-y-2.5">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Key Points ({rep.key_points.length})
              </h2>
              {rep.key_points.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">None extracted.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-800 dark:text-slate-200 list-disc pl-4">
                  {rep.key_points.map((pt, i) => (
                    <li key={i} className="leading-snug">
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-5 space-y-2.5">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Verified Facts ({rep.facts.length})
              </h2>
              {rep.facts.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">None extracted.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-800 dark:text-slate-200 list-disc pl-4">
                  {rep.facts.map((fact, i) => (
                    <li key={i} className="leading-snug">
                      {fact}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-5 space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Entities ({rep.entities.length})
              </h2>
              {rep.entities.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">None named.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {rep.entities.map((ent, i) => (
                    <li key={i}>{ent}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-5 space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Dates & Milestones ({rep.dates.length})
              </h2>
              {rep.dates.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">No explicit dates.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-mono">
                  {rep.dates.map((dt, i) => (
                    <li key={i}>{dt}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-5 space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Caveats & Scope ({rep.caveats.length})
              </h2>
              {rep.caveats.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">No caveats noted.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-300">
                  {rep.caveats.map((cav, i) => (
                    <li key={i}>{cav}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
