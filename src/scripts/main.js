import { createApp } from 'vue';
import { initPannellum } from './pannellum-loader.js';
import { setupEventListeners } from './event-handlers.js';
import { storage, migrationTools } from './storage.js';
import { setCleanDocumentClone } from './download-utils.js';

// Event Bus for communication between Vue and vanilla JS
export const eventBus = {
    listeners: {},
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                callback(...args);
            });
        }
    }
};

/**
 * 应用主入口
 */
export function initApp() {
    // 初始化存储系统
    initStorage();

    // 初始化Pannellum
    initPannellum();

    // 设置事件监听器
    setupEventListeners();
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

import App from '../App.vue';

// 在模块加载时立即创建干净的document克隆
// 此时DOM已经加载完成，但Vue还没有初始化
const cleanDocumentClone = document.cloneNode(true);
setCleanDocumentClone(cleanDocumentClone);

// 立即挂载Vue应用
createApp(App).mount('#app');
