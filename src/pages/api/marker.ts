import type { APIRoute } from 'astro';
import { proxyNoAuth } from './_helpers';

export const GET: APIRoute = ({ request }) => {
  const file = new URL(request.url).searchParams.get('file');
  if (!file) {
    return new Response(JSON.stringify({ error: 'Missing file' }), { status: 400 });
  }
  return proxyNoAuth(`/markers/${file}`);
};

