import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'src/sidepanel/index': resolve(__dirname, 'src/sidepanel/index.html'),
        'src/background/background': resolve(__dirname, 'src/background/background.ts'),
        'src/content/content': resolve(__dirname, 'src/content/content.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});

