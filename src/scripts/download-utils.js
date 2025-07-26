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
 * 下载当前页面为HTML文件（包含当前DB状态）
 * 将当前页面的完整HTML内容下载为本地文件，包含所有图片数据和配置
 */
export function downloadPage() {
    // 使用干净的document克隆作为基础，避免包含用户操作状态（如打开的菜单）
    if (!cleanDocumentClone) {
        throw new Error('干净的document克隆未初始化，无法进行页面导出');
    }
    const tempDocument = cleanDocumentClone.cloneNode(true);
    
    // 在临时document中创建新的DocumentDB实例
    const tempDb = new DocumentDB(tempDocument, 'cc-panoviewer-db');
    
    // 从当前DB获取所有数据并注入到临时document
    const currentDb = new DocumentDB(document, 'cc-panoviewer-db');
    const allKeys = currentDb.list();
    
    // 注入所有数据到临时document
    for (const key of allKeys) {
        const value = currentDb.get(key);
        if (value !== null) {
            tempDb.set(key, value);
        }
    }
    
    // 更新临时document中的DOM元素以反映当前状态
    updateTempDocumentElements(tempDocument, currentDb);
    
    // 获取包含数据的HTML内容
    const htmlContent = tempDocument.documentElement.outerHTML;
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
        usedCleanClone: !!cleanDocumentClone
    });
    storage.setConfig('download.history', downloadHistory);
}

/**
 * 更新临时document中的DOM元素以反映当前状态
 * @param {Document} tempDocument - 临时document
 * @param {DocumentDB} currentDb - 当前DB实例
 */
function updateTempDocumentElements(tempDocument, currentDb) {
    // 获取当前图片ID
    const currentImageId = currentDb.get('currentImage');
    if (!currentImageId) return;
    
    // 获取当前图片数据
    const currentImageData = currentDb.get(`image.${currentImageId}`);
    if (!currentImageData) return;
    
    // 更新script标签中的图片数据
    const scriptElement = tempDocument.querySelector('.images');
    if (scriptElement) {
        scriptElement.textContent = `window.imageData = "${currentImageData}";`;
    }
    
    // 更新img标签的src
    const imageElement = tempDocument.querySelector('#image1');
    if (imageElement) {
        imageElement.src = currentImageData;
    }
    
    // 更新previewContainer中的缩略图
    const previewContainer = tempDocument.querySelector('#previewContainer');
    if (previewContainer) {
        // 获取图片列表
        const imageList = currentDb.get('imageList', []);
        
        // 生成缩略图HTML（简化版本，实际缩略图会在页面加载时生成）
        const thumbnailsHTML = imageList.map(imgId => {
            const metadata = currentDb.get(`image.${imgId}.metadata`, {});
            return `<img src="" alt="${metadata.name || '图片'}" 
                       style="width: 200px; height: 120px; margin: 2px; cursor: pointer; border: 2px solid ${imgId === currentImageId ? '#007bff' : 'transparent'}; border-radius: 4px;"
                       data-image-id="${imgId}">`;
        }).join('');
        
        previewContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; max-height: 400px; overflow-y: auto;">
                ${thumbnailsHTML}
            </div>
            <button id="uploader">添加图片</button>
        `;
    }
}

/**
 * 下载空页面为HTML文件（不包含任何数据）
 * 下载干净的页面模板，不包含图片数据或配置
 */
export function downloadEmptyPage() {
    // 直接使用干净的document克隆，不包含任何数据
    if (!cleanDocumentClone) {
        throw new Error('干净的document克隆未初始化，无法进行页面导出');
    }
    
    // 创建干净的document克隆，并移除所有数据
    const tempDocument = cleanDocumentClone.cloneNode(true);
    
    
    // 获取清理后的HTML内容
    const htmlContent = tempDocument.documentElement.outerHTML;
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