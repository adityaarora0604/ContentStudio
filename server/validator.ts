import {
  OutputFormatId,
  SourceRepresentation,
  StructuredOutputPayload,
  TransformSettings,
  ValidationWarning,
} from '../src/types/transform';
import { countWords } from './ingestion';

export interface ValidationOutcome {
  validation_status: 'passed' | 'warnings';
  validation_warnings: ValidationWarning[];
  metrics: {
    word_count: number;
    char_count: number;
    item_count?: number;
  };
}

function checkHeadingPresence(content: string, keywords: string[]): boolean {
  const lower = content.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function validateGeneratedOutput(
  type: OutputFormatId,
  content: string,
  sourceRep: SourceRepresentation,
  settings: TransformSettings,
  structuredPayload?: StructuredOutputPayload
): ValidationOutcome {
  const warnings: ValidationWarning[] = [];
  const trimmed = content.trim();
  const wordCount = countWords(trimmed);
  const charCount = trimmed.length;
  let itemCount: number | undefined;

  if (!trimmed || wordCount < 15) {
    warnings.push({
      code: 'MIN_LENGTH',
      severity: 'warning',
      message: 'Output is unusually short (< 15 words) and may lack required substance.',
    });
  }

  switch (type) {
    case 'executive_summary': {
      if (!checkHeadingPresence(trimmed, ['overview', 'summary', 'executive'])) {
        warnings.push({
          code: 'MISSING_OVERVIEW',
          severity: 'info',
          message: 'Executive summary should include a clear Overview section.',
        });
      }
      if (!checkHeadingPresence(trimmed, ['finding', 'key', 'fact', 'highlight'])) {
        warnings.push({
          code: 'MISSING_FINDINGS',
          severity: 'warning',
          message: 'Missing explicit Findings / Verified Facts section.',
        });
      }
      if (!checkHeadingPresence(trimmed, ['conclusion', 'next step', 'recommendation', 'takeaway'])) {
        warnings.push({
          code: 'MISSING_CONCLUSION',
          severity: 'info',
          message: 'Consider adding a closing Conclusion or Next Steps section.',
        });
      }
      break;
    }

    case 'linkedin_post': {
      if (charCount > 3000) {
        warnings.push({
          code: 'LINKEDIN_CHAR_LIMIT',
          severity: 'warning',
          message: `LinkedIn post is ${charCount} characters (platform limit is 3,000 characters).`,
        });
      }
      if (!/#\w+/.test(trimmed)) {
        warnings.push({
          code: 'MISSING_HASHTAGS',
          severity: 'info',
          message: 'No hashtags detected. Adding 3-5 relevant hashtags improves reach.',
        });
      }
      break;
    }

    case 'x_thread': {
      const posts = structuredPayload?.x_posts;
      if (posts && posts.length > 0) {
        itemCount = posts.length;
        const overLimit = posts.filter((p) => p.text.length > 280);
        if (overLimit.length > 0) {
          warnings.push({
            code: 'X_CHAR_LIMIT_EXCEEDED',
            severity: 'warning',
            message: `${overLimit.length} post(s) exceed the 280-character X limit (${overLimit
              .map((p) => `#${p.index}: ${p.text.length} chars`)
              .join(', ')}).`,
          });
        }
      } else {
        const blocks = trimmed
          .split(/\n{2,}/)
          .map((b) => b.trim())
          .filter(Boolean);
        itemCount = blocks.length;
        const longBlocks = blocks.filter((b) => b.length > 280);
        if (longBlocks.length > 0) {
          warnings.push({
            code: 'X_CHAR_LIMIT_EXCEEDED',
            severity: 'warning',
            message: `${longBlocks.length} thread segment(s) exceed 280 characters.`,
          });
        }
      }
      break;
    }

    case 'advisory': {
      if (!checkHeadingPresence(trimmed, ['background', 'context', 'summary'])) {
        warnings.push({
          code: 'ADVISORY_MISSING_BACKGROUND',
          severity: 'warning',
          message: 'Structured advisory is missing a Background / Context section.',
        });
      }
      if (!checkHeadingPresence(trimmed, ['impact', 'risk', 'observation'])) {
        warnings.push({
          code: 'ADVISORY_MISSING_IMPACT',
          severity: 'warning',
          message: 'Structured advisory should clearly describe Observations and Impact.',
        });
      }
      if (!checkHeadingPresence(trimmed, ['action', 'mitigation', 'recommendation', 'remediation'])) {
        warnings.push({
          code: 'ADVISORY_MISSING_ACTIONS',
          severity: 'warning',
          message: 'Structured advisory is missing Recommended Actions.',
        });
      }
      break;
    }

    case 'presentation': {
      const slides = structuredPayload?.slides;
      if (slides && slides.length > 0) {
        itemCount = slides.length;
        const missingNotes = slides.filter((s) => !s.speaker_notes?.trim());
        if (missingNotes.length > 0) {
          warnings.push({
            code: 'MISSING_SPEAKER_NOTES',
            severity: 'info',
            message: `${missingNotes.length} slide(s) do not include speaker notes.`,
          });
        }
      } else if (!checkHeadingPresence(trimmed, ['speaker notes', 'notes:'])) {
        warnings.push({
          code: 'MISSING_SPEAKER_NOTES',
          severity: 'info',
          message: 'Presentation content does not clearly label speaker notes.',
        });
      }
      break;
    }

    case 'infographic_plan': {
      const sections = structuredPayload?.infographic_sections;
      if (sections) itemCount = sections.length;
      if (!checkHeadingPresence(trimmed, ['chart', 'visual', 'layout', 'diagram', 'icon', 'hierarchy'])) {
        warnings.push({
          code: 'MISSING_LAYOUT_CUES',
          severity: 'warning',
          message: 'Infographic plan lacks explicit visual/chart or layout recommendations.',
        });
      }
      break;
    }

    case 'video_package': {
      const scenes = structuredPayload?.video_scenes;
      if (scenes) itemCount = scenes.length;
      if (!checkHeadingPresence(trimmed, ['scene', 'narration', 'subtitle', 'visual'])) {
        warnings.push({
          code: 'MISSING_STORYBOARD_FIELDS',
          severity: 'warning',
          message: 'Video package should include explicit scenes, narration, visuals, and subtitles.',
        });
      }
      break;
    }
  }

  // Grounding & entity coverage check (M6: source-fact coverage)
  if (settings.language.toLowerCase() === 'english' && sourceRep.entities.length >= 2) {
    const lowerContent = trimmed.toLowerCase();
    const matchedEntities = sourceRep.entities.filter((entity) => {
      const token = entity.toLowerCase().split('(')[0].trim();
      return token.length >= 3 && lowerContent.includes(token);
    });
    if (matchedEntities.length === 0) {
      warnings.push({
        code: 'LOW_ENTITY_COVERAGE',
        severity: 'warning',
        message:
          'None of the primary source entities appear in this deliverable. Verify that key context was not omitted.',
      });
    }
  }

  // Caveat carry-over check for advisories and executive summaries
  if (
    (type === 'advisory' || type === 'executive_summary') &&
    sourceRep.caveats.length > 0 &&
    !checkHeadingPresence(trimmed, ['caveat', 'limitation', 'note', 'disclaimer', 'scope', 'assumption'])
  ) {
    warnings.push({
      code: 'CAVEATS_OMITTED',
      severity: 'info',
      message: 'Source document contained caveats/limitations that may not be explicitly noted here.',
    });
  }

  return {
    validation_status: warnings.length > 0 ? 'warnings' : 'passed',
    validation_warnings: warnings,
    metrics: {
      word_count: wordCount,
      char_count: charCount,
      item_count: itemCount,
    },
  };
}
