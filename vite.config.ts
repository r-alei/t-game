import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'client',
  publicDir: resolve(import.meta.dirname, 'client/public'),
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'client/index.html'),
        dayi: resolve(import.meta.dirname, 'client/dayi.html'),
        panel: resolve(import.meta.dirname, 'client/panel.html'),
      },
    },
  },
});
