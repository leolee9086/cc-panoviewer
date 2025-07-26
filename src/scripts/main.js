import { initPannellum } from './pannellum-loader.js';
import { setupEventListeners } from './event-handlers.js';
import { createViewer } from './viewer-manager.js';
import { handleFileUpload } from './file-handler.js';
import { storage, migrationTools } from './storage.js';
import { setCleanDocumentClone } from './download-utils.js';

/**
 * 生成缩略图（仅在内存中，不写入DB）
 * @param {string} src - 原始图片base64
 * @param {number} width - 缩略图宽度，默认200
 * @param {number} height - 缩略图高度，默认100
 * @returns {Promise<string>} - 缩略图base64
 */
function createThumbnail(src, width = 200, height = 100) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = src;
    });
}

/**
 * 应用主入口
 */
function initApp() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
        return;
    }
    
    // 页面初始化完成之后，DB初始化之前，存储一份干净的document克隆
    const cleanDocumentClone = document.cloneNode(true);
    setCleanDocumentClone(cleanDocumentClone);
    
    // 初始化存储系统
    initStorage();
    
    // 初始化Pannellum
    initPannellum();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 页面加载完成后的初始化
    window.onload = async () => {
        // 获取当前图片编号
        const currentImageId = storage.getCurrentImage();
        
        if (currentImageId) {
            // 从DB获取原图数据
            const imageData = storage.getImage(currentImageId);
            
            if (imageData) {
                // 在内存中生成缩略图（不写入DB）
                const thumbnailData = await createThumbnail(imageData);
                
                // 更新预览区显示缩略图
                document.getElementById('previewContainer').innerHTML = `
                    <img id="previewImage" src="${thumbnailData}" alt="Preview">
                    <button id="uploader">添加图片</button>
                `;
                
                // 创建查看器（使用原图）
                const viewer = createViewer('panorama', {
                    "type": "equirectangular",
                    "panorama": imageData,
                    "autoLoad": true,
                    "showControls": true,
                    "autoRotate": true
                });
                
                document.getElementById('uploadPrompt').style.display = 'none';
            }
        }
    };
}

/**
 * 初始化存储系统
 */
function initStorage() {
    // 执行数据迁移
    migrationTools.migrateAll();
    
    // 设置默认配置
    if (!storage.getConfig('export.resolution')) {
        storage.setConfig('export.resolution', '2K');
    }
    
    if (!storage.getConfig('ui.contextMenu')) {
        storage.setConfig('ui.contextMenu', {
            enabled: true,
            items: ['download', 'export', 'settings']
        });
    }
    
    console.log('存储系统初始化完成');
}

// 启动应用
initApp(); 