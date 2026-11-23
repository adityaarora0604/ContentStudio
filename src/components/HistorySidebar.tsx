import React, { useMemo, useState } from 'react';
import { Clock, FileText, Moon, Search, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { SAMPLE_BRIEFS, SampleBrief } from '../data/samples';
import { TransformationJob } from '../types/transform';

interface HistorySidebarProps {
  jobs: TransformationJob[];
  activeJobId?: string;
  onSelectJob: (job: TransformationJob) => void;
  onLoadSample: (sample: SampleBrief) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

function formatShortTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  jobs,
  activeJobId,
  onSelectJob,
  onLoadSample,
  isDark,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs.slice(0, 12);
    return jobs
      .filter(
        (j) =>
          j.source.filename.toLowerCase().includes(q) ||
          j.settings.audience.toLowerCase().includes(q) ||
          j.source_representation.summary.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [jobs, query]);

  return (
    <aside className="relative z-10 hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-white/55 dark:border-white/10 bg-white/55 dark:bg-[#0f1420]/55 backdrop-blur-xl min-h-[calc(100vh-3.5rem)] transition-colors duration-200">
      <div className="p-4 border-b border-slate-900/10 dark:border-white/10">
        <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
          Sample Briefs
        </h2>
        <div className="space-y-1">
          {SAMPLE_BRIEFS.map((sample) => (
            <motion.button
              key={sample.id}
              type="button"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.14 }}
              onClick={() => onLoadSample(sample)}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-sky-50/70 dark:hover:bg-slate-800/70 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-sky-700 dark:group-hover:text-sky-400 truncate">
                {sample.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {sample.category}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Recent Jobs
          </h2>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {jobs.length}
          </span>
        </div>

        <div className="relative mb-3">
          <Search
            className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter jobs..."
            aria-label="Filter recent jobs"
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white/45 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 rounded-md text-slate-800 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:bg-white/75 dark:focus:bg-white/10 focus:border-sky-600 dark:focus:border-sky-500 transition-colors"
          />
        </div>

        {filteredJobs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            {jobs.length === 0 ? 'No transformations yet' : 'No matching jobs'}
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto pr-1">
            {filteredJobs.map((job) => {
              const selected = job.job_id === activeJobId;
              return (
                <motion.button
                  key={job.job_id}
                  type="button"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.14 }}
                  onClick={() => onSelectJob(job)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    selected
                      ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <FileText
                      className={`w-3.5 h-3.5 shrink-0 ${
                        selected
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium truncate">{job.source.filename}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <span>{job.outputs.length} outputs</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                      {formatShortTime(job.created_at)}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Workspace Appearance Switcher */}
      <div className="p-3.5 border-t border-slate-900/10 dark:border-white/10">
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-white/[0.06] hover:bg-white/75 dark:hover:bg-white/12 border border-white/65 dark:border-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
        >
          <span>{isDark ? 'Night Horizon' : 'Daylight Horizon'}</span>
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
};
