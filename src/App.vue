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
        
        <!-- 统一导出对话框 -->
        <ExportDialog 
            :visible="showExportDialog" 
            @close="handleExportDialogClose" 
            @export-complete="handleExportComplete" 
        />
        
        <!-- 右键菜单 - 改为Vue组件 -->
        <div v-if="showContextMenu" 
             :style="{ top: contextMenuPosition.y + 'px', left: contextMenuPosition.x + 'px' }"
             class="context-menu">
            <ul>
                <li @click="handleContextMenuAction('export-page')">导出页面（选择图片和压缩）</li>
                <li @click="handleContextMenuAction('download-empty-page')">下载空页面（无数据）</li>
                <li @click="handleContextMenuAction('export-video')">导出视频</li>
            </ul>
        </div>
        
        <!-- 视频导出对话框 - 改为Vue组件 -->
        <div v-if="showVideoExportDialog" class="video-export-dialog">
            <div class="dialog-content">
                <h3>导出全景视频</h3>
                <div class="form-group">
                    <label>视频方向:</label>
                    <select v-model="videoSettings.orientation" @change="handleVideoOrientationChange">
                        <option value="landscape">横向视频</option>
                        <option value="portrait">竖向视频</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>分辨率:</label>
                    <select v-model="videoSettings.resolution">
                        <option v-for="(resolution, index) in currentVideoResolutions" 
                                :key="index" 
                                :value="resolution.value">
                            {{ resolution.label }}
                        </option>
                    </select>
                </div>
                <div class="form-group">
                    <label>时长 (秒):</label>
                    <input type="number" v-model="videoSettings.duration" min="1" max="60">
                </div>
                <div class="form-group">
                    <label>帧率 (FPS):</label>
                    <select v-model="videoSettings.fps">
                        <option value="24">24 FPS</option>
                        <option value="30">30 FPS</option>
                        <option value="60">60 FPS</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>旋转圈数:</label>
                    <input type="number" v-model="videoSettings.rotations" min="0.1" max="5" step="0.1">
                </div>
                <div class="form-group">
                    <button @click="startVideoExport" class="btn-primary">开始导出</button>
                    <button @click="cancelVideoExport" class="btn-secondary">取消</button>
                </div>
            </div>
        </div>
        
        <!-- 导出进度显示 - 改为Vue组件 -->
        <div v-if="showExportProgress" class="export-progress">
            <div class="progress-content">
                <h3>正在导出视频...</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" :style="{ width: exportProgress.percent + '%' }"></div>
                </div>
                <div class="progress-text">{{ exportProgress.text }}</div>
                <div v-if="exportProgress.frameImage" class="preview-frame">
                    <img :src="exportProgress.frameImage" alt="预览帧">
                </div>
            </div>
        </div>
        
        <!-- 压缩进度对话框 - 改为Vue组件 -->
        <div v-if="showCompressionProgress" class="compression-progress">
            <div class="compression-content">
                <h3>正在压缩页面...</h3>
                <div class="progress-bar-container">
                    <div class="compression-progress-bar" :style="{ width: compressionProgress.percentage + '%' }"></div>
                </div>
                <div class="compression-progress-text">{{ compressionProgress.text }}</div>
                <div class="compression-info">
                    <div>压缩过程包括：</div>
                    <div>1. 图片压缩处理</div>
                    <div>2. 页面模板准备</div>
                    <div>3. 数据整合</div>
                    <div>4. 文件生成下载</div>
                </div>
            </div>
        </div>
        
        <!-- 消息提示 - 改为Vue组件 -->
        <div v-if="showMessage" class="message-toast" :class="messageType">
            {{ messageText }}
        </div>
        
        <div id="files">
            <img src="" id="image1" class="imageFileContent">
        </div>
        
        <div id="dataBase">
            <script class="images" data-id="image1">
                // 这里将填充base64数据
            </script>
        </div>
        
        <!-- 富文本编辑器组件 -->
        <RichTextEditor 
            :current-image-id="currentImageId"
            :image-list="imageList"
            @content-changed="handleIntroductionContentChanged"
        />
        
        <div id="cc-bottom" contenteditable="false">
            如果你喜欢这个小工具可以去<a href="https://ifdian.net/a/leolee9086">我们的爱发电</a> 请我们喝一杯咖啡
            感谢pannellum的作者,推荐使用<a href="https://b3log.org/siyuan/">思源笔记</a>，这个网页本身就是使用思源支持后台服务的。
            <a href="https://github.com/leolee9086/cc-panoviewer" target="_blank" rel="noopener noreferrer">GitHub 项目地址</a>
            <a href="https://www.zhihu.com/people/wen-zhi-dao-56" target="_blank" rel="noopener noreferrer">知乎主页</a>
            <a href="https://www.xiaohongshu.com/discovery/item/688064050000000017033b0f?source=webshare&xhsshare=pc_web&xsec_token=ABwffSm9tG8q7n3DsTW7VqWGAk6LToL0vxg5r6xQpncLw=&xsec_source=pc_share" target="_blank" rel="noopener noreferrer">小红书主页</a>
            <a href="https://space.bilibili.com/71034467?spm_id_from=333.1007.0.0" target="_blank" rel="noopener noreferrer">B站主页</a>
            <a href="https://qm.qq.com/q/oq68sOKWQg" target="_blank" rel="noopener noreferrer">思源爱好者折腾群</a>
        </div>
        
        <!-- 预览容器 - 改为Vue响应式 -->
        <div id="previewContainer" class="preview-container">
            <div class="thumbnails-container">
                <img v-for="thumbnail in thumbnails" 
                     :key="thumbnail.id"
                     :src="thumbnail.src" 
                     :alt="thumbnail.alt"
                     :class="{ active: thumbnail.id === currentImageId }"
                     @click="switchToImage(thumbnail.id)"
                     class="thumbnail">
            </div>
            <button @click="triggerFileInput" class="upload-button">添加图片</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import UploadPrompt from './components/UploadPrompt.vue';
