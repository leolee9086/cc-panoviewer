import { storage } from './storage.js';

/**
 * 下载工具函数
 * 提供页面下载相关的功能
 */

// 存储干净的document克隆，用于导出时作为蓝本
let cleanDocumentClone = null;

/**
 * 设置干净的document克隆
 * 在页面初始化完成之后、DB初始化之前调用
 * @param {Document} documentClone - 干净的document克隆
 */
export function setCleanDocumentClone(documentClone) {
    cleanDocumentClone = documentClone;
}

/**
 * 获取干净的document克隆
 * @returns {Document|null} 干净的document克隆
 */
export function getCleanDocumentClone() {
    return cleanDocumentClone;
}

/**
 * 下载当前页面为HTML文件（包含当前DB状态）
 * 将当前页面的完整HTML内容下载为本地文件，包含所有图片数据和配置
 */
export function downloadPage() {
    // 使用当前document，包含所有DB状态
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'panoviewer_with_data.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 记录下载历史
    const downloadHistory = storage.getConfig('download.history', []);
    downloadHistory.push({
        fileName: 'panoviewer_with_data.html',
        fileSize: blob.size,
        downloadTime: Date.now(),
        type: 'page_with_data',
        usedCleanClone: false
    });
    storage.setConfig('download.history', downloadHistory);
}

/**
 * 下载空页面为HTML文件（不包含任何数据）
 * 下载干净的页面模板，不包含图片数据或配置
 */
export function downloadEmptyPage() {
    // 使用干净的document克隆，不包含任何数据
    const sourceDocument = cleanDocumentClone || document;
    const htmlContent = sourceDocument.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'panoviewer_empty.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 记录下载历史
    const downloadHistory = storage.getConfig('download.history', []);
    downloadHistory.push({
        fileName: 'panoviewer_empty.html',
        fileSize: blob.size,
        downloadTime: Date.now(),
        type: 'empty_page',
        usedCleanClone: !!cleanDocumentClone
    });
    storage.setConfig('download.history', downloadHistory);
}

/**
 * 将downloadPage函数暴露到全局作用域
 * 供构建工具在单文件模式下使用
 */
export function exposeDownloadPageToGlobal() {
    if (typeof window !== 'undefined') {
        window.downloadPage = downloadPage;
        window.downloadEmptyPage = downloadEmptyPage;
    }
} 