/**
 * vite-plugin-panoviewer-singlefile
 * 
 * MIT License
 * 
 * Copyright (c) 2025 全景查看器项目
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * ============================================================================
 * 
 * 致谢与借鉴说明
 * 
 * 本插件在开发过程中借鉴了以下开源项目的优秀设计理念和实现方案：
 * 
 * 1. vite-plugin-singlefile (MIT License)
 *    - 作者: Richard Tallent
 *    - 仓库: https://github.com/richardtallent/vite-plugin-singlefile
 *    - 借鉴内容:
 *      * 整体插件架构设计
 *      * generateBundle 钩子的使用方式
 *      * 资源内联的核心算法
 *      * 正则表达式替换策略
 *      * 构建配置优化方案
 * 
 * 2. Vite (MIT License)
 *    - 作者: Evan You
 *    - 仓库: https://github.com/vitejs/vite
 *    - 借鉴内容:
 *      * 插件系统设计
 *      * Rollup 集成方案
 *      * 构建配置结构
 * 
 * 3. Pannellum (MIT License)
 *    - 作者: Matthew Petroff
 *    - 仓库: https://github.com/mpetroff/pannellum
 *    - 借鉴内容:
 *      * 全景查看器核心功能
 *      * 库文件集成方案
 * 
 * 本插件在借鉴上述项目优秀设计的基础上，针对全景查看器项目的特定需求进行了定制化开发，
 * 增加了 Pannellum 库内联、全局函数暴露等专门功能，形成了更适合当前项目的解决方案。
 * 
 * 感谢所有开源项目的贡献者，正是你们的无私奉献推动了整个开源生态的发展。
 * 
 * ============================================================================
 * 
 * Vite插件：全景查看器单文件打包
 * 将全景查看器应用打包成完全自包含的单个HTML文件
 * 
 * 功能特性：
 * - 内联所有CSS和JS资源
 * - 内联本地Pannellum库文件
 * - 暴露全局下载函数
 * - 生成完全自包含的HTML文件
 */

import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 创建全景查看器单文件打包插件
 * @param {Object} options 插件配置选项
 * @param {string} options.pannellumCssPath Pannellum CSS文件路径
 * @param {string} options.pannellumJsPath Pannellum JS文件路径
 * @param {string} options.outputDir 输出目录
 * @param {boolean} options.deleteInlinedFiles 是否删除内联后的文件
 * @param {Function} options.globalFunctions 全局函数生成器
 * @returns {Object} Vite插件对象
 */
export function createPanoviewerSinglefilePlugin(options = {}) {
  const {
    pannellumCssPath = 'pannellum.css',
    pannellumJsPath = 'pannellum.js',
    outputDir = 'dist',
    deleteInlinedFiles = true,
    globalFunctions = createDefaultGlobalFunctions
  } = options;

  return {
    name: 'vite:panoviewer-singlefile',
    enforce: 'post',
    
    /**
     * 配置构建选项
     */
    config(config) {
      if (!config.build) config.build = {};
      
      // 确保所有资源都被内联
      config.build.assetsInlineLimit = () => true;
      // 避免大文件警告
      config.build.chunkSizeWarningLimit = 100000000;
      // CSS不分割，生成单个文件
      config.build.cssCodeSplit = false;
      // 资源目录设为根目录
      config.build.assetsDir = '';
      
      if (!config.build.rollupOptions) config.build.rollupOptions = {};
      if (!config.build.rollupOptions.output) config.build.rollupOptions.output = {};
      
      const updateOutputOptions = (out) => {
        // 启用动态导入内联
        out.inlineDynamicImports = true;
      };
      
      if (Array.isArray(config.build.rollupOptions.output)) {
        for (const o of config.build.rollupOptions.output) {
          updateOutputOptions(o);
        }
      } else {
        updateOutputOptions(config.build.rollupOptions.output);
      }
    },

    /**
     * 生成包时的处理逻辑
     */
    generateBundle(_, bundle) {
      console.log('\n🔧 开始生成全景查看器单文件...');
      
      const files = {
        html: [],
        css: [],
        js: [],
        other: []
      };

      // 分类文件
      for (const [filename, asset] of Object.entries(bundle)) {
        if (filename.endsWith('.html')) {
          files.html.push(filename);
        } else if (filename.endsWith('.css')) {
          files.css.push(filename);
        } else if (filename.endsWith('.js')) {
          files.js.push(filename);
        } else {
          files.other.push(filename);
        }
      }

      const bundlesToDelete = [];

      // 处理每个HTML文件
      for (const htmlFileName of files.html) {
        const htmlAsset = bundle[htmlFileName];
        if (htmlAsset.type !== 'asset') continue;

        let html = htmlAsset.source;

        // 内联CSS文件
        for (const cssFileName of files.css) {
          const cssAsset = bundle[cssFileName];
          if (cssAsset.type !== 'asset') continue;

          console.log(`📦 内联CSS: ${cssFileName}`);
          html = replaceCss(html, cssFileName, cssAsset.source);
          bundlesToDelete.push(cssFileName);
        }

        // 内联JS文件
        for (const jsFileName of files.js) {
          const jsAsset = bundle[jsFileName];
          if (jsAsset.type !== 'chunk' || !jsAsset.code) continue;

          console.log(`📦 内联JS: ${jsFileName}`);
          html = replaceScript(html, jsFileName, jsAsset.code);
          bundlesToDelete.push(jsFileName);
        }

        // 内联Pannellum库文件
        html = inlinePannellumLibraries(html, pannellumCssPath, pannellumJsPath);

        // 添加全局函数
        html = addGlobalFunctions(html, globalFunctions);

        // 更新HTML内容
        htmlAsset.source = html;

        // 写入最终文件
        const outputPath = join(process.cwd(), outputDir, htmlFileName);
        writeFileSync(outputPath, html);
        console.log(`✅ 单文件已生成: ${outputPath}`);

        // 删除其他文件
        if (deleteInlinedFiles) {
          for (const fileName of bundlesToDelete) {
            delete bundle[fileName];
          }
          
          // 删除其他资源文件
          for (const fileName of files.other) {
            delete bundle[fileName];
            console.log(`🗑️ 删除文件: ${fileName}`);
          }
        }
      }

      console.log('🎉 全景查看器单文件打包完成！\n');
    }
  };
}

