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

// 弹窗选择分辨率
function showResolutionDialog(onSelect) {
    // 获取保存的分辨率设置
    const savedResolutionIndex = storage.getConfig('export.resolution.index', 1); // 默认2K
    
    const dialog = document.createElement('div');
    dialog.style = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 32px;z-index:9999;border-radius:8px;box-shadow:0 2px 12px #0002;';
    dialog.innerHTML = `<div style="margin-bottom:12px;">选择导出分辨率：</div><select id="exportResolution">${COMMON_RESOLUTIONS.map((r,i)=>`<option value="${i}" ${i === savedResolutionIndex ? 'selected' : ''}>${r.label}</option>`).join('')}</select><br><br><button id="exportConfirm">确定</button> <button id="exportCancel">取消</button>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#exportConfirm').onclick = () => {
        const idx = parseInt(dialog.querySelector('#exportResolution').value);
        document.body.removeChild(dialog);
        // 保存用户选择
        storage.setConfig('export.resolution.index', idx);
        storage.setConfig('export.resolution', COMMON_RESOLUTIONS[idx].label);
        onSelect(COMMON_RESOLUTIONS[idx]);
    };
    dialog.querySelector('#exportCancel').onclick = () => {
        document.body.removeChild(dialog);
    };
}

// 视频导出相关变量
let videoGenerator = null;
let isExporting = false;

// 显示视频导出对话框
function showVideoExportDialog() {
    const dialog = document.getElementById('videoExportDialog');
    dialog.style.display = 'block';
}

// 隐藏视频导出对话框
function hideVideoExportDialog() {
    const dialog = document.getElementById('videoExportDialog');
    dialog.style.display = 'none';
}

// 显示导出进度
function showExportProgress() {
    const progress = document.getElementById('exportProgress');
    progress.style.display = 'block';
}

// 隐藏导出进度
function hideExportProgress() {
    const progress = document.getElementById('exportProgress');
    progress.style.display = 'none';
}

// 更新进度条
function updateProgress(progressData) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const previewFrame = document.getElementById('previewFrame');
    
    const percent = Math.round(progressData.progress * 100);
    progressBar.style.width = percent + '%';
    progressText.textContent = `${progressData.stage} ${progressData.currentFrame}/${progressData.totalFrames} (${percent}%)`;
    
    if (progressData.frameImage) {
        previewFrame.innerHTML = `<img src="${progressData.frameImage}" style="max-width: 100%; max-height: 100%;">`;
    }
}

// 获取分辨率设置
function getResolutionSettings() {
    const resolution = document.getElementById('videoResolution').value;
    const duration = parseInt(document.getElementById('videoDuration').value);
    const fps = parseInt(document.getElementById('videoFps').value);
    const rotations = parseFloat(document.getElementById('videoRotations').value);
    
    const resolutionMap = {
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '2K': { width: 2560, height: 1440 },
        '4K': { width: 3840, height: 2160 }
    };
    
    return {
        ...resolutionMap[resolution],
        duration,
        fps,
        rotations
    };
}

// 开始视频导出
async function startVideoExport() {
    if (isExporting) return;
    
    // 获取当前图片编号
    const currentImageId = storage.getCurrentImage();
    if (!currentImageId) {
        alert('没有找到可导出的图片');
        return;
    }
    
    // 从DB获取原图数据
    const imageData = storage.getImage(currentImageId);
    if (!imageData) {
        alert('没有找到可导出的图片数据');
        return;
    }
    
    const settings = getResolutionSettings();
    
    try {
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
        
        alert('视频导出完成！');
        
    } catch (error) {
        console.error('视频导出失败:', error);
        alert('视频导出失败: ' + error.message);
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
        alert('没有找到可导出的图片');
        return;
    }
    
    // 从DB获取原图数据
    const src = storage.getImage(currentImageId);
    if (!src) {
        alert('没有找到可导出的图片数据');
        return;
    }
    
    // 记录导出操作历史
    storage.addHistory('export_compressed', {
        resolution: resolution,
        imageId: currentImageId,
        timestamp: Date.now()
    });
    
    // 临时生成压缩图（不写入DB）
    const targetW = resolution.width, targetH = resolution.height;
    const compressed = await compressImage(src, targetW, targetH);
    
    // 使用干净的document克隆作为蓝本
    const sourceDocument = getCleanDocumentClone();
    if (!sourceDocument) {
        throw new Error('干净的document克隆未初始化，无法进行压缩页面导出');
    }
    const tempDocument = sourceDocument.cloneNode(true);
    
    // 在临时document中创建新的DocumentDB实例
    const tempDb = new DocumentDB(tempDocument, 'cc-panoviewer-db');
    
    // 直接用压缩后的图片数据替换原来的图片数据
    tempDb.set(`image.${currentImageId}`, compressed, { type: 'base64' });
    
    // 清理其他不需要的数据，只保留压缩图片
    const allKeys = tempDb.list();
    allKeys.forEach(key => {
        if (!key.startsWith('image.') && key !== 'currentImage') {
            tempDb.delete(key);
        }
    });
    
    // 在临时document中查找并更新script标签
    const tempScriptElement = tempDocument.querySelector('.images');
    if (tempScriptElement) {
        // 使用DOM操作安全地写入压缩后的base64数据
        tempScriptElement.textContent = 'window.imageData = "' + compressed + '";';
    }
    
    // 在临时document中查找并更新缩略图
    const tempImageElement = tempDocument.querySelector('#image1');
    if (tempImageElement) {
        // 使用DOM操作安全地设置缩略图src
        tempImageElement.src = compressed;
    }
    
    // 在临时document中查找并更新预览图
    const tempPreviewImage = tempDocument.querySelector('#previewImage');
    if (tempPreviewImage) {
        // 使用DOM操作安全地设置预览图src
        tempPreviewImage.src = compressed;
    }
    
    // 获取克隆后的HTML
    const newHtml = tempDocument.documentElement.outerHTML;
    
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
}

/**
 * 设置右键菜单事件
 */
function setupContextMenu() {
    document.body.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        const contextMenu = document.getElementById('contextMenu');
        contextMenu.style.top = `${event.pageY}px`;
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.display = 'block';
    });

    document.body.addEventListener('click', function () {
        document.getElementById('contextMenu').style.display = 'none';
    });
    
    // 处理右键菜单项点击事件
    document.getElementById('contextMenu').addEventListener('click', async function (event) {
        const action = event.target.getAttribute('data-action');
        if (action === 'download-page') {
            await downloadPage();
        }
        if (action === 'download-empty-page') {
            downloadEmptyPage();
        }
        if (action === 'export-compressed') {
            showResolutionDialog(exportCompressedPage);
        }
        if (action === 'export-video') {
            showVideoExportDialog();
        }
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
            // document.getElementById('uploadPrompt').textContent = "正在打开文件"; // This is now handled by Vue
            const result = await handleFileUpload(event.dataTransfer.files);
            if (result) {
                eventBus.emit('file-dropped', result);
            }
        }
    });
}

/**
 * 设置预览容器事件
 */
function setupPreviewContainer() {
    const previewContainer = document.getElementById('previewContainer');

    previewContainer.addEventListener('click', async (e) => {
        if (e.target.src && e.target.id === 'previewImage') {
            // Get current image ID from storage
            const currentImageId = storage.getCurrentImage();
            if (currentImageId) {
                // Get original image data from DB
                const imageData = storage.getImage(currentImageId);
                if (imageData) {
                    eventBus.emit('load-panorama', { imageId: currentImageId, base64data: imageData });
                }
            }
        } else if (e.target === document.getElementById('uploader')) {
            // This part is now handled by UploadPrompt.vue
            // const input = document.createElement('input');
            // input.type = 'file';
            // input.accept = 'image/*';
            // input.onchange = e => {
            //     if (e.target.files.length) {
            //         const file = e.target.files[0];
            //         handleFileUpload(file);
            //     }
            // };
            // input.click();
            eventBus.emit('trigger-file-input'); // Emit event to trigger file input in Vue component
        }
    });

    previewContainer.addEventListener('contextmenu', (e) => {
        if (e.target.src) {
            e.target.remove();
            e.stopPropagation();
        }
    });
}

/**
 * 设置文件输入事件
 */
// function setupFileInput() { // This function is no longer needed as file input is handled by Vue
//     document.getElementById('fileInput').addEventListener('change', function (event) {
//         if (this.files.length) {
//             handleFileUpload(this.files[0]);
//         }
//     });
// }

/**
 * 设置视频导出对话框事件
 */
function setupVideoExportDialog() {
    // 开始导出按钮
    document.getElementById('startVideoExport').addEventListener('click', startVideoExport);
    
    // 取消导出按钮
    document.getElementById('cancelVideoExport').addEventListener('click', cancelVideoExport);
    
    // 点击对话框外部关闭
    document.getElementById('videoExportDialog').addEventListener('click', function(e) {
        if (e.target === this) {
            hideVideoExportDialog();
        }
    });
}

/**
 * 设置所有事件监听器
 */
export function setupEventListeners() {
    setupContextMenu();
    setupDragAndDrop();
    setupPreviewContainer();
    // setupFileInput(); // No longer needed
    setupVideoExportDialog();
}