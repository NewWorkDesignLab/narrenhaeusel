import type { APIRoute } from 'astro';
import { proxy } from './_helpers';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  return proxy('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
};

