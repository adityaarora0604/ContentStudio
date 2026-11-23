import { GoogleGenAI } from '@google/genai';

export const PRIMARY_MODEL = 'gemini-3.1-flash-lite';

let cachedClient: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'MISSING_API_KEY',
      'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      false,
      503
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export class GeminiServiceError extends Error {
  code: string;
  retryable: boolean;
  statusCode: number;

  constructor(code: string, message: string, retryable = true, statusCode = 502) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

export function normalizeGeminiError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;

  const rawMsg = err instanceof Error ? err.message : String(err);
  const sanitized = rawMsg.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]').slice(0, 260);
  console.warn('[geminiClient] Upstream error:', sanitized);
  const lower = rawMsg.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return new GeminiServiceError(
      'UPSTREAM_TIMEOUT',
      'The AI model request timed out. Please retry or reduce source length.',
      true,
      504
    );
  }

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('401')) {
    return new GeminiServiceError(
      'API_KEY_INVALID',
      `Gemini API authentication failed (${sanitized}). Please verify GEMINI_API_KEY in Settings > Secrets.`,
      false,
      403
    );
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return new GeminiServiceError(
      'RATE_LIMITED',
      `Gemini API rate limit or quota reached (${sanitized}). Wait briefly and retry.`,
      true,
      429
    );
  }

  if (lower.includes('not_found') || lower.includes('404')) {
    return new GeminiServiceError(
      'MODEL_NOT_FOUND',
      `Requested Gemini model endpoint was not found (${sanitized}).`,
      false,
      404
    );
  }

  return new GeminiServiceError(
    'MODEL_CALL_FAILED',
    `AI generation failed: ${sanitized}`,
    true,
    502
  );
}

export async function callWithRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; timeoutMs?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 1;
  const timeoutMs = options.timeoutMs ?? 20000;
  const baseDelayMs = options.baseDelayMs ?? 800;

  let lastError: GeminiServiceError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            reject(
              new GeminiServiceError(
                'UPSTREAM_TIMEOUT',
                `AI model call exceeded ${Math.round(timeoutMs / 1000)}s timeout.`,
                true,
                504
              )
            );
          }, timeoutMs)
        ),
      ]);
      return result;
    } catch (err) {
      const normalized = normalizeGeminiError(err);
      lastError = normalized;

      if (!normalized.retryable || attempt === maxRetries) {
        throw normalized;
      }

      const backoff = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError ?? new GeminiServiceError('UNKNOWN', 'AI request failed.', true, 502);
}
