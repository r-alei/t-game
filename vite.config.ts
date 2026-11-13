import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'client',
  publicDir: resolve(__dirname, 'client/public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'client/index.html'),
        panel: resolve(__dirname, 'client/panel.html'),
      },
    },
  },
});
