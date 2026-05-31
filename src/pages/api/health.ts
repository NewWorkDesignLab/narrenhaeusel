import type { APIRoute } from 'astro';
import { proxyNoAuth } from './_helpers';

export const GET: APIRoute = () => proxyNoAuth('/health');

