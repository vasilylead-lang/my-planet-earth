import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    // данные стран (1:50m, ~1.4 МБ) выносятся в отдельный async-чанк
    chunkSizeWarningLimit: 1600,
  },
});
