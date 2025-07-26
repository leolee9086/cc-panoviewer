import { downloadPage, downloadEmptyPage, getCleanDocumentClone } from './download-utils.js';
import { storage } from './storage.js';
import { PanoramaVideoGenerator, saveVideoBlob } from './panorama-exporter.js';
import { DocumentDB } from './document-db.js';
import { eventBus } from './main.js'; // Import eventBus
import { handleFileUpload } from './file-handler.js';

// 常用分辨率选项（仅用于导出压缩版页面）
const COMMON_RESOLUTIONS = [
    { label: '4K (3840x1920)', width: 3840, height: 1920 },
    { label: '2K (1920x960)', width: 1920, height: 960 },
    { label: '1080p (1440x720)', width: 1440, height: 720 },
    { label: '720p (960x480)', width: 960, height: 480 },
    { label: '480p (640x320)', width: 640, height: 320 },
];

// 压缩图片到指定分辨率（仅用于导出压缩版页面）
function compressImage(src, width, height) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = src;
    });
}

// 弹窗选择分辨率 - 改为通过事件总线通知Vue组件
function showResolutionDialog(onSelect) {
    // 使用事件总线通知Vue组件显示分辨率对话框
    eventBus.emit('show-resolution-dialog', { onSelect, resolutions: COMMON_RESOLUTIONS });
}

// 视频导出相关变量
let videoGenerator = null;
let isExporting = false;

// 显示视频导出对话框 - 改为通过事件总线
function showVideoExportDialog() {
    eventBus.emit('show-video-export-dialog');
}

// 隐藏视频导出对话框 - 改为通过事件总线
function hideVideoExportDialog() {
    eventBus.emit('hide-video-export-dialog');
}

// 显示导出进度 - 改为通过事件总线
function showExportProgress() {
    eventBus.emit('show-export-progress');
}

// 隐藏导出进度 - 改为通过事件总线
function hideExportProgress() {
    eventBus.emit('hide-export-progress');
}

/**
 * 显示压缩进度对话框 - 改为通过事件总线
 */
function showCompressionProgress() {
    eventBus.emit('show-compression-progress');
}

/**
 * 更新压缩进度 - 改为通过事件总线
 * @param {string} text - 进度文本
 * @param {number} percentage - 进度百分比 (0-100)
 */
function updateCompressionProgress(text, percentage) {
    eventBus.emit('update-compression-progress', { text, percentage });
}

/**
 * 隐藏压缩进度对话框 - 改为通过事件总线
 */
function hideCompressionProgress() {
    eventBus.emit('hide-compression-progress');
}

// 更新进度条 - 改为通过事件总线
function updateProgress(progressData) {
    eventBus.emit('update-export-progress', progressData);
}

// 获取分辨率设置 - 改为通过事件总线获取
function getResolutionSettings() {
    return new Promise((resolve) => {
        eventBus.emit('get-video-settings', resolve);
    });
}

// 开始视频导出
async function startVideoExport() {
    if (isExporting) return;
    
    // 获取当前图片编号
    const currentImageId = storage.getCurrentImage();
    if (!currentImageId) {
        eventBus.emit('show-error', '没有找到可导出的图片');
        return;
    }
    
    // 从DB获取原图数据
    const imageData = storage.getImage(currentImageId);
    if (!imageData) {
        eventBus.emit('show-error', '没有找到可导出的图片数据');
        return;
    }
    
    try {
        const settings = await getResolutionSettings();
        if (!settings) {
            eventBus.emit('show-error', '无法获取视频设置');
            return;
        }
        
        isExporting = true;
        hideVideoExportDialog();
        showExportProgress();
        
        // 创建视频生成器
        videoGenerator = new PanoramaVideoGenerator(settings.width, settings.height);
        videoGenerator.initRenderer();
        await videoGenerator.setupScene(imageData);
        
        // 设置进度回调
        videoGenerator.setProgressCallback(updateProgress);
        
        // 开始录制
        const videoBlob = await videoGenerator.startRecording({
            duration: settings.duration,
            fps: settings.fps,
            rotations: settings.rotations,
            width: settings.width,
            height: settings.height
        });
        
        // 保存视频
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await saveVideoBlob(videoBlob, 'mp4', `panorama-video-${timestamp}`);
        
        // 记录导出历史
        storage.addHistory('export_video', {
            resolution: `${settings.width}x${settings.height}`,
            duration: settings.duration,
            fps: settings.fps,
            rotations: settings.rotations,
            imageId: currentImageId,
            timestamp: Date.now()
        });
        
        eventBus.emit('show-success', '视频导出完成！');
        
    } catch (error) {
        console.error('视频导出失败:', error);
        eventBus.emit('show-error', '视频导出失败: ' + error.message);
    } finally {
        isExporting = false;
        hideExportProgress();
        
        if (videoGenerator) {
            videoGenerator.dispose();
            videoGenerator = null;
        }
    }
}

// 取消视频导出
function cancelVideoExport() {
    if (videoGenerator) {
        videoGenerator.dispose();
        videoGenerator = null;
    }
    isExporting = false;
    hideVideoExportDialog();
    hideExportProgress();
}