import ResolutionDialog from './components/ResolutionDialog.vue';
import ExportDialog from './components/ExportDialog.vue';
import RichTextEditor from './components/RichTextEditor.vue';
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
const showExportDialog = ref(false);

// 新增的响应式数据
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const showVideoExportDialog = ref(false);
const showExportProgress = ref(false);
const showCompressionProgress = ref(false);
const showMessage = ref(false);
const messageText = ref('');
const messageType = ref('info');

// 视频设置
const videoSettings = ref({
    orientation: 'landscape',
    resolution: '1080p',
    duration: 10,
    fps: 30,
    rotations: 1
});

// 横向分辨率选项
const LANDSCAPE_VIDEO_RESOLUTIONS = [
    { value: '720p', label: '720p (1280x720)', width: 1280, height: 720 },
    { value: '1080p', label: '1080p (1920x1080)', width: 1920, height: 1080 },
    { value: '2K', label: '2K (2560x1440)', width: 2560, height: 1440 },
    { value: '4K', label: '4K (3840x2160)', width: 3840, height: 2160 }
];

// 竖向分辨率选项（以设备名称显示）
const PORTRAIT_VIDEO_RESOLUTIONS = [
    { value: 'iphone15pro', label: 'iPhone 15 Pro (1178x2556)', width: 1178, height: 2556 },
    { value: 'iphone15', label: 'iPhone 15 (1170x2532)', width: 1170, height: 2532 },
    { value: 'iphone14pro', label: 'iPhone 14 Pro (1178x2556)', width: 1178, height: 2556 },
    { value: 'iphone14', label: 'iPhone 14 (1170x2532)', width: 1170, height: 2532 },
    { value: 'iphone13pro', label: 'iPhone 13 Pro (1170x2532)', width: 1170, height: 2532 },
    { value: 'iphone13', label: 'iPhone 13 (1170x2532)', width: 1170, height: 2532 },
    { value: 'iphone12pro', label: 'iPhone 12 Pro (1170x2532)', width: 1170, height: 2532 },
    { value: 'iphone12', label: 'iPhone 12 (1170x2532)', width: 1170, height: 2532 },
    { value: 'iphonese', label: 'iPhone SE (750x1334)', width: 750, height: 1334 },
    { value: 'samsunggalaxys24', label: 'Samsung Galaxy S24 (1080x2340)', width: 1080, height: 2340 },
    { value: 'samsunggalaxys23', label: 'Samsung Galaxy S23 (1080x2340)', width: 1080, height: 2340 },
    { value: 'samsunggalaxys22', label: 'Samsung Galaxy S22 (1080x2340)', width: 1080, height: 2340 },
    { value: 'googlepixel8', label: 'Google Pixel 8 (1080x2400)', width: 1080, height: 2400 },
    { value: 'googlepixel7', label: 'Google Pixel 7 (1080x2400)', width: 1080, height: 2400 },
    { value: 'oneplus11', label: 'OnePlus 11 (1440x3216)', width: 1440, height: 3216 },
    { value: 'xiaomi14', label: 'Xiaomi 14 (1440x3200)', width: 1440, height: 3200 },
    { value: 'huaweip60', label: 'Huawei P60 (1212x2616)', width: 1212, height: 2616 },
    { value: 'oppofindx6', label: 'OPPO Find X6 (1240x2772)', width: 1240, height: 2772 },
    { value: 'vivox90', label: 'vivo X90 (1260x2800)', width: 1260, height: 2800 },
    { value: 'douyin', label: '抖音短视频 (1080x1920)', width: 1080, height: 1920 },
    { value: 'kuaishou', label: '快手短视频 (1080x1920)', width: 1080, height: 1920 },
    { value: 'wechatvideo', label: '微信视频号 (1080x1920)', width: 1080, height: 1920 },
    { value: 'xiaohongshu', label: '小红书 (1080x1920)', width: 1080, height: 1920 },
    { value: 'bilibili', label: 'B站竖屏 (1080x1920)', width: 1080, height: 1920 },
    { value: 'youtubeshorts', label: 'YouTube Shorts (1080x1920)', width: 1080, height: 1920 },
    { value: 'tiktok', label: 'TikTok (1080x1920)', width: 1080, height: 1920 },
    { value: 'instagramreels', label: 'Instagram Reels (1080x1920)', width: 1080, height: 1920 },
    { value: 'customportrait', label: '自定义竖向 (1080x1920)', width: 1080, height: 1920 }
];

