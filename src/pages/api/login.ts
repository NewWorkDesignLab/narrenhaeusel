import type { APIRoute } from 'astro';
import { proxyNoAuth } from './_helpers';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== 'string') {
    return new Response(JSON.stringify({ detail: 'Missing password' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return proxyNoAuth('/cms-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: body.password }),
  });
};

