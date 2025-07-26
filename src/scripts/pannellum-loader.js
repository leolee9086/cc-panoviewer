import { storage } from './storage.js';

/**
 * Pannellum库加载器
 * 由于Pannellum库已经在HTML中直接引用，此模块主要用于检查库是否已加载
 */

/**
 * 检查Pannellum库是否已加载
 * @returns {boolean} 库是否已加载
 */
export function isPannellumLoaded() {
    const isLoaded = typeof window.pannellum !== 'undefined';
    
    // 记录加载状态
    storage.setConfig('library.pannellum.loaded', isLoaded);
    
    return isLoaded;
}

/**
 * 等待Pannellum库加载完成
 * @returns {Promise<void>}
 */
export function waitForPannellum() {
    return new Promise((resolve) => {
        if (isPannellumLoaded()) {
            resolve();
        } else {
            // 检查库是否正在加载
            const checkInterval = setInterval(() => {
                if (isPannellumLoaded()) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // 设置超时，避免无限等待
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('Pannellum库加载超时');
                // 记录加载错误
                storage.setConfig('library.pannellum.error', 'timeout');
                resolve();
            }, 10000);
        }
    });
}

/**
 * 初始化Pannellum库
 * 由于库已在HTML中直接引用，此函数主要用于确保库已加载
 */
export async function initPannellum() {
    const startTime = Date.now();
    
    await waitForPannellum();
    
    // 记录加载性能
    const loadTime = Date.now() - startTime;
    storage.setConfig('library.pannellum.loadTime', loadTime);
    
    // 记录初始化状态
    storage.setConfig('library.pannellum.initialized', true);
    storage.setConfig('library.pannellum.initTime', Date.now());
} 