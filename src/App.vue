<template>
    <div class="main-app-container">
        <div id="panorama" ></div>
        
        <UploadPrompt v-if="showUploadPrompt" @file-uploaded="handleFileUploadComplete" />
        
        <!-- 分辨率选择对话框 -->
        <ResolutionDialog 
            :visible="showResolutionDialog" 
            @confirm="handleResolutionConfirm" 
            @cancel="handleResolutionCancel" 
        />
        
        <div id="contextMenu">
            <ul>
                <li data-action="download-page">下载当前页面（含数据）</li>
                <li data-action="download-empty-page">下载空页面（无数据）</li>
                <li data-action="export-compressed">导出压缩版页面</li>
                <li data-action="export-video">导出视频</li>
            </ul>
        </div>
        
        <!-- 视频导出对话框 -->
        <div id="videoExportDialog" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; min-width: 400px;">
                <h3>导出全景视频</h3>
                <div style="margin: 20px 0;">
                    <label>分辨率:</label>
                    <select id="videoResolution">
                        <option value="720p">720p (1280x720)</option>
                        <option value="1080p" selected>1080p (1920x1080)</option>
                        <option value="2K">2K (2560x1440)</option>
                        <option value="4K">4K (3840x2160)</option>
                    </select>
                </div>
                <div style="margin: 20px 0;">
                    <label>时长 (秒):</label>
                    <input type="number" id="videoDuration" value="10" min="1" max="60" style="width: 80px;">
                </div>
                <div style="margin: 20px 0;">
                    <label>帧率 (FPS):</label>
                    <select id="videoFps">
                        <option value="24">24 FPS</option>
                        <option value="30" selected>30 FPS</option>
                        <option value="60">60 FPS</option>
                    </select>
                </div>
                <div style="margin: 20px 0;">
                    <label>旋转圈数:</label>
                    <input type="number" id="videoRotations" value="1" min="0.1" max="5" step="0.1" style="width: 80px;">
                </div>
                <div style="margin: 20px 0;">
                    <button id="startVideoExport" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">开始导出</button>
                    <button id="cancelVideoExport" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">取消</button>
                </div>
            </div>
        </div>
        
        <!-- 导出进度显示 -->
        <div id="exportProgress" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1001;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; min-width: 400px; text-align: center;">
                <h3>正在导出视频...</h3>
                <div style="margin: 20px 0;">
                    <div style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                        <div id="progressBar" style="width: 0%; height: 100%; background: #007bff; transition: width 0.3s;"></div>
                    </div>
                    <div id="progressText" style="margin-top: 10px;">准备中...</div>
                </div>
                <div id="previewFrame" style="margin: 20px 0; max-width: 320px; max-height: 180px;">
                    <!-- 预览帧将在这里显示 -->
                </div>
            </div>
        </div>
        
        <div id="files">
            <img src="" id="image1" class="imageFileContent">
        </div>
        
        <div id="dataBase">
            <script class="images" data-id="image1">
                // 这里将填充base64数据
            </script>
        </div>
        
        <div id="cc-right" contenteditable="true">
            这是一个"自包含"的全景图查看器,简单封装了<a href="https://pannellum.org/">pannellum</a>的接口,你可以使用它自由地查看你的各种全景图,
            右键可以下载包含你的全景图的网页内容（可能有点大，这个网页不会压缩你的全景图），你的图片只会存在网页本身中不会被上传到任何地方
            代码本身遵循AGPL-3.0-or-later协议,你可以随意再次分发并修改它,只需要保持修改之后的结果仍然遵守同样的协议即可,这段代码脚本注本身也是可以编辑的,
            你可以改成你自己喜欢的内容。
        </div>
        
        <div id="cc-bottom" contenteditable="false">
            如果你喜欢这个小工具可以去<a href="https://ifdian.net/a/leolee9086">我们的爱发电</a> 请我们喝一杯咖啡
            感谢pannellum的作者,推荐使用<a href="https://b3log.org/siyuan/">思源笔记</a>，这个网页本身就是使用思源支持后台服务的。
        </div>
        

        
        <div id="previewContainer">
            <button id="uploader">添加图片</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import UploadPrompt from './components/UploadPrompt.vue';
import ResolutionDialog from './components/ResolutionDialog.vue';
import { initApp, eventBus } from './scripts/main.js';
import { createViewer } from './scripts/viewer-manager.js';
import { storage } from './scripts/storage.js';
import { createThumbnail } from './scripts/file-handler.js';

// 响应式数据
const showUploadPrompt = ref(true);
const imageList = ref([]);
const currentImageId = ref(null);
const showResolutionDialog = ref(false);
const pendingResolutionCallback = ref(null);