// 计算当前视频分辨率选项
const currentVideoResolutions = computed(() => {
    return videoSettings.value.orientation === 'landscape' 
        ? LANDSCAPE_VIDEO_RESOLUTIONS 
        : PORTRAIT_VIDEO_RESOLUTIONS;
});

// 导出进度
const exportProgress = ref({
    percent: 0,
    text: '准备中...',
    frameImage: null
});

// 压缩进度
const compressionProgress = ref({
    percentage: 0,
    text: '准备中...'
});

// 缩略图数据
const thumbnails = ref([]);

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

// 从DB读取数据更新缩略图 - 改为Vue响应式
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
                return {
                    id: imgId,
                    src: thumb,
                    alt: metadata.name || '图片',
                    isActive: imgId === currentImageId
                };
            }
            return null;
        })
    );
    
    // 更新缩略图数据
    thumbnails.value = allThumbnails.filter(thumb => thumb);
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

// 导出对话框处理方法
const handleExportDialogClose = () => {
    showExportDialog.value = false;
};

const handleExportComplete = () => {
    showExportDialog.value = false;
    showMessageToast('导出完成！', 'success');
};

// 处理介绍文字变化
const handleIntroductionContentChanged = (content) => {
    // 介绍文字内容已通过storage自动保存
    // 这里可以添加额外的处理逻辑，比如更新导出数据等
    console.log('介绍文字已更新:', content);
};

// 显示分辨率对话框的方法（供外部调用）
const showResolutionDialogForExport = (callback) => {
    pendingResolutionCallback.value = callback;
    showResolutionDialog.value = true;
};

// 右键菜单处理
const handleContextMenuAction = async (action) => {
    showContextMenu.value = false;
    eventBus.emit('context-menu-action', action);
};

// 触发文件输入
const triggerFileInput = () => {
    eventBus.emit('trigger-file-input');
};

