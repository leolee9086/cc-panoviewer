#!/usr/bin/env node

/**
 * 全景图浏览器构建脚本
 * 将拆分的文件合并成单文件HTML，保持单文件下载特性
 */

const fs = require('fs');
const path = require('path');

/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @returns {string} 文件内容
 */
function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

/**
 * 将CSS内容嵌入到HTML中
 * @param {string} htmlContent - HTML内容
 * @param {string} cssContent - CSS内容
 * @returns {string} 嵌入CSS后的HTML
 */
function embedCSS(htmlContent, cssContent) {
    return htmlContent.replace(
        /<link id="pannellumCss"[^>]*>/,
        `<style id="pannellumCss">${cssContent}</style>`
    );
}

/**
 * 将JS内容嵌入到HTML中
 * @param {string} htmlContent - HTML内容
 * @param {string} jsContent - JS内容
 * @returns {string} 嵌入JS后的HTML
 */
function embedJS(htmlContent, jsContent) {
    return htmlContent.replace(
        /<script id="pannellumJS"[^>]*><\/script>/,
        `<script id="pannellumJS">${jsContent}</script>`
    );
}

/**
 * 移除动态加载代码
 * @param {string} htmlContent - HTML内容
 * @returns {string} 移除动态加载后的HTML
 */
function removeDynamicLoading(htmlContent) {
    // 移除动态加载的fetch代码
    return htmlContent.replace(
        /<script>\s*\/\/ 动态加载 Pannellum CSS[\s\S]*?<\/script>/,
        ''
    );
}

/**
 * 构建单文件HTML
 */
function buildSingleFile() {
    console.log('开始构建单文件HTML...');
    
    // 读取模板HTML
    const templatePath = path.join(__dirname, 'src', 'template.html');
    let htmlContent = readFile(templatePath);
    
    // 读取CSS文件
    const cssPath = path.join(__dirname, 'src', 'styles', 'main.css');
    const cssContent = readFile(cssPath);
    
    // 读取JS文件
    const jsPath = path.join(__dirname, 'src', 'scripts', 'main.js');
    const jsContent = readFile(jsPath);
    
    // 嵌入CSS
    htmlContent = embedCSS(htmlContent, cssContent);
    
    // 嵌入JS
    htmlContent = embedJS(htmlContent, jsContent);
    
    // 移除动态加载代码
    htmlContent = removeDynamicLoading(htmlContent);
    
    // 写入构建后的文件
    const outputPath = path.join(__dirname, 'dist', 'index.html');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, htmlContent);
    
    console.log('构建完成！输出文件:', outputPath);
}

// 如果直接运行此脚本
if (require.main === module) {
    buildSingleFile();
}

module.exports = {
    buildSingleFile,
    embedCSS,
    embedJS,
    removeDynamicLoading
}; 