// 导出压缩版页面
async function exportCompressedPage(resolution) {
    // 获取当前图片编号
    const currentImageId = storage.getCurrentImage();
    if (!currentImageId) {
        eventBus.emit('show-error', '没有找到可导出的图片');
        return;
    }
    
    // 从DB获取原图数据
    const src = storage.getImage(currentImageId);
    if (!src) {
        eventBus.emit('show-error', '没有找到可导出的图片数据');
        return;
    }
    
    // 记录导出操作历史
    storage.addHistory('export_compressed', {
        resolution: resolution,
        imageId: currentImageId,
        timestamp: Date.now()
    });
    
    // 显示压缩进度对话框
    showCompressionProgress();
    
    try {
        // 临时生成压缩图（不写入DB）
        const targetW = resolution.width, targetH = resolution.height;
        
        // 更新进度信息
        updateCompressionProgress('正在压缩图片...', 25);
        
        const compressed = await compressImage(src, targetW, targetH);
        
        // 更新进度信息
        updateCompressionProgress('正在准备页面模板...', 50);
        
        // 使用干净的document克隆作为蓝本
        const sourceDocument = getCleanDocumentClone();
        if (!sourceDocument) {
            throw new Error('干净的document克隆未初始化，无法进行压缩页面导出');
        }
        const tempDocument = sourceDocument.cloneNode(true);
        
        // 更新进度信息
        updateCompressionProgress('正在处理图片数据...', 75);
        
        // 在临时document中创建新的DocumentDB实例
        const tempDb = new DocumentDB(tempDocument, 'cc-panoviewer-db');
        
        // 清理临时document中的所有现有数据
        tempDb.clear();
        
        // 将压缩后的图片数据存储到DocumentDB中
        tempDb.set(`image.${currentImageId}`, compressed, { type: 'base64' });
        
        // 设置当前图片ID
        tempDb.set('currentImage', currentImageId);
        
        // 添加图片到列表
        const imageList = [currentImageId];
        tempDb.set('imageList', imageList);
        
        // 设置图片元数据（如果有的话）
        const originalMetadata = storage.getImageMetadata(currentImageId);
        if (originalMetadata) {
            tempDb.set(`image.${currentImageId}.metadata`, originalMetadata);
        }
        
        // 更新进度信息
        updateCompressionProgress('正在生成下载文件...', 90);
        
        // 获取克隆后的HTML
        const newHtml = tempDocument.documentElement.outerHTML;
        
        // 更新进度信息
        updateCompressionProgress('正在下载文件...', 100);
        
        // 下载
        const blob = new Blob([newHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `panoviewer_compressed_${targetW}x${targetH}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 隐藏进度对话框
        hideCompressionProgress();
        
        // 显示成功消息
        setTimeout(() => {
            eventBus.emit('show-success', `压缩页面导出成功！\n分辨率: ${targetW}x${targetH}\n文件大小: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        }, 500);
        
    } catch (error) {
        hideCompressionProgress();
        eventBus.emit('show-error', '压缩页面导出失败: ' + error.message);
        console.error('压缩页面导出错误:', error);
    }
}

/**
 * 设置右键菜单事件 - 改为通过事件总线
 */
function setupContextMenu() {
    document.body.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        // 通过事件总线通知Vue组件显示右键菜单
        eventBus.emit('show-context-menu', {
            x: event.pageX,
            y: event.pageY
        });
    });

    document.body.addEventListener('click', function () {
        // 通过事件总线通知Vue组件隐藏右键菜单
        eventBus.emit('hide-context-menu');
    });
}

/**
 * 设置拖拽上传事件
 */
function setupDragAndDrop() {
    document.body.addEventListener('dragover', function (event) {
        event.preventDefault();
    });

    document.body.addEventListener('drop', async function (event) {
        event.preventDefault();
        if (event.dataTransfer.files.length) {
            const result = await handleFileUpload(event.dataTransfer.files);
            if (result) {
                eventBus.emit('file-dropped', result);
            }
        }
    });
}

/**
 * 设置预览容器事件 - 改为通过事件总线
 */
function setupPreviewContainer() {
    // 移除直接DOM操作，改为通过事件总线
    eventBus.emit('setup-preview-container');
}

/**
 * 设置视频导出对话框事件 - 改为通过事件总线
 */
function setupVideoExportDialog() {
    // 通过事件总线设置事件监听器
    eventBus.emit('setup-video-export-dialog', {
        startVideoExport,
        cancelVideoExport
    });
}

/**
 * 设置所有事件监听器
 */
export function setupEventListeners() {
    setupContextMenu();
    setupDragAndDrop();
    setupPreviewContainer();
    setupVideoExportDialog();
    
    // 监听右键菜单操作事件
    eventBus.on('context-menu-action', async (action) => {
        switch (action) {
            case 'download-page':
                await downloadPage();
                break;
            case 'download-empty-page':
                downloadEmptyPage();
                break;
            case 'export-compressed':
                showResolutionDialog(exportCompressedPage);
                break;
            case 'export-video':
                showVideoExportDialog();
                break;
        }
    });

    // 监听视频导出相关事件
    eventBus.on('start-video-export', () => {
        startVideoExport();
    });

    eventBus.on('cancel-video-export', () => {
        cancelVideoExport();
    });
}