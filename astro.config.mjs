import { defineConfig } from 'astro/config';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  site: 'https://newworkdesignlab.github.io',
  base: '/narrenhaeusel',
  server: {
    host: true
  },
  vite: {
    plugins: [basicSsl()]
  }
});