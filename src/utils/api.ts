export async function parseApiResponse<T>(res: Response, fallbackError: string): Promise<T> {
  const rawText = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawText) as T & { error?: string };
      if (!res.ok) {
        throw new Error(parsed?.error || fallbackError);
      }
      return parsed;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`${fallbackError} (Invalid JSON response from server.)`);
      }
      throw err;
    }
  }

  if (!res.ok) {
    if (res.status === 504 || res.status === 502 || rawText.toLowerCase().includes('<!doctype')) {
      throw new Error(
        `Request timed out at the gateway (HTTP ${res.status}). Try selecting fewer outputs at once or shorter text, then retry.`
      );
    }
    throw new Error(`${fallbackError} (HTTP ${res.status})`);
  }

  throw new Error(`${fallbackError} (Unexpected non-JSON response.)`);
}
