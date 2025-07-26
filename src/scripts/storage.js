/**
 * @织: 统一存储模块 - 基于 DocumentDB 的便捷存储接口
 * 提供图片、配置、历史记录等分类存储方法
 * 支持事务包装和智能缓存管理
 */
import { DocumentDB } from './document-db.js';

let db = null;
function ensureDbReady() {
    if (!db) {
        db = new DocumentDB(document, '#cc-panoviewer-db');
    }
    return db;
}

/**
 * 统一存储接口
 */
export const storage = {
    /**
     * 设置图片数据
     * @param {string} key - 图片键名
     * @param {string} data - 图片数据（base64格式）
     */
    setImage: (key, data) => ensureDbReady().set(`image.${key}`, data, { type: 'base64' }),
    
    /**
     * 获取图片数据
     * @param {string} key - 图片键名
     * @param {string} defaultValue - 默认值
     * @returns {string} 图片数据
     */
    getImage: (key, defaultValue = null) => ensureDbReady().get(`image.${key}`, defaultValue),
    
    /**
     * 设置配置项
     * @param {string} key - 配置键名
     * @param {any} value - 配置值
     */
    setConfig: (key, value) => ensureDbReady().set(`config.${key}`, value),
    
    /**
     * 获取配置项
     * @param {string} key - 配置键名
     * @param {any} defaultValue - 默认值
     * @returns {any} 配置值
     */
    getConfig: (key, defaultValue = null) => ensureDbReady().get(`config.${key}`, defaultValue),
    
    /**
     * 设置文件相关数据
     * @param {string} key - 文件键名
     * @param {any} data - 文件数据
     */
    setFile: (key, data) => ensureDbReady().set(`files.${key}`, data),
    
    /**
     * 获取文件相关数据
     * @param {string} key - 文件键名
     * @param {any} defaultValue - 默认值
     * @returns {any} 文件数据
     */
    getFile: (key, defaultValue = null) => ensureDbReady().get(`files.${key}`, defaultValue),
    
    /**
     * 设置查看器相关数据
     * @param {string} key - 查看器键名
     * @param {any} data - 查看器数据
     */
    setViewer: (key, data) => ensureDbReady().set(`viewer.${key}`, data),
    
    /**
     * 获取查看器相关数据
     * @param {string} key - 查看器键名
     * @param {any} defaultValue - 默认值
     * @returns {any} 查看器数据
     */
    getViewer: (key, defaultValue = null) => ensureDbReady().get(`viewer.${key}`, defaultValue),
    
    /**
     * 添加操作历史记录
     * @param {string} action - 操作类型
     * @param {any} data - 操作数据
     */
    addHistory: (action, data) => {
        const history = ensureDbReady().get('history.operations', []);
        history.push({ 
            action, 
            data, 
            timestamp: Date.now() 
        });
        // 限制历史记录数量，避免内存占用过大
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
        ensureDbReady().set('history.operations', history);
    },
    
    /**
     * 获取操作历史记录
     * @param {number} limit - 限制数量
     * @returns {Array} 历史记录数组
     */
    getHistory: (limit = 50) => {
        const history = ensureDbReady().get('history.operations', []);
        return history.slice(-limit);
    },
    
    /**
     * 事务包装器
     * @param {Function} callback - 事务回调函数
     * @returns {Promise<any>} 事务结果
     */
    withTransaction: async (callback) => {
        const txId = ensureDbReady().beginTransaction();
        try {
            const result = await callback();
            ensureDbReady().commitTransaction(txId);
            return result;
        } catch (error) {
            ensureDbReady().rollbackTransaction(txId);
            throw error;
        }
    },
    
    /**
     * 检查数据是否存在
     * @param {string} key - 数据键名
     * @returns {boolean} 是否存在
     */
    has: (key) => ensureDbReady().has(key),
    
    /**
     * 删除数据
     * @param {string} key - 数据键名
     */
    delete: (key) => ensureDbReady().delete(key),
    
    /**
     * 列出所有数据键
     * @param {string} prefix - 键名前缀过滤
     * @returns {Array<string>} 键名数组
     */
    list: (prefix = '') => {
        const allKeys = ensureDbReady().list();
        if (!prefix) return allKeys;
        return allKeys.filter(key => key.startsWith(prefix));
    },
    
    /**
     * 清空所有数据
     */
    clear: () => ensureDbReady().clear(),
    
    /**
     * 导出数据库
     * @returns {string} HTML格式的数据库内容
     */
    export: () => ensureDbReady().export(),
    
    /**
     * 导入数据库
     * @param {string} htmlData - HTML格式的数据库内容
     */
    import: (htmlData) => ensureDbReady().import(htmlData)
};

