import { initPannellum } from './pannellum-loader.js';
import { setupEventListeners } from './event-handlers.js';
import { createViewer } from './viewer-manager.js';
import { handleFileUpload } from './file-handler.js';

/**
 * 应用主入口
 */
function initApp() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
        return;
    }
    
    // 初始化Pannellum
    initPannellum();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 页面加载完成后的初始化
    window.onload = () => {
        if (window.imageData) {
            const viewer = createViewer('panorama', {
                "type": "equirectangular",
                "panorama": window.imageData,
                "autoLoad": true,
                "showControls": true,
                "autoRotate": true
            });
            
            document.getElementById('uploadPrompt').style.display = 'none';
        }
    };
}

// 启动应用
initApp(); 