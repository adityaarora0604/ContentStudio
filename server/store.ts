import fs from 'fs';
import path from 'path';
import { TransformationJob } from '../src/types/transform';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JOBS_FILE = path.resolve(DATA_DIR, 'jobs.json');
const AUDIT_FILE = path.resolve(DATA_DIR, 'audit.json');
const MAX_STORED_JOBS = 100;
const MAX_AUDIT_EVENTS = 250;

export interface AuditEvent {
  timestamp: string;
  action: 'transform' | 'regenerate' | 'edit_output' | 'extract_file' | 'export_docx' | 'delete_job';
  job_id?: string;
  status: 'success' | 'partial' | 'error';
  latency_ms?: number;
  detail?: string;
}

function assertInsideDataDir(targetPath: string): void {
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Unsafe storage path blocked.');
  }
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonSafe<T>(filePath: string, fallback: T): T {
  assertInsideDataDir(filePath);
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  assertInsideDataDir(filePath);
  ensureDataDir();
  const tmpPath = path.resolve(DATA_DIR, `${path.basename(filePath)}.tmp`);
  assertInsideDataDir(tmpPath);
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export function listJobs(): TransformationJob[] {
  const jobs = readJsonSafe<TransformationJob[]>(JOBS_FILE, []);
  return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getJobById(jobId: string): TransformationJob | null {
  const jobs = readJsonSafe<TransformationJob[]>(JOBS_FILE, []);
  return jobs.find((j) => j.job_id === jobId) ?? null;
}

export function saveJob(job: TransformationJob): TransformationJob {
  const jobs = readJsonSafe<TransformationJob[]>(JOBS_FILE, []);
  const filtered = jobs.filter((j) => j.job_id !== job.job_id);
  const updated = [job, ...filtered].slice(0, MAX_STORED_JOBS);
  writeJsonAtomic(JOBS_FILE, updated);
  return job;
}

export function deleteJobById(jobId: string): boolean {
  const jobs = readJsonSafe<TransformationJob[]>(JOBS_FILE, []);
  const filtered = jobs.filter((j) => j.job_id !== jobId);
  if (filtered.length === jobs.length) return false;
  writeJsonAtomic(JOBS_FILE, filtered);
  return true;
}

export function recordAuditEvent(event: Omit<AuditEvent, 'timestamp'>): void {
  const events = readJsonSafe<AuditEvent[]>(AUDIT_FILE, []);
  const next: AuditEvent = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  writeJsonAtomic(AUDIT_FILE, [next, ...events].slice(0, MAX_AUDIT_EVENTS));
}
