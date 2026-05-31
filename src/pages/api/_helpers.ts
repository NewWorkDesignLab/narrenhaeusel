import { getApiUrl } from '../../lib/endpoint-config';

export function getKey(): string | null {
  return (
    (import.meta.env.NH_API_KEY as string | undefined) ||
    (typeof process !== 'undefined' ? process.env.NH_API_KEY : undefined) ||
    null
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildResponse(r: globalThis.Response): Response {
  const contentType = r.headers.get('Content-Type') ?? 'application/octet-stream';
  return new Response(r.body, {
    status: r.status,
    headers: { 'Content-Type': contentType },
  });
}

export async function proxy(
  upstreamPath: string,
  init: RequestInit = {}
): Promise<Response> {
  const key = getKey();
  if (!key) return json({ error: 'API key not configured' }, 500);

  const extraHeaders = (init.headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = {
    ...extraHeaders,
    'X-API-Key': key,
  };

  const r = await fetch(getApiUrl() + upstreamPath, { ...init, headers });
  return buildResponse(r);
}

export async function proxyNoAuth(
  upstreamPath: string,
  init: RequestInit = {}
): Promise<Response> {
  const r = await fetch(getApiUrl() + upstreamPath, init);
  return buildResponse(r);
}
