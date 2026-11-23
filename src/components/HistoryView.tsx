import React, { useMemo, useState } from 'react';
import { Download, ExternalLink, Search, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { TransformationJob } from '../types/transform';

interface HistoryViewProps {
  jobs: TransformationJob[];
  activeJobId?: string;
  onOpenJob: (job: TransformationJob) => void;
  onDeleteJob: (jobId: string) => void;
  onGoToSource: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  jobs,
  activeJobId,
  onOpenJob,
  onDeleteJob,
  onGoToSource,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.source.filename.toLowerCase().includes(q) ||
        j.job_id.toLowerCase().includes(q) ||
        j.settings.audience.toLowerCase().includes(q) ||
        j.settings.language.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  async function handleExportDossier(jobId: string) {
    const res = await fetch('/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossier_${jobId}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-6xl mx-auto px-6 py-6 space-y-5"
    >
      <div className="bg-white/90 dark:bg-[#131720]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Transformation History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Retained job metadata, structured representations, and versioned deliverables.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by source, job ID, audience..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-[#0f131b] focus:border-blue-600 dark:focus:border-blue-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/90 dark:bg-[#131720]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {jobs.length === 0
              ? 'No transformation jobs have been run yet.'
              : 'No jobs match your search filter.'}
          </p>
          {jobs.length === 0 && (
            <button
              type="button"
              onClick={onGoToSource}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Create First Transformation
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/90 dark:bg-[#131720]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0b0e14] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Source</th>
                <th className="py-3 px-4 font-semibold">Configuration</th>
                <th className="py-3 px-4 font-semibold text-right">Outputs</th>
                <th className="py-3 px-4 font-semibold text-right">Latency</th>
                <th className="py-3 px-4 font-semibold">Created</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((job) => {
                const isActive = job.job_id === activeJobId;
                return (
                  <tr
                    key={job.job_id}
                    className={`transition-colors ${
                      isActive
                        ? 'bg-blue-50/50 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {job.source.filename}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {job.job_id} · {job.source.word_count.toLocaleString()} words
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {job.settings.audience} · {job.settings.tone} · {job.settings.language}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {job.outputs.length}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {(job.latency_ms / 1000).toFixed(1)}s
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(job.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenJob(job)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleExportDossier(job.job_id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Download DOCX Dossier"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteJob(job.job_id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                          title="Delete job"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};
