import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { HistorySidebar } from './components/HistorySidebar';
import { HistoryView } from './components/HistoryView';
import { OverviewLandingView } from './components/OverviewLandingView';
import { ResultsView } from './components/ResultsView';
import { SourceSchemaView } from './components/SourceSchemaView';
import { SourceSetupView } from './components/SourceSetupView';
import { TopBar, WorkspaceTab } from './components/TopBar';
import { SAMPLE_BRIEFS, SampleBrief } from './data/samples';
import {
  DEFAULT_SETTINGS,
  OutputFormatId,
  TransformationJob,
  TransformSettings,
} from './types/transform';
import { parseApiResponse } from './utils/api';

const DEFAULT_FORMATS: OutputFormatId[] = [
  'executive_summary',
  'linkedin_post',
  'x_thread',
  'advisory',
  'presentation',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [sourceText, setSourceText] = useState('');
  const [sourceName, setSourceName] = useState('Pasted source text');
  const [sourceType, setSourceType] = useState('text');
  const [selectedFormats, setSelectedFormats] = useState<OutputFormatId[]>(DEFAULT_FORMATS);
  const [settings, setSettings] = useState<TransformSettings>(DEFAULT_SETTINGS);

  const [isGenerating, setIsGenerating] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<TransformationJob[]>([]);
  const [activeJob, setActiveJob] = useState<TransformationJob | null>(null);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cs_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('cs_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage failures
    }
  }, [isDark]);

  useEffect(() => {
    fetch('/api/jobs')
      .then((res) => (res.ok ? res.json() : { jobs: [] }))
      .then((data) => {
        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      })
      .catch(() => {
        // Initial history load failed silently; user can still generate jobs
      });
  }, []);

  function handleSourceChange(text: string, name?: string, type?: string) {
    setSourceText(text);
    if (name !== undefined) setSourceName(name);
    if (type !== undefined) setSourceType(type);
  }

  function handleToggleFormat(id: OutputFormatId) {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleLoadSample(sample: SampleBrief) {
    setSourceText(sample.content);
    setSourceName(sample.filename);
    setSourceType('txt');
    setTransformError(null);
    setActiveTab('source');
  }

  function handleEnterStudio(preselectFormat?: OutputFormatId) {
    if (preselectFormat && !selectedFormats.includes(preselectFormat)) {
      setSelectedFormats((prev) => [...prev, preselectFormat]);
    }
    setActiveTab('source');
  }

  function handleNewTransform() {
    if (activeTab !== 'overview') {
      setSourceText('');
      setSourceName('Pasted source text');
      setSourceType('text');
      setTransformError(null);
    }
    setActiveTab('source');
  }

  async function handleGenerate() {
    setTransformError(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_text: sourceText,
          source_name: sourceName,
          source_type: sourceType,
          output_types: selectedFormats,
          settings,
        }),
      });

      const job = await parseApiResponse<TransformationJob>(res, 'Content transformation failed.');
      setActiveJob(job);
      setJobs((prev) => [job, ...prev.filter((j) => j.job_id !== job.job_id)]);
      setActiveTab('results');
    } catch (err) {
      setTransformError(
        err instanceof Error ? err.message : 'Unable to complete transformation request.'
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleJobUpdated(updated: TransformationJob) {
    setActiveJob(updated);
    setJobs((prev) => prev.map((j) => (j.job_id === updated.job_id ? updated : j)));
  }

  async function handleDeleteJob(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (!res.ok) return;
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
      if (activeJob?.job_id === jobId) {
        setActiveJob(null);
      }
    } catch {
      // Ignore transient delete error
    }
  }

  function handleOpenJob(job: TransformationJob) {
    setActiveJob(job);
    setActiveTab('results');
  }

  const isOverview = activeTab === 'overview';

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#e6eff8] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
        <TopBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          hasActiveJob={Boolean(activeJob)}
          outputCount={activeJob?.outputs.length ?? 0}
          historyCount={jobs.length}
          onNewTransform={handleNewTransform}
        />

        {isOverview ? (
          <OverviewLandingView
            onEnterStudio={handleEnterStudio}
            onLoadSampleAndEnter={handleLoadSample}
            onNavigateTab={setActiveTab}
            hasActiveJob={Boolean(activeJob)}
          />
        ) : (
          <>
            {/* Mobile Sample Quick-Loader + Theme Toggle */}
            <div className="lg:hidden relative z-20 bg-white/60 dark:bg-[#11151d]/65 backdrop-blur-xl border-b border-white/50 dark:border-white/10 px-4 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0">
                  Samples:
                </span>
                {SAMPLE_BRIEFS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-white/10 hover:bg-white/85 dark:hover:bg-white/15 border border-white/60 dark:border-white/10 rounded-md whitespace-nowrap shrink-0"
                  >
                    {sample.category}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsDark((prev) => !prev)}
                aria-label="Toggle workspace theme"
                className="p-1.5 rounded-md bg-white/50 dark:bg-white/10 border border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-300 shrink-0"
              >
                {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex-1 flex min-h-0 relative studio-horizon-bg">
              {/* Soft Atmospheric Prism Studio Layer */}
              <div
                aria-hidden="true"
                className="fixed inset-0 top-14 pointer-events-none overflow-hidden z-0"
              >
                <img
                  src="/src/assets/images/hero_prism_studio_1795375568291.jpg"
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center opacity-25 dark:opacity-30 blur-[6px] scale-105 saturate-125 select-none"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-sky-100/65 via-slate-100/50 to-indigo-100/60 dark:from-slate-950/70 dark:via-[#0b101d]/65 dark:to-indigo-950/70" />
              </div>

              <HistorySidebar
                jobs={jobs}
                activeJobId={activeJob?.job_id}
                onSelectJob={handleOpenJob}
                onLoadSample={handleLoadSample}
                isDark={isDark}
                onToggleTheme={() => setIsDark((prev) => !prev)}
              />

              <main className="relative z-10 flex-1 min-w-0 pb-12">
                {activeTab === 'source' && (
                  <SourceSetupView
                    sourceText={sourceText}
                    sourceName={sourceName}
                    sourceType={sourceType}
                    onSourceChange={handleSourceChange}
                    selectedFormats={selectedFormats}
                    onToggleFormat={handleToggleFormat}
                    onSetFormats={setSelectedFormats}
                    settings={settings}
                    onSettingsChange={setSettings}
                    onGenerate={() => void handleGenerate()}
                    isGenerating={isGenerating}
                    errorMessage={transformError}
                    onClearError={() => setTransformError(null)}
                  />
                )}

                {activeTab === 'schema' && (
                  <SourceSchemaView
                    job={activeJob}
                    onGoToSource={() => setActiveTab('source')}
                  />
                )}

                {activeTab === 'results' && (
                  <ResultsView
                    job={activeJob}
                    sourceText={sourceText}
                    onJobUpdated={handleJobUpdated}
                    onGoToSource={() => setActiveTab('source')}
                  />
                )}

                {activeTab === 'history' && (
                  <HistoryView
                    jobs={jobs}
                    activeJobId={activeJob?.job_id}
                    onOpenJob={handleOpenJob}
                    onDeleteJob={(id) => void handleDeleteJob(id)}
                    onGoToSource={() => setActiveTab('source')}
                  />
                )}
              </main>
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
