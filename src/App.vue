<template>
    <div class="main-app-container">
        <div id="panorama" ></div>
        
        <UploadPrompt v-if="showUploadPrompt" @file-uploaded="handleFileUploadComplete" />
        
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
            <img v-if="currentThumbnail" id="previewImage" :src="currentThumbnail" alt="Preview" @click="loadCurrentPanorama">
            <button id="uploader" @click="handleUploaderClick">添加图片</button>
        </div>
    </div>
</template>

<script>
import UploadPrompt from './components/UploadPrompt.vue';
import { initApp, eventBus } from './scripts/main.js';
import { createViewer } from './scripts/viewer-manager.js';
import { storage } from './scripts/storage.js';
import { createThumbnail } from './scripts/file-handler.js';

export default {
    data() {
        return {
            showUploadPrompt: true,
            currentThumbnail: null
        };
    },
    components: {
        UploadPrompt
    },
    methods: {
        hideUploadPrompt() {
            this.showUploadPrompt = false;
        },
        async loadPanorama(data) {
            const { imageId, base64data } = data;
            // Update preview container with thumbnail
            const thumbnailData = await createThumbnail(base64data);
            this.currentThumbnail = thumbnailData;

            // Create viewer
            createViewer('panorama', {
                "type": "equirectangular",
                "panorama": base64data,
                "autoLoad": true,
                "showControls": true,
                "autoRotate": true,
                "hotSpots": [] // You might want to load these from storage if available
            });
        },
        handleUploaderClick() {
            // 直接触发文件选择
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                if (e.target.files.length) {
                    const { handleFileUpload } = await import('./scripts/file-handler.js');
                    const result = await handleFileUpload(e.target.files);
                    if (result) {
                        this.hideUploadPrompt();
                        this.loadPanorama(result);
                    }
                }
            };
            input.click();
        },
        loadCurrentPanorama() {
            // 获取当前图片编号
            const currentImageId = storage.getCurrentImage();
            if (currentImageId) {
                // 获取原始图片数据
                const imageData = storage.getImage(currentImageId);
                if (imageData) {
                    this.loadPanorama({ imageId: currentImageId, base64data: imageData });
                }
            }
        },
        handleFileUploadComplete(result) {
            this.hideUploadPrompt();
            this.loadPanorama(result);
        }
    },
    mounted() {
        console.log("APP加载成功");
        initApp(); // This initApp is from main.js, which handles global setup.

        // Initial panorama load from storage
        const currentImageId = storage.getCurrentImage();
        if (currentImageId) {
            const imageData = storage.getImage(currentImageId);
            if (imageData) {
                this.hideUploadPrompt(); // Hide prompt if an image is loaded
                this.loadPanorama({ imageId: currentImageId, base64data: imageData });
            }
        }

        // Listen for events from eventBus
        eventBus.on('file-dropped', (data) => {
            this.hideUploadPrompt();
            this.loadPanorama(data);
        });

        eventBus.on('load-panorama', (data) => {
            this.hideUploadPrompt();
            this.loadPanorama(data);
        });
    }
};
</script>

<style>
/* You might want to move some styles here from main.css or inline styles */
</style>
