import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://newworkdesignlab.github.io',
  base: '/narrenhaeusel',
  server: {
    host: true
  },
  vite: {
    server: {
      proxy: {
        '/proxy': {
          target: 'https://00224466.xyz',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy/, '')
        }
      }
    }
  }
});