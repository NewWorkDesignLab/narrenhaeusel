import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel({ imageService: false }),
  site: 'https://narrenhaeusel.newworkdesignlab.org',
  server: { host: true },
});