import { createViewer } from './viewer-manager.js';
import { handleFileUpload } from './file-handler.js';

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