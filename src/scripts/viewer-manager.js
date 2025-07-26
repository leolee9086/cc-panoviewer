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
    
    const viewer = pannellum.viewer(containerId, config);
    
    return viewer;
}

/**
 * 添加热点标记
 * @param {Object} viewer - 查看器实例
 * @param {Object} hotspotConfig - 热点配置
 */
export function addHotSpot(viewer, hotspotConfig) {
    if (viewer && viewer.addHotSpot) {
        viewer.addHotSpot(hotspotConfig);
    }
} 