// 显示消息提示
const showMessageToast = (text, type = 'info') => {
    messageText.value = text;
    messageType.value = type;
    showMessage.value = true;
    
    setTimeout(() => {
        showMessage.value = false;
    }, 3000);
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

    // 监听图片切换事件
    eventBus.on('switch-to-image', (imageId) => {
        switchToImage(imageId);
        // 触发图片切换完成事件
        setTimeout(() => {
            eventBus.emit('image-switched', imageId);
        }, 100); // 给一点时间让图片加载
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

    // 监听右键菜单事件
    eventBus.on('show-context-menu', ({ x, y }) => {
        contextMenuPosition.value = { x, y };
        showContextMenu.value = true;
    });

    eventBus.on('hide-context-menu', () => {
        showContextMenu.value = false;
    });

    // 监听视频导出对话框事件
    eventBus.on('show-video-export-dialog', () => {
        showVideoExportDialog.value = true;
    });

    eventBus.on('hide-video-export-dialog', () => {
        showVideoExportDialog.value = false;
    });

    // 监听导出进度事件
    eventBus.on('show-export-progress', () => {
        showExportProgress.value = true;
    });

    eventBus.on('hide-export-progress', () => {
        showExportProgress.value = false;
    });

    eventBus.on('update-export-progress', (progressData) => {
        exportProgress.value = {
            percent: Math.round(progressData.progress * 100),
            text: `${progressData.stage} ${progressData.currentFrame}/${progressData.totalFrames} (${Math.round(progressData.progress * 100)}%)`,
            frameImage: progressData.frameImage
        };
    });

    // 监听压缩进度事件
    eventBus.on('show-compression-progress', () => {
        showCompressionProgress.value = true;
    });

    eventBus.on('hide-compression-progress', () => {
        showCompressionProgress.value = false;
    });

    eventBus.on('update-compression-progress', ({ text, percentage }) => {
        compressionProgress.value = { text, percentage };
    });

    // 监听分辨率对话框事件
    eventBus.on('show-resolution-dialog', ({ onSelect, resolutions }) => {
        // 这里可以传递给ResolutionDialog组件
        showResolutionDialogForExport(onSelect);
    });

    // 监听统一导出对话框事件
    eventBus.on('show-export-dialog', () => {
        showExportDialog.value = true;
    });

    // 监听视频设置获取事件
    eventBus.on('get-video-settings', (resolve) => {
        // 根据当前选择的分辨率获取对应的宽度和高度
        const currentResolution = currentVideoResolutions.value.find(
            res => res.value === videoSettings.value.resolution
        ) || currentVideoResolutions.value[0];
        
        const settings = {
            width: currentResolution.width,
            height: currentResolution.height,
            duration: videoSettings.value.duration,
            fps: videoSettings.value.fps,
            rotations: videoSettings.value.rotations,
            orientation: videoSettings.value.orientation
        };
        
        resolve(settings);
    });

    // 监听消息提示事件
    eventBus.on('show-error', (message) => {
        showMessageToast(message, 'error');
    });

    eventBus.on('show-success', (message) => {
        showMessageToast(message, 'success');
    });
};

// 视频导出相关方法
const handleVideoOrientationChange = () => {
    // 当切换方向时，重置分辨率选择为第一个选项
    videoSettings.value.resolution = currentVideoResolutions.value[0].value;
};

const startVideoExport = () => {
    eventBus.emit('start-video-export');
};

const cancelVideoExport = () => {
    eventBus.emit('cancel-video-export');
    showVideoExportDialog.value = false;
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
/* 新增的样式 */
.context-menu {
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
    min-width: 150px;
}

.context-menu ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.context-menu li {
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
}

.context-menu li:hover {
    background: #f5f5f5;
}

.context-menu li:last-child {
    border-bottom: none;
}

.video-export-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dialog-content {
    background: white;
    padding: 30px;
    border-radius: 10px;
    min-width: 400px;
}

.form-group {
    margin: 20px 0;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.btn-primary {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    margin-right: 10px;
}

.btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
}

.export-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
}

.progress-content {
    background: white;
    padding: 30px;
    border-radius: 10px;
    min-width: 400px;
    text-align: center;
}

.progress-bar-container {
    width: 100%;
    height: 20px;
    background: #f0f0f0;
    border-radius: 10px;
    overflow: hidden;
    margin: 20px 0;
}

.progress-bar {
    height: 100%;
    background: #007bff;
    transition: width 0.3s;
}

.progress-text {
    margin-top: 10px;
    color: #666;
}

.preview-frame {
    margin: 20px 0;
    max-width: 320px;
    max-height: 180px;
}

.preview-frame img {
    max-width: 100%;
    max-height: 100%;
}

.compression-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 1002;
    display: flex;
    align-items: center;
    justify-content: center;
}

.compression-content {
    background: white;
    padding: 30px;
    border-radius: 10px;
    min-width: 400px;
    text-align: center;
}

.compression-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #007bff, #0056b3);
    transition: width 0.3s;
}

.compression-progress-text {
    margin-top: 10px;
    color: #666;
    font-size: 14px;
}

.compression-info {
    margin-top: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 5px;
    font-size: 12px;
    color: #666;
}

.message-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    z-index: 1003;
    max-width: 300px;
}

.message-toast.success {
    background: #28a745;
}

.message-toast.error {
    background: #dc3545;
}

.message-toast.info {
    background: #17a2b8;
}

.preview-container {
    margin-top: 20px;
}

.thumbnails-container {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 10px;
    max-height: 400px;
    overflow-y: auto;
}

.thumbnail {
    width: 200px;
    height: 120px;
    margin: 2px;
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 4px;
    object-fit: cover;
}

.thumbnail.active {
    border-color: #007bff;
}

.upload-button {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}

.upload-button:hover {
    background: #0056b3;
}
</style>
