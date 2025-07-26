/**
 * 下载工具函数
 * 提供页面下载相关的功能
 */

/**
 * 下载当前页面为HTML文件
 * 将当前页面的完整HTML内容下载为本地文件
 */
export function downloadPage() {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'downloaded_page.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 将downloadPage函数暴露到全局作用域
 * 供构建工具在单文件模式下使用
 */
export function exposeDownloadPageToGlobal() {
    if (typeof window !== 'undefined') {
        window.downloadPage = downloadPage;
    }
} 