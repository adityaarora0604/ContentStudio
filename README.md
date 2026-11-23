# Gen AI Content Transformation Platform

Full-stack AI-powered content transformation dashboard built with React, TypeScript, Express, and the `@google/genai` SDK (`gemini-3.1-flash-lite`).

## Architecture (Modules M1–M8)

- **M1. UI & Job Setup** (`src/components/SourceSetupView.tsx`): Paste text or upload documents/media, select one or more output formats, and configure audience, tone, language, detail level, communication objective, and content style.
- **M2. Ingestion & Preprocessing** (`server/ingestion.ts`): Validates file types/sizes (max 10 MB), extracts text from TXT/MD/CSV/JSON, DOCX (`mammoth`), and PDF (`unpdf` with multimodal OCR fallback), and supports image OCR, audio transcription, and video analysis via Gemini multimodal. Cleans and isolates untrusted document text.
- **M3. Content Understanding** (`server/understanding.ts`): Extracts a shared `SourceRepresentation` JSON schema (`summary`, `key_points`, `facts`, `entities`, `dates`, `context`, `caveats`).
- **M4 & M5. LLM Orchestration & Format Generation** (`server/generator.ts`): Generates each selected output independently from the shared `SourceRepresentation` and operator settings:
  - Executive Summary
  - LinkedIn Post
  - X (Twitter) Post / Thread (with 280-character post schemas)
  - Structured Advisory
  - Presentation Content (slides, bullets, visual cues, speaker notes)
  - Infographic Content Plan
  - Video Package (script, scene storyboard, narration, subtitles)
- **M6. Validation & Coverage** (`server/validator.ts`): Checks structural sections, platform character limits, entity coverage, and caveat carry-over.
- **M7. Review, Edit, Regenerate & Export** (`src/components/ResultsView.tsx`, `server/exporter.ts`, `server/store.ts`): Inline editing with version increments, single-output regeneration with optional refinement instructions, persistent job history, clipboard copy, and `.md`, `.txt`, `.json`, and `.docx` exports.
- **M8. Security & Configuration** (`server/geminiClient.ts`, `server/store.ts`): Keeps `GEMINI_API_KEY` strictly server-side, validates uploads, confines storage paths, and logs privacy-safe audit events without secrets or raw source bodies.

## API Contract

- `GET /api/health` — Server readiness and configuration status.
- `POST /api/extract` — Multipart file upload extraction (`file` field, max 10 MB).
- `POST /api/transform` — Runs M2 → M3 → M4/M5 → M6 and persists job metadata.
- `POST /api/jobs/:jobId/regenerate` — Regenerates one selected `output_type` without regenerating others.
- `PATCH /api/jobs/:jobId/outputs/:outputId` — Saves edited output text, increments version, and re-validates.
- `GET /api/jobs`, `GET /api/jobs/:jobId`, `DELETE /api/jobs/:jobId` — Job history management.
- `POST /api/export/docx` — Builds a downloadable `.docx` deliverable or full dossier.

## Environment Variables

- `GEMINI_API_KEY` — Configured server-side in runtime secrets (see `.env.example`).

## Scripts

- `npm run dev` — Starts Express + Vite dev server on port 3000.
- `npm run build` — Builds the client bundle into `dist/`.
- `npm run start` — Serves the production build via `server.ts`.
- `npm run lint` — Runs TypeScript typechecking (`tsc --noEmit`).

## Known Limitations & Policy

- Automated publishing to external platforms is intentionally disabled; all outputs require human review.
- Use public, synthetic, or approved non-sensitive data only.
