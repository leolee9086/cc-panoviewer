import { createViewer } from './viewer-manager.js';
import { handleFileUpload } from './file-handler.js';
import { downloadPage } from './download-utils.js';

// 常用分辨率选项
const COMMON_RESOLUTIONS = [
    { label: '4K (3840x1920)', width: 3840, height: 1920 },
    { label: '2K (1920x960)', width: 1920, height: 960 },
    { label: '1080p (1440x720)', width: 1440, height: 720 },
    { label: '720p (960x480)', width: 960, height: 480 },
    { label: '480p (640x320)', width: 640, height: 320 },
];

// 压缩图片到指定分辨率
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
    const dialog = document.createElement('div');
    dialog.style = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 32px;z-index:9999;border-radius:8px;box-shadow:0 2px 12px #0002;';
    dialog.innerHTML = `<div style="margin-bottom:12px;">选择导出分辨率：</div><select id="exportResolution">${COMMON_RESOLUTIONS.map((r,i)=>`<option value="${i}">${r.label}</option>`).join('')}</select><br><br><button id="exportConfirm">确定</button> <button id="exportCancel">取消</button>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#exportConfirm').onclick = () => {
        const idx = dialog.querySelector('#exportResolution').value;
        document.body.removeChild(dialog);
        onSelect(COMMON_RESOLUTIONS[idx]);
    };
    dialog.querySelector('#exportCancel').onclick = () => {
        document.body.removeChild(dialog);
    };
}

// 导出压缩版页面
async function exportCompressedPage(resolution) {
    // 获取图片数据 - 检查多个可能的存储位置
    let src = null;
    
    // 1. 检查window.imageData
    if (window.imageData) {
        src = window.imageData;
    }
    // 2. 检查HTML中script标签的图片数据
    else {
        const scriptElement = document.querySelector('.images');
        if (scriptElement && scriptElement.textContent.includes('window.imageData = ')) {
            try {
                // 尝试解析转义字符格式的base64数据
                const match = scriptElement.textContent.match(/window\.imageData = "([^"]+)"/);
                if (match) {
                    src = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                }
            } catch (e) {
                // 如果解析失败，尝试旧的格式
                if (scriptElement.textContent.includes('window.imageData = "')) {
                    const match = scriptElement.textContent.match(/window\.imageData = "([^"]+)"/);
                    if (match) {
                        src = match[1];
                    }
                }
            }
        }
    }
    
    if (!src) {
        alert('没有找到可导出的图片数据');
        return;
    }
    
    // 先解码原图尺寸
    const img = new Image();
    img.src = src;
    await new Promise(r=>img.onload=r);
    const targetW = resolution.width, targetH = resolution.height;
    const compressed = await compressImage(src, targetW, targetH);
    
    // 创建临时克隆版document
    const tempDocument = document.cloneNode(true);
    
    // 在临时document中查找并更新script标签
    const tempScriptElement = tempDocument.querySelector('.images');
    if (tempScriptElement) {
        // 使用DOM操作安全地写入base64数据
        tempScriptElement.textContent = 'window.imageData = "' + compressed + '";';
    }
    
    // 在临时document中查找并更新缩略图
    const tempImageElement = tempDocument.querySelector('#image1');
    if (tempImageElement) {
        // 使用DOM操作安全地设置缩略图src
        tempImageElement.src = compressed;
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
    document.getElementById('contextMenu').addEventListener('click', function (event) {
        const action = event.target.getAttribute('data-action');
        if (action === 'download-page') {
            downloadPage();
        }
        if (action === 'export-compressed') {
            showResolutionDialog(exportCompressedPage);
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

    document.body.addEventListener('drop', function (event) {
        event.preventDefault();
        if (event.dataTransfer.files.length) {
            document.getElementById('uploadPrompt').textContent = "正在打开文件";
            handleFileUpload(event.dataTransfer.files[0]);
        }
    });
}

/**
 * 设置预览容器事件
 */
function setupPreviewContainer() {
    const previewContainer = document.getElementById('previewContainer');
    
    previewContainer.addEventListener('click', (e) => {
        if (e.target.src) {
            const viewer = createViewer('panorama', {
                "type": "equirectangular",
                "panorama": e.target.src,
                "autoLoad": true,
                "showControls": true,
                "autoRotate": true,
                "hotSpots": []
            });
        } else if (e.target === document.getElementById('uploader')) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = e => {
                if (e.target.files.length) {
                    const file = e.target.files[0];
                    handleFileUpload(file);
                }
            };
            input.click();
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
function setupFileInput() {
    document.getElementById('fileInput').addEventListener('change', function (event) {
        if (this.files.length) {
            handleFileUpload(this.files[0]);
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
    setupFileInput();
} 