/**
 * 替换CSS链接为内联样式
 * @param {string} html HTML内容
 * @param {string} cssFileName CSS文件名
 * @param {string} cssContent CSS内容
 * @returns {string} 替换后的HTML
 */
function replaceCss(html, cssFileName, cssContent) {
  const fileName = cssFileName.split('/').pop();
  const linkRegex = new RegExp(`<link[^>]*href="[^"]*${fileName.replace(/\./g, '\\.')}"[^>]*>`, 'g');
  const cleanCss = cssContent.replace(/@charset "UTF-8";/, '');
  return html.replace(linkRegex, `<style>${cleanCss.trim()}</style>`);
}

/**
 * 替换JS脚本为内联代码
 * @param {string} html HTML内容
 * @param {string} jsFileName JS文件名
 * @param {string} jsContent JS内容
 * @returns {string} 替换后的HTML
 */
function replaceScript(html, jsFileName, jsContent) {
  const fileName = jsFileName.split('/').pop();
  const scriptRegex = new RegExp(`<script[^>]*src="[^"]*${fileName.replace(/\./g, '\\.')}"[^>]*></script>`, 'g');
  const cleanJs = jsContent.replace(/<(\/script>|!--)/g, '\\x3C$1');
  return html.replace(scriptRegex, `<script>${cleanJs.trim()}</script>`);
}

/**
 * 内联Pannellum库文件
 * @param {string} html HTML内容
 * @param {string} cssPath CSS文件路径
 * @param {string} jsPath JS文件路径
 * @returns {string} 内联后的HTML
 */
function inlinePannellumLibraries(html, cssPath, jsPath) {
  try {
    // 内联Pannellum CSS
    if (existsSync(cssPath)) {
      const pannellumCss = readFileSync(cssPath, 'utf-8');
      html = html.replace(
        /<link[^>]*href="[^"]*pannellum\.css"[^>]*>/g,
        `<style>${pannellumCss}</style>`
      );
      console.log('📦 内联Pannellum CSS');
    }

    // 内联Pannellum JS
    if (existsSync(jsPath)) {
      const pannellumJs = readFileSync(jsPath, 'utf-8');
      html = html.replace(
        /<script[^>]*src="[^"]*pannellum\.js"[^>]*><\/script>/g,
        `<script>${pannellumJs}</script>`
      );
      console.log('📦 内联Pannellum JS');
    }
  } catch (error) {
    console.warn('⚠️ 内联Pannellum库时出错:', error.message);
  }

  return html;
}

/**
 * 添加全局函数到HTML
 * @param {string} html HTML内容
 * @param {Function} globalFunctionsGenerator 全局函数生成器
 * @returns {string} 添加全局函数后的HTML
 */
function addGlobalFunctions(html, globalFunctionsGenerator) {
  const globalFunctions = globalFunctionsGenerator();
  
  // 在第一个script标签后添加全局函数
  html = html.replace(
    /(<script[^>]*>)/,
    `$1\n${globalFunctions}`
  );

  console.log('🔧 添加全局函数');
  return html;
}

/**
 * 创建默认的全局函数
 * @returns {string} 全局函数代码
 */
function createDefaultGlobalFunctions() {
  return `
    // 暴露全局下载函数
    window.downloadPage = function() {
      const htmlContent = document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'panoviewer.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  `;
}

/**
 * 创建全景查看器单文件打包插件（简化版）
 * @returns {Object} Vite插件对象
 */
export function panoviewerSinglefile() {
  return createPanoviewerSinglefilePlugin();
} 