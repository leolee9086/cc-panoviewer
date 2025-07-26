import { storage } from './storage.js';

/**
 * 创建Pannellum查看器
 * @param {string} containerId - 容器ID
 * @param {Object} config - 查看器配置
 * @returns {Object} 查看器实例
 */
export function createViewer(containerId, config) {
    // 等待Pannellum库加载完成
    if (typeof pannellum === 'undefined') {
        console.warn('Pannellum库未加载，等待加载完成...');
        setTimeout(() => createViewer(containerId, config), 100);
        return null;
    }
    
    // 保存查看器配置
    storage.setViewer('config', config);
    
    const viewer = pannellum.viewer(containerId, config);
    
    // 将viewer实例保存到全局变量，以便其他组件访问
    window.pannellumViewer = viewer;
    
    // 保存查看器状态
    storage.setViewer('state', {
        containerId,
        createdAt: Date.now(),
        config: config
    });
    
    return viewer;
}

/**
 * 获取当前viewer实例
 * @returns {Object|null} 查看器实例
 */
export function getCurrentViewer() {
    return window.pannellumViewer || null;
}

/**
 * 添加热点标记
 * @param {Object} viewer - 查看器实例
 * @param {Object} hotspotConfig - 热点配置
 */
export function addHotSpot(viewer, hotspotConfig) {
    if (viewer && viewer.addHotSpot) {
        viewer.addHotSpot(hotspotConfig);
        
        // 保存热点数据
        const hotspots = storage.getViewer('hotspots', []);
        hotspots.push({
            ...hotspotConfig,
            addedAt: Date.now()
        });
        storage.setViewer('hotspots', hotspots);
    }
} 