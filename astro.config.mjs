import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://newworkdesignlab.github.io',
  base: '/narrenhaeusel',
  server: {
    host: true,
    port: 4321
  }
});