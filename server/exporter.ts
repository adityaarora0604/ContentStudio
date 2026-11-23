import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
} from 'docx';
import { GeneratedOutput, TransformationJob } from '../src/types/transform';

function markdownLinesToParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(4).trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        })
      );
    } else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(3).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        })
      );
    } else if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(2).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 280, after: 120 },
        })
      );
    } else if (/^[-*]\s+/.test(line.trim())) {
      const cleanBullet = line.trim().replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      paragraphs.push(
        new Paragraph({
          text: cleanBullet,
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    } else if (line.trim() === '---') {
      paragraphs.push(
        new Paragraph({
          border: {
            bottom: { color: 'CBD5E1', space: 4, style: BorderStyle.SINGLE, size: 6 },
          },
          spacing: { before: 120, after: 120 },
        })
      );
    } else {
      const segments = line.split(/(\*\*.*?\*\*)/g);
      const runs = segments
        .filter(Boolean)
        .map((seg) =>
          seg.startsWith('**') && seg.endsWith('**')
            ? new TextRun({ text: seg.slice(2, -2), bold: true })
            : new TextRun({ text: seg })
        );
      paragraphs.push(
        new Paragraph({
          children: runs,
          spacing: { after: 100 },
        })
      );
    }
  }

  return paragraphs;
}

export async function buildSingleOutputDocx(
  output: GeneratedOutput,
  jobMeta?: Pick<TransformationJob, 'job_id' | 'source' | 'settings' | 'created_at'>
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: output.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Version v${output.version} · ${output.metrics.word_count} words · AI-generated content requiring human review`,
          color: '64748B',
          size: 20,
        }),
      ],
      spacing: { after: 200 },
    }),
  ];

  if (jobMeta) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Source: ${jobMeta.source.filename} · Audience: ${jobMeta.settings.audience} · Tone: ${jobMeta.settings.tone} · Language: ${jobMeta.settings.language}`,
            color: '475569',
            size: 20,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  children.push(...markdownLinesToParagraphs(output.content));

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export async function buildFullDossierDocx(job: TransformationJob): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: `Content Transformation Dossier`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Source: ${job.source.filename} (${job.source.source_type.toUpperCase()}) · Generated ${new Date(
            job.created_at
          ).toLocaleString()} · Job ID: ${job.job_id}`,
          color: '475569',
          size: 20,
        }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Settings: Audience=${job.settings.audience}, Tone=${job.settings.tone}, Language=${job.settings.language}, Detail=${job.settings.detail_level}, Objective=${job.settings.objective}, Style=${job.settings.style}`,
          color: '64748B',
          size: 19,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Notice: Outputs are AI-generated from the structured source representation and must be reviewed by a human before distribution.',
          italics: true,
          color: 'B45309',
          size: 20,
        }),
      ],
      spacing: { after: 280 },
    }),
    new Paragraph({
      text: 'Structured Source Representation',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 160, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: job.source_representation.summary })],
      spacing: { after: 140 },
    }),
  ];

  if (job.source_representation.key_points.length > 0) {
    children.push(
      new Paragraph({
        text: 'Key Points',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
      })
    );
    for (const kp of job.source_representation.key_points) {
      children.push(new Paragraph({ text: kp, bullet: { level: 0 } }));
    }
  }

  if (job.source_representation.facts.length > 0) {
    children.push(
      new Paragraph({
        text: 'Verified Facts',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
      })
    );
    for (const fact of job.source_representation.facts) {
      children.push(new Paragraph({ text: fact, bullet: { level: 0 } }));
    }
  }

  for (const output of job.outputs) {
    children.push(
      new Paragraph({
        text: `${output.title} (v${output.version})`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 120 },
      })
    );
    children.push(...markdownLinesToParagraphs(output.content));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
