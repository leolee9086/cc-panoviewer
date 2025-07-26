import { storage } from './storage.js';
import { DocumentDB } from './document-db.js';

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
 * 清理UI元素，移除所有可能影响导出的UI状态
 * @param {Document} doc - 要清理的document对象
 */
function cleanupUIElements(doc) {
    // 移除右键菜单
    const contextMenu = doc.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.remove();
    }
    
    // 移除视频导出对话框
    const videoExportDialog = doc.getElementById('videoExportDialog');
    if (videoExportDialog) {
        videoExportDialog.remove();
    }
    
    // 移除导出进度显示
    const exportProgress = doc.getElementById('exportProgress');
    if (exportProgress) {
        exportProgress.remove();
    }
    
    // 移除上传提示组件
    const uploadPrompt = doc.querySelector('.upload-prompt');
    if (uploadPrompt) {
        uploadPrompt.remove();
    }
    
    // 清理Vue相关的data属性
    const vueElements = doc.querySelectorAll('[data-v-]');
    vueElements.forEach(el => {
        // 移除Vue的内部属性
        const attrs = el.getAttributeNames();
        attrs.forEach(attr => {
            if (attr.startsWith('data-v-')) {
                el.removeAttribute(attr);
            }
        });
    });
    
    // 移除可能的显示状态样式
    const styleElements = doc.querySelectorAll('style');
    styleElements.forEach(style => {
        if (style.textContent.includes('display: none') || 
            style.textContent.includes('visibility: hidden')) {
            style.remove();
        }
    });
}

/**
 * 下载当前页面为HTML文件（包含当前DB状态）
 * 将当前页面的完整HTML内容下载为本地文件，包含所有图片数据和配置
 */
export function downloadPage() {
    // 检查干净的document克隆是否存在
    if (!cleanDocumentClone) {
        throw new Error('干净的document克隆未初始化，无法进行页面导出');
    }
    
    // 使用干净的document克隆作为基础，避免包含UI状态
    const sourceDocument = cleanDocumentClone.cloneNode(true);
    
    // 清理UI元素
    cleanupUIElements(sourceDocument);
    
    // 将当前DB数据注入到干净的document中
    const currentDb = new DocumentDB(document, 'cc-panoviewer-db');
    const cleanDb = new DocumentDB(sourceDocument, 'cc-panoviewer-db');
    
    // 复制所有数据到干净的document
    const allKeys = currentDb.list();
    allKeys.forEach(key => {
        const value = currentDb.get(key);
        if (value !== null) {
            cleanDb.set(key, value);
        }
    });
    
    // 更新图片显示元素
    const currentImageId = storage.getCurrentImage();
    if (currentImageId) {
        const imageData = storage.getImage(currentImageId);
        if (imageData) {
            // 更新预览图
            const previewImage = sourceDocument.getElementById('previewImage');
            if (previewImage) {
                previewImage.src = imageData;
            }
            
            // 更新缩略图
            const image1 = sourceDocument.getElementById('image1');
            if (image1) {
                image1.src = imageData;
            }
            
            // 更新脚本中的图片数据
            const imagesScript = sourceDocument.querySelector('.images');
            if (imagesScript) {
                imagesScript.textContent = `window.imageData = "${imageData}";`;
            }
        }
    }
    
    const htmlContent = sourceDocument.documentElement.outerHTML;
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
        usedCleanClone: true
    });
    storage.setConfig('download.history', downloadHistory);
}

/**
 * 下载空页面为HTML文件（不包含任何数据）
 * 下载干净的页面模板，不包含图片数据或配置
 */
export function downloadEmptyPage() {
    // 检查干净的document克隆是否存在
    if (!cleanDocumentClone) {
        throw new Error('干净的document克隆未初始化，无法进行页面导出');
    }
    
    // 使用干净的document克隆，不包含任何数据
    const sourceDocument = cleanDocumentClone.cloneNode(true);
    
    // 清理UI元素
    cleanupUIElements(sourceDocument);
    
    // 清理所有数据
    const cleanDb = new DocumentDB(sourceDocument, 'cc-panoviewer-db');
    cleanDb.clear();
    
    // 清理图片显示
    const previewImage = sourceDocument.getElementById('previewImage');
    if (previewImage) {
        previewImage.remove();
    }
    
    const image1 = sourceDocument.getElementById('image1');
    if (image1) {
        image1.src = '';
    }
    
    const imagesScript = sourceDocument.querySelector('.images');
    if (imagesScript) {
        imagesScript.textContent = '// 图片数据将在这里';
    }
    
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
        usedCleanClone: true
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