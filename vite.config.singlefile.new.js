import { defineConfig } from 'vite';
import { resolve } from 'path';
import { panoviewerSinglefile } from './src/plugins/vite-plugin-panoviewer-singlefile.js';

export default defineConfig(({ mode }) => {
  const isSingleMode = mode === 'single';
  
  return {
    root: 'src',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/index.html')
        },
        output: isSingleMode ? {
          inlineDynamicImports: true,
          assetFileNames: 'assets/[name].[ext]',
          entryFileNames: 'assets/[name].js',
          manualChunks: undefined
        } : {
          assetFileNames: 'assets/[name].[ext]',
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js'
        }
      }
    },
    plugins: isSingleMode ? [
      panoviewerSinglefile()
    ] : []
  };
}); 