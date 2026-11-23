import React from 'react';
import {
  ArrowRight,
  Braces,
  Clock,
  FileText,
  Layers,
  LayoutGrid,
  Megaphone,
  Presentation,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SAMPLE_BRIEFS, SampleBrief } from '../data/samples';
import { OutputFormatId } from '../types/transform';
import { WorkspaceTab } from './TopBar';

interface OverviewLandingViewProps {
  onEnterStudio: (preselectFormat?: OutputFormatId) => void;
  onLoadSampleAndEnter: (sample: SampleBrief) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
  hasActiveJob: boolean;
}

const HERO_STICKERS: {
  id: OutputFormatId;
  label: string;
  rotate: string;
  positionClass: string;
  bgClass: string;
  iconBg: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'executive_summary',
    label: 'Executive Summary',
    rotate: '-rotate-3',
    positionClass: 'hidden md:flex -top-7 right-2 lg:right-8',
    bgClass: 'bg-sky-100/95 text-slate-900 border-sky-200',
    iconBg: 'bg-sky-600 text-white',
    Icon: FileText,
  },
  {
    id: 'x_thread',
    label: 'X Thread',
    rotate: 'rotate-3',
    positionClass: 'hidden md:flex top-1/2 -translate-y-1/2 -right-4 lg:-right-12',
    bgClass: 'bg-fuchsia-100/95 text-slate-900 border-fuchsia-200',
    iconBg: 'bg-fuchsia-600 text-white',
    Icon: Megaphone,
  },
  {
    id: 'advisory',
    label: 'Structured Advisory',
    rotate: '-rotate-2',
    positionClass: 'hidden md:flex top-[46%] -left-4 lg:-left-14',
    bgClass: 'bg-indigo-100/95 text-slate-900 border-indigo-200',
    iconBg: 'bg-indigo-600 text-white',
    Icon: ShieldAlert,
  },
  {
    id: 'presentation',
    label: 'Slide Deck',
    rotate: 'rotate-2',
    positionClass: 'hidden md:flex -bottom-6 left-10 lg:left-16',
    bgClass: 'bg-lime-100/95 text-slate-900 border-lime-300',
    iconBg: 'bg-lime-600 text-white',
    Icon: Presentation,
  },
];

