/**
 * 全局导出模块
 * 用于在单文件构建模式下将模块函数暴露到全局作用域
 * 这个文件会被构建工具处理，转换为浏览器兼容的代码
 */

import { downloadPage } from './download-utils.js';

/**
 * 初始化全局函数
 * 将所有需要全局访问的函数暴露到window对象
 */
function initGlobalFunctions() {
    // 暴露下载功能
    window.downloadPage = downloadPage;
    
    // 可以在这里添加更多全局函数
    // window.otherFunction = otherFunction;
}

// 在DOM加载完成后初始化全局函数
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalFunctions);
} else {
    initGlobalFunctions();
}

// 导出初始化函数，供其他模块使用
export { initGlobalFunctions }; 