// 计算属性
const currentImage = computed(() => {
    return imageList.value.find(img => img.id === currentImageId.value);
});

// 方法
const hideUploadPrompt = () => {
    showUploadPrompt.value = false;
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const updateImageList = () => {
    imageList.value = storage.getImageListDetails();
    currentImageId.value = storage.getCurrentImage();
};

const switchToImage = (imageId) => {
    if (storage.switchToImage(imageId)) {
        currentImageId.value = imageId;
        const imageData = storage.getImage(imageId);
        if (imageData) {
            loadPanorama({ imageId, base64data: imageData });
        }
    }
};

const loadPanorama = async (data) => {
    const { imageId, base64data } = data;
    
    // 从DB读取图片列表并生成缩略图
    await updateThumbnailsFromDB(imageId);

    // Create viewer
    createViewer('panorama', {
        "type": "equirectangular",
        "panorama": base64data,
        "autoLoad": true,
        "showControls": true,
        "autoRotate": true,
        "hotSpots": [] // You might want to load these from storage if available
    });
};

// 从DB读取数据更新缩略图
const updateThumbnailsFromDB = async (currentImageId) => {
    // 从DB获取图片列表
    const imageListFromDB = storage.getImageList();
    
    // 生成所有图片的缩略图
    const allThumbnails = await Promise.all(
        imageListFromDB.map(async (imgId) => {
            const imgData = storage.getImage(imgId);
            if (imgData) {
                const thumb = await createThumbnail(imgData, 100, 60);
                const metadata = storage.getImageMetadata(imgId, {});
                return `<img src="${thumb}" alt="${metadata.name || '图片'}" 
                           style="width: 200px; height: 120px; margin: 2px; cursor: pointer; border: 2px solid ${imgId === currentImageId ? '#007bff' : 'transparent'}; border-radius: 4px;"
                           data-image-id="${imgId}">`;
            }
            return '';
        })
    );
    
    // 更新预览容器
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; max-height: 400px; overflow-y: auto;">
                ${allThumbnails.filter(thumb => thumb).join('')}
            </div>
            <button id="uploader">添加图片</button>
        `;

        // 为缩略图添加点击事件
        const thumbnails = previewContainer.querySelectorAll('[data-image-id]');
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const imgId = thumb.getAttribute('data-image-id');
                switchToImage(imgId);
            });
        });
    }
};

const handleFileUploadComplete = (result) => {
    hideUploadPrompt();
    updateImageList();
    loadPanorama(result);
};

// 分辨率对话框处理方法
const handleResolutionConfirm = (resolution) => {
    showResolutionDialog.value = false;
    if (pendingResolutionCallback.value) {
        pendingResolutionCallback.value(resolution);
        pendingResolutionCallback.value = null;
    }
};

const handleResolutionCancel = () => {
    showResolutionDialog.value = false;
    pendingResolutionCallback.value = null;
};

// 显示分辨率对话框的方法（供外部调用）
const showResolutionDialogForExport = (callback) => {
    pendingResolutionCallback.value = callback;
    showResolutionDialog.value = true;
};

// 监听事件总线
const setupEventListeners = () => {
    eventBus.on('file-dropped', (data) => {
        hideUploadPrompt();
        updateImageList();
        loadPanorama(data);
    });

    eventBus.on('load-panorama', (data) => {
        hideUploadPrompt();
        updateImageList();
        loadPanorama(data);
    });

    // 监听trigger-file-input事件，用于触发文件选择
    eventBus.on('trigger-file-input', () => {
        // 创建一个隐藏的文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.html';
        input.style.display = 'none';
        
        input.onchange = async (e) => {
            if (e.target.files.length) {
                const { handleFileUpload } = await import('./scripts/file-handler.js');
                const result = await handleFileUpload(e.target.files);
                if (result) {
                    hideUploadPrompt();
                    updateImageList();
                    loadPanorama(result);
                }
            }
            // 清理DOM
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    });
};

// 生命周期
onMounted(() => {
    console.log("APP加载成功");
    initApp(); // This initApp is from main.js, which handles global setup.

    // 设置事件监听器
    setupEventListeners();

    // 初始化图片列表
    updateImageList();

    // 暴露分辨率对话框方法到全局
    window.showResolutionDialogForExport = showResolutionDialogForExport;

    // Initial panorama load from storage
    const currentImageId = storage.getCurrentImage();
    if (currentImageId) {
        const imageData = storage.getImage(currentImageId);
        if (imageData) {
            hideUploadPrompt(); // Hide prompt if an image is loaded
            loadPanorama({ imageId: currentImageId, base64data: imageData });
        }
    }
});
</script>

<style>
/* You might want to move some styles here from main.css or inline styles */
</style>
