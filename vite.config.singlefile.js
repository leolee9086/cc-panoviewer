import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html')
      },
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'assets/[name].[ext]',
        entryFileNames: 'assets/[name].js',
        manualChunks: undefined
      }
    }
  },
  plugins: [viteSingleFile()]
}); 