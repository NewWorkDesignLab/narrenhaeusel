import type { APIRoute } from 'astro';
import { proxy } from './_helpers';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  return proxy('/upload-marker', {
    method: 'POST',
    body: formData as unknown as BodyInit,
  });
};
