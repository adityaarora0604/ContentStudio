import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

export type WorkspaceTab = 'overview' | 'source' | 'schema' | 'results' | 'history';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  hasActiveJob: boolean;
  outputCount: number;
  historyCount: number;
  onNewTransform: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  hasActiveJob,
  outputCount,
  historyCount,
  onNewTransform,
}) => {
  const isOverview = activeTab === 'overview';

  const navItems: { id: WorkspaceTab; label: string; disabled?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'source', label: 'Transform' },
    { id: 'schema', label: 'Schema', disabled: !hasActiveJob },
    {
      id: 'results',
      label: outputCount > 0 ? `Deliverables (${outputCount})` : 'Deliverables',
      disabled: !hasActiveJob,
    },
    { id: 'history', label: historyCount > 0 ? `History (${historyCount})` : 'History' },
  ];

  return (
    <header
      className={`sticky top-0 z-30 h-14 px-6 flex items-center justify-between gap-8 border-b transition-colors duration-200 ${
        isOverview
          ? 'bg-sky-950/35 backdrop-blur-md border-white/15 text-white'
          : 'bg-white/60 dark:bg-[#0e131e]/65 backdrop-blur-xl border-white/55 dark:border-white/10 text-slate-900 dark:text-slate-100'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectTab('overview')}
        className={`font-display text-base font-bold tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded ${
          isOverview ? 'text-white' : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        Content Studio
      </button>

      <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Workspace sections">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => onSelectTab(item.id)}
              className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded ${
                isOverview
                  ? isActive
                    ? 'text-white'
                    : item.disabled
                      ? 'text-white/30 cursor-not-allowed'
                      : 'text-white/75 hover:text-white'
                  : isActive
                    ? 'text-sky-700 dark:text-sky-400'
                    : item.disabled
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {item.label}
              {isActive && (
                <motion.span
                  layoutId="topbar-active-underline"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-0.5 ${
                    isOverview ? 'bg-white' : 'bg-sky-600 dark:bg-sky-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center shrink-0">
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.14 }}
          onClick={onNewTransform}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            isOverview
              ? 'bg-white text-slate-950 hover:bg-slate-100'
              : 'text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500'
          }`}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          {isOverview ? 'Launch Studio' : 'New Transform'}
        </motion.button>
      </div>
    </header>
  );
};