/**
 * 智能缓存管理器
 */
export const cacheManager = {
    /**
     * 设置缓存
     * @param {string} key - 缓存键名
     * @param {any} value - 缓存值
     * @param {number} ttl - 过期时间（毫秒），默认1小时
     */
    set: (key, value, ttl = 3600000) => {
        const item = {
            value,
            timestamp: Date.now(),
            ttl
        };
        storage.setConfig(`cache.${key}`, item);
    },
    
    /**
     * 获取缓存
     * @param {string} key - 缓存键名
     * @returns {any} 缓存值，过期返回null
     */
    get: (key) => {
        const item = storage.getConfig(`cache.${key}`);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > item.ttl) {
            storage.delete(`cache.${key}`);
            return null;
        }
        
        return item.value;
    },
    
    /**
     * 删除缓存
     * @param {string} key - 缓存键名
     */
    delete: (key) => storage.delete(`cache.${key}`),
    
    /**
     * 清理过期缓存
     */
    cleanup: () => {
        const cacheKeys = storage.list('config.cache.');
        cacheKeys.forEach(key => {
            const item = storage.getConfig(key);
            if (item && Date.now() - item.timestamp > item.ttl) {
                storage.delete(key);
            }
        });
    }
};

/**
 * 数据迁移工具
 */
export const migrationTools = {
    /**
     * 从全局变量迁移数据
     */
    migrateGlobalData: () => {
        if (window.imageData && !storage.getImage('current')) {
            storage.setImage('current', window.imageData);
            console.log('已迁移全局图片数据到 DocumentDB');
        }
    },
    
    /**
     * 从DOM存储迁移数据
     */
    migrateDOMData: () => {
        const scriptElement = document.querySelector('.images');
        if (scriptElement && scriptElement.textContent.includes('window.imageData')) {
            try {
                const match = scriptElement.textContent.match(/window\.imageData = "([^"]+)"/);
                if (match) {
                    const imageData = match[1];
                    storage.setImage('current', imageData);
                    console.log('已迁移DOM图片数据到 DocumentDB');
                }
            } catch (e) {
                console.warn('DOM数据迁移失败:', e);
            }
        }
    },
    
    /**
     * 执行所有迁移
     */
    migrateAll: () => {
        migrationTools.migrateGlobalData();
        migrationTools.migrateDOMData();
    }
};

/**
 * 性能监控工具
 */
export const performanceMonitor = {
    /**
     * 记录存储操作性能
     * @param {string} operation - 操作类型
     * @param {number} duration - 耗时（毫秒）
     */
    recordOperation: (operation, duration) => {
        const stats = storage.getConfig('performance.stats', {});
        if (!stats[operation]) {
            stats[operation] = { count: 0, totalTime: 0, avgTime: 0 };
        }
        
        stats[operation].count++;
        stats[operation].totalTime += duration;
        stats[operation].avgTime = stats[operation].totalTime / stats[operation].count;
        
        storage.setConfig('performance.stats', stats);
    },
    
    /**
     * 获取性能统计
     * @returns {Object} 性能统计数据
     */
    getStats: () => storage.getConfig('performance.stats', {})
}; 