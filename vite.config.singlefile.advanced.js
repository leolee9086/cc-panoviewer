import { defineConfig } from 'vite';
import { resolve } from 'path';
import { createPanoviewerSinglefilePlugin } from './src/plugins/vite-plugin-panoviewer-singlefile.js';

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
      createPanoviewerSinglefilePlugin({
        // 自定义Pannellum库路径
        pannellumCssPath: 'pannellum.css',
        pannellumJsPath: 'pannellum.js',
        
        // 输出目录
        outputDir: 'dist',
        
        // 是否删除内联后的文件
        deleteInlinedFiles: true,
        
        // 自定义全局函数生成器
        globalFunctions: () => `
          // 暴露全局下载函数
          window.downloadPage = function() {
            const htmlContent = document.documentElement.outerHTML;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'panoviewer_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          };
          
          // 暴露版本信息
          window.panoviewerVersion = '1.0.0';
          window.panoviewerBuildTime = '${new Date().toISOString()}';
        `
      })
    ] : []
  };
}); 