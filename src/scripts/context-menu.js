import { downloadPage } from './download-utils.js';

/**
 * 为Pannellum查看器添加自定义右键菜单项
 * @param {Object} viewer - Pannellum查看器实例
 */
export function addCustomContextMenuItem(viewer) {
    viewer.on('contextmenu', function (e) {
        const customItem = document.createElement('li');
        customItem.textContent = '下载当前页面';
        customItem.onclick = downloadPage;
        
        const contextMenu = document.querySelector('.pnlm-context-menu');
        if (contextMenu) {
            contextMenu.appendChild(customItem);
        }
        
        e.stopPropagation();
    });
} 