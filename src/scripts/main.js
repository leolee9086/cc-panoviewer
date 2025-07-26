import { initPannellum } from './pannellum-loader.js';
import { setupEventListeners } from './event-handlers.js';
import { createViewer } from './viewer-manager.js';
import { handleFileUpload } from './file-handler.js';
import { storage, migrationTools } from './storage.js';

/**
 * 应用主入口
 */
function initApp() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
        return;
    }
    
    // 初始化存储系统
    initStorage();
    
    // 初始化Pannellum
    initPannellum();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 页面加载完成后的初始化
    window.onload = () => {
        // 优先从存储中获取图片数据
        let imageData = storage.getImage('current');
        
        // 如果没有存储数据，尝试从全局变量获取
        if (!imageData && window.imageData) {
            imageData = window.imageData;
            // 迁移到存储中
            storage.setImage('current', imageData);
        }
        
        if (imageData) {
            const viewer = createViewer('panorama', {
                "type": "equirectangular",
                "panorama": imageData,
                "autoLoad": true,
                "showControls": true,
                "autoRotate": true
            });
            
            document.getElementById('uploadPrompt').style.display = 'none';
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