export const OverviewLandingView: React.FC<OverviewLandingViewProps> = ({
  onEnterStudio,
  onLoadSampleAndEnter,
  onNavigateTab,
  hasActiveJob,
}) => {
  const featuredSample = SAMPLE_BRIEFS[0];

  const dockItems: {
    id: WorkspaceTab;
    label: string;
    hint: string;
    iconBg: string;
    Icon: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
  }[] = [
    {
      id: 'source',
      label: 'Source Studio',
      hint: 'Input & settings',
      iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white',
      Icon: FileText,
    },
    {
      id: 'schema',
      label: 'Source Schema',
      hint: 'Extracted facts',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white',
      Icon: Braces,
      disabled: !hasActiveJob,
    },
    {
      id: 'results',
      label: 'Deliverables',
      hint: 'Generated formats',
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
      Icon: LayoutGrid,
      disabled: !hasActiveJob,
    },
    {
      id: 'history',
      label: 'Job History',
      hint: 'Saved sessions',
      iconBg: 'bg-gradient-to-br from-slate-700 to-slate-900 text-white',
      Icon: Clock,
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-gradient-to-b from-slate-900 via-sky-950 to-slate-950 text-white flex flex-col justify-between">
      {/* Full-Bleed Atmospheric Backdrop */}
      <img
        src="/src/assets/images/hero_prism_studio_1795375568291.jpg"
        alt="Modern architectural intelligence studio with a crystal prism refracting a single beam of light across editorial manuscripts into spectrum rays"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
      />
      {/* Measured Contrast Scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/20 to-slate-950/70"
      />

      {/* Playful Editorial Vector Accents */}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 80 60"
        initial={{ opacity: 0, rotate: -10 }}
        animate={{ opacity: 0.9, rotate: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:block absolute top-28 right-[14%] w-16 h-12 text-yellow-300 pointer-events-none"
        fill="none"
      >
        <path
          d="M8 40 C 18 10, 38 10, 34 32 C 30 48, 16 42, 26 24 C 36 8, 58 14, 52 34 C 48 48, 62 44, 72 24"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </motion.svg>

      <motion.svg
        aria-hidden="true"
        viewBox="0 0 70 70"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.85, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="hidden lg:block absolute bottom-40 left-[8%] w-16 h-16 text-lime-300 pointer-events-none"
        fill="none"
      >
        <path
          d="M14 26 L56 26 A 21 21 0 0 1 14 26 Z M14 48 L56 48 A 21 21 0 0 1 14 48 Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </motion.svg>

      {/* Top Overlay Row: Frosted Briefing Identity Card */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-6 pt-6 flex items-start justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xs backdrop-blur-xl bg-white/15 border border-white/25 rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-white" aria-hidden="true" />
            </span>
            <div>
              <div className="font-display text-xs font-bold tracking-wide text-white">
                Content Transformation Engine
              </div>
              <div className="text-[11px] text-white/80">
                Grounded Multi-Format Pipeline
              </div>
            </div>
          </div>
          <p className="text-xs text-white/90 leading-relaxed">
            Turn dense reports, advisories, PDFs, images, audio, and video into tailored, validated deliverables from one structured source.
          </p>
          <div className="mt-2.5 pt-2 border-t border-white/15 text-[11px] text-white/75 font-mono">
            TXT · PDF · DOCX · OCR · Audio/Video
          </div>
        </motion.div>
      </div>

      {/* Center Hero Statement + Interactive Format Stickers */}
      <div className="relative z-10 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col items-center text-center">
        <div className="relative inline-block">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-extrabold tracking-tight text-white uppercase leading-[0.94] drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] text-4xl sm:text-6xl lg:text-[4.5rem] max-w-4xl"
          >
            One Source
            <br />
            Refracted Into
            <br />
            Every Format
          </motion.h1>

          {/* Interactive Tilted Format Stickers */}
          {HERO_STICKERS.map((sticker, idx) => {
            const Icon = sticker.Icon;
            return (
              <motion.button
                key={sticker.id}
                type="button"
                initial={{ opacity: 0, scale: 0.88, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={{
                  duration: 0.25,
                  delay: 0.12 + idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => onEnterStudio(sticker.id)}
                className={`absolute ${sticker.positionClass} ${sticker.rotate} items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-xl border shadow-lg cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${sticker.bgClass}`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${sticker.iconBg}`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span className="font-display text-xs font-bold tracking-tight">
                  {sticker.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Hero Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onEnterStudio()}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-xl shadow-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Sparkles className="w-4 h-4 text-sky-600" aria-hidden="true" />
            Open Transformation Studio
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onLoadSampleAndEnter(featuredSample)}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Try Sample Advisory
          </motion.button>
        </motion.div>
      </div>

      {/* Bottom Row: Elongated Frosted Glass Dock + Elongated Sample Brief Card */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-6 pb-6 flex flex-col md:flex-row items-stretch gap-4">
        {/* Elongated Frosted OS Dock */}
        <nav
          aria-label="Quick studio launcher"
          className="flex-1 min-w-0 backdrop-blur-xl bg-white/18 border border-white/30 rounded-2xl p-2 grid grid-cols-2 sm:grid-cols-4 gap-2 shadow-2xl"
        >
          {dockItems.map((item) => {
            const Icon = item.Icon;
            return (
              <motion.button
                key={item.id}
                type="button"
                disabled={item.disabled}
                whileHover={!item.disabled ? { y: -3, scale: 1.02 } : undefined}
                whileTap={!item.disabled ? { scale: 0.97 } : undefined}
                transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                onClick={() => onNavigateTab(item.id)}
                title={item.disabled ? `${item.label} (Run a transform first)` : item.label}
                className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  item.disabled
                    ? 'opacity-45 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-white/15'
                }`}
              >
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ${item.iconBg}`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-white whitespace-nowrap truncate">
                    {item.label}
                  </span>
                  <span className="block text-[11px] text-white/70 whitespace-nowrap truncate">
                    {item.hint}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </nav>

        {/* Elongated Stacked Sample Card */}
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => onLoadSampleAndEnter(featuredSample)}
          className="relative w-full md:w-[340px] lg:w-[390px] shrink-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-2xl flex"
        >
          <div
            aria-hidden="true"
            className="hidden sm:block absolute -top-2 inset-x-4 h-4 rounded-t-xl backdrop-blur-md bg-white/15 border border-white/20 transition-transform group-hover:-translate-y-0.5"
          />
          <div className="relative w-full flex items-center gap-3.5 backdrop-blur-xl bg-slate-950/45 hover:bg-slate-950/55 border border-white/25 rounded-2xl p-2.5 pr-4 shadow-xl transition-colors">
            <img
              src="/src/assets/images/card_sample_intel_1795375064911.jpg"
              alt="Sample intelligence brief workspace"
              referrerPolicy="no-referrer"
              className="w-20 h-14 rounded-xl object-cover shrink-0 border border-white/20"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono text-sky-200 uppercase tracking-wider truncate">
                Sample Brief · {featuredSample.category}
              </div>
              <div className="text-xs font-semibold text-white truncate mt-0.5">
                {featuredSample.title}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/85 group-hover:text-white">
                Load sample in Studio
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
};
