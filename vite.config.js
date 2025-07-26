import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { writeFileSync, unlinkSync, existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';

function removeAllExceptIndexHtml(distDir) {
  const files = readdirSync(distDir);
  for (const file of files) {
    const filePath = join(distDir, file);
    if (file !== 'index.html') {
      if (statSync(filePath).isDirectory()) {
        // 递归删除子目录
        removeAllExceptIndexHtml(filePath);
        try { fs.rmdirSync(filePath); } catch (e) {}
      } else {
        unlinkSync(filePath);
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const isSingleMode = mode === 'single';
  return {
    root: 'src',
    build: {
      outDir: './dist',
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
        },
        external: isSingleMode ? [] : ['vditor']
      }
    },
    plugins: isSingleMode ? [
      vue({
        include: [/\.vue$/] // 只包含 .vue 文件
      }),
      {
        name: 'inline-assets',
        writeBundle(options, bundle) {
          const htmlAsset = Object.values(bundle).find(asset => asset.fileName === 'index.html');
          if (htmlAsset && htmlAsset.type === 'asset') {
            let html = htmlAsset.source;
            const $ = cheerio.load(html);

            // 内联所有CSS文件
            Object.values(bundle).forEach(asset => {
              if (asset.type === 'asset' && asset.fileName.endsWith('.css')) {
                const cssContent = asset.source;
                const cssFileName = asset.fileName.split('/').pop();
                $(`link[href*="${cssFileName}"]`).each((_, el) => {
                  $(el).replaceWith(`<style>${cssContent}</style>`);
                });
              }
            });

            // 内联所有JS文件
            const mainJsChunk = Object.values(bundle).find(asset => asset.type === 'chunk' && asset.isEntry && asset.fileName.endsWith('.js'));
            if (mainJsChunk) {
              const jsContent = mainJsChunk.code;
              // Remove the original script tag for main.js if it exists
              $('script[src*="main.js"]').remove();
              // Append the inlined script to the body
              $('body').append(`<script type="module">${jsContent}</script>`);
            }

            // 内联本地Pannellum库文件
            try {
              const pannellumCssPath = join(__dirname, 'pannellum.css');
              if (existsSync(pannellumCssPath)) {
                const pannellumCss = readFileSync(pannellumCssPath, 'utf-8');
                $(`link[href*="pannellum.css"]`).each((_, el) => {
                  $(el).replaceWith(`<style>${pannellumCss}</style>`);
                });
              }
              const pannellumJsPath = join(__dirname, 'pannellum.js');
              if (existsSync(pannellumJsPath)) {
                const pannellumJs = readFileSync(pannellumJsPath, 'utf-8');
                $(`script[src*="pannellum.js"]`).each((_, el) => {
                  $(el).replaceWith(`<script>${pannellumJs}</script>`);
                });
              }
            } catch (error) {
              console.warn('内联Pannellum库时出错:', error);
            }

            // 内联Vditor相关资源
            try {
              // 查找并内联Vditor的CSS文件
              Object.values(bundle).forEach(asset => {
                if (asset.type === 'asset' && asset.fileName.includes('vditor') && asset.fileName.endsWith('.css')) {
                  const cssContent = asset.source;
                  const cssFileName = asset.fileName.split('/').pop();
                  $(`link[href*="${cssFileName}"]`).each((_, el) => {
                    $(el).replaceWith(`<style>${cssContent}</style>`);
                  });
                }
              });
              
              // 手动内联Vditor的CSS文件
              const vditorCssPath = join(__dirname, 'node_modules/vditor/dist/index.css');
              if (existsSync(vditorCssPath)) {
                const vditorCss = readFileSync(vditorCssPath, 'utf-8');
                // 在head中添加Vditor的CSS
                $('head').append(`<style>${vditorCss}</style>`);
              }
            } catch (error) {
              console.warn('内联Vditor资源时出错:', error);
            }

            // 移除所有未被内联的外链JS/CSS
            $('script[src],link[rel="stylesheet"]').remove();

            // 更新HTML内容
            html = $.html();

            // 写入修改后的HTML文件
            const outputPath = join(__dirname, 'dist', 'index.html');
            writeFileSync(outputPath, html);

            // 删除dist下所有非index.html文件
            removeAllExceptIndexHtml(join(__dirname, 'dist'));
          }
        }
      }
    ] : []
  };
}); 