export type OutputFormatId =
  | 'executive_summary'
  | 'linkedin_post'
  | 'x_thread'
  | 'advisory'
  | 'presentation'
  | 'infographic_plan'
  | 'video_package';

export interface OutputFormatDefinition {
  id: OutputFormatId;
  label: string;
  description: string;
  tier: 'MVP' | 'Recommended' | 'Extended';
}

export const OUTPUT_FORMAT_CATALOG: OutputFormatDefinition[] = [
  {
    id: 'executive_summary',
    label: 'Executive Summary',
    description: 'Title, overview, key findings, verified facts, conclusion',
    tier: 'MVP',
  },
  {
    id: 'linkedin_post',
    label: 'LinkedIn Post',
    description: 'Opening hook, structured commentary, takeaways, hashtags, CTA',
    tier: 'MVP',
  },
  {
    id: 'x_thread',
    label: 'X (Twitter) Post / Thread',
    description: 'Numbered posts, strictly <= 280 characters per post',
    tier: 'MVP',
  },
  {
    id: 'advisory',
    label: 'Structured Advisory',
    description: 'Severity, background, observations, impact, actions, caveats',
    tier: 'MVP',
  },
  {
    id: 'presentation',
    label: 'Presentation Content',
    description: 'Slide titles, concise bullets, visual cues, speaker notes',
    tier: 'MVP',
  },
  {
    id: 'infographic_plan',
    label: 'Infographic Content Plan',
    description: 'Information hierarchy, chart recommendations, layout blocks',
    tier: 'Recommended',
  },
  {
    id: 'video_package',
    label: 'Video Package',
    description: 'Script, scene storyboard, narration, subtitles, visual cues',
    tier: 'Extended',
  },
];

export interface TransformSettings {
  audience: string;
  tone: string;
  language: string;
  detail_level: 'concise' | 'medium' | 'comprehensive';
  objective: string;
  style: string;
}

export const DEFAULT_SETTINGS: TransformSettings = {
  audience: 'Executive leadership',
  tone: 'Professional',
  language: 'English',
  detail_level: 'medium',
  objective: 'Inform',
  style: 'Structured',
};

export const AUDIENCE_OPTIONS = [
  'General public',
  'Executive leadership',
  'Technical & security analysts',
  'Policy & regulatory stakeholders',
  'Enterprise customers',
  'Internal engineering teams',
];

export const TONE_OPTIONS = [
  'Professional',
  'Authoritative',
  'Analytical',
  'Urgent & actionable',
  'Accessible & educational',
  'Diplomatic',
];

export const LANGUAGE_OPTIONS = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Arabic',
  'Portuguese',
];

export const DETAIL_OPTIONS: { value: TransformSettings['detail_level']; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'medium', label: 'Medium' },
  { value: 'comprehensive', label: 'Comprehensive' },
];

export const OBJECTIVE_OPTIONS = [
  'Inform',
  'Warn / Advise action',
  'Brief decision-makers',
  'Educate & explain',
  'Drive engagement',
  'Document incident response',
];

export const STYLE_OPTIONS = [
  'Structured',
  'Narrative',
  'Bullet-led',
  'Data-centric',
  'Conversational',
];

export interface SourceRepresentation {
  summary: string;
  key_points: string[];
  facts: string[];
  entities: string[];
  dates: string[];
  context: string;
  caveats: string[];
}

export interface ValidationWarning {
  code: string;
  severity: 'info' | 'warning';
  message: string;
}

export interface XThreadPost {
  index: number;
  text: string;
  char_count: number;
}

export interface PresentationSlide {
  slide_number: number;
  title: string;
  bullets: string[];
  visual_suggestion: string;
  speaker_notes: string;
}

export interface InfographicSection {
  order: number;
  heading: string;
  data_point: string;
  visual_type: string;
  layout_note: string;
}

export interface VideoScene {
  scene_number: number;
  duration_sec: number;
  visual_direction: string;
  narration: string;
  subtitle_text: string;
}

export interface StructuredOutputPayload {
  x_posts?: XThreadPost[];
  slides?: PresentationSlide[];
  infographic_sections?: InfographicSection[];
  video_scenes?: VideoScene[];
}

export interface GeneratedOutput {
  output_id: string;
  type: OutputFormatId;
  title: string;
  content: string;
  structured_payload?: StructuredOutputPayload;
  validation_status: 'passed' | 'warnings';
  validation_warnings: ValidationWarning[];
  metrics: {
    word_count: number;
    char_count: number;
    item_count?: number;
  };
  version: number;
  updated_at: string;
}

export interface JobErrorItem {
  output_type?: OutputFormatId;
  stage: 'ingestion' | 'understanding' | 'generation' | 'validation' | 'export';
  message: string;
  retryable: boolean;
}

export interface TransformationJob {
  job_id: string;
  created_at: string;
  updated_at: string;
  status: 'completed' | 'partial' | 'failed';
  latency_ms: number;
  source: {
    filename: string;
    source_type: string;
    char_count: number;
    word_count: number;
    preview: string;
  };
  settings: TransformSettings;
  source_representation: SourceRepresentation;
  outputs: GeneratedOutput[];
  errors: JobErrorItem[];
}

export interface ExtractedSourceResponse {
  filename: string;
  source_type: string;
  size_bytes: number;
  extracted_text: string;
  word_count: number;
  char_count: number;
  extraction_method: string;
  warnings: string[];
}
