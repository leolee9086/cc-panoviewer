<template>
    <div v-if="visible" class="resolution-dialog-overlay" @click="handleOverlayClick">
        <div class="resolution-dialog" @click.stop>
            <div class="dialog-header">
                <h3>选择导出分辨率</h3>
            </div>
            <div class="dialog-content">
                <div class="form-group">
                    <label for="videoOrientation">视频方向：</label>
                    <select 
                        id="videoOrientation" 
                        v-model="selectedOrientation"
                        class="orientation-select"
                        @change="handleOrientationChange"
                    >
                        <option value="landscape">横向视频</option>
                        <option value="portrait">竖向视频</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="exportResolution">分辨率：</label>
                    <select 
                        id="exportResolution" 
                        v-model="selectedResolutionIndex"
                        class="resolution-select"
                    >
                        <option 
                            v-for="(resolution, index) in currentResolutions" 
                            :key="index" 
                            :value="index"
                        >
                            {{ resolution.label }}
                        </option>
                    </select>
                </div>
                <div class="resolution-info">
                    <p>分辨率: {{ currentResolution.width }} x {{ currentResolution.height }}</p>
                    <p>文件大小预估: {{ estimatedSize }}</p>
                </div>
            </div>
            <div class="dialog-actions">
                <button @click="handleConfirm" class="btn btn-primary">确定</button>
                <button @click="handleCancel" class="btn btn-secondary">取消</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storage } from '../scripts/storage.js';

// 定义横向分辨率选项
const LANDSCAPE_RESOLUTIONS = [
    { label: '720p (1280x720)', width: 1280, height: 720 },
    { label: '1080p (1920x1080)', width: 1920, height: 1080 },
    { label: '2K (2560x1440)', width: 2560, height: 1440 },
    { label: '4K (3840x2160)', width: 3840, height: 2160 }
];

// 定义竖向分辨率选项（以设备名称显示）
const PORTRAIT_RESOLUTIONS = [
    { label: 'iPhone 15 Pro (1178x2556)', width: 1178, height: 2556 },
    { label: 'iPhone 15 (1170x2532)', width: 1170, height: 2532 },
    { label: 'iPhone 14 Pro (1178x2556)', width: 1178, height: 2556 },
    { label: 'iPhone 14 (1170x2532)', width: 1170, height: 2532 },
    { label: 'iPhone 13 Pro (1170x2532)', width: 1170, height: 2532 },
    { label: 'iPhone 13 (1170x2532)', width: 1170, height: 2532 },
    { label: 'iPhone 12 Pro (1170x2532)', width: 1170, height: 2532 },
    { label: 'iPhone 12 (1170x2532)', width: 1170, height: 2532 },
    { label: 'iPhone SE (750x1334)', width: 750, height: 1334 },
    { label: 'Samsung Galaxy S24 (1080x2340)', width: 1080, height: 2340 },
    { label: 'Samsung Galaxy S23 (1080x2340)', width: 1080, height: 2340 },
    { label: 'Samsung Galaxy S22 (1080x2340)', width: 1080, height: 2340 },
    { label: 'Google Pixel 8 (1080x2400)', width: 1080, height: 2400 },
    { label: 'Google Pixel 7 (1080x2400)', width: 1080, height: 2400 },
    { label: 'OnePlus 11 (1440x3216)', width: 1440, height: 3216 },
    { label: 'Xiaomi 14 (1440x3200)', width: 1440, height: 3200 },
    { label: 'Huawei P60 (1212x2616)', width: 1212, height: 2616 },
    { label: 'OPPO Find X6 (1240x2772)', width: 1240, height: 2772 },
    { label: 'vivo X90 (1260x2800)', width: 1260, height: 2800 },
    { label: '抖音短视频 (1080x1920)', width: 1080, height: 1920 },
    { label: '快手短视频 (1080x1920)', width: 1080, height: 1920 },
    { label: '微信视频号 (1080x1920)', width: 1080, height: 1920 },
    { label: '小红书 (1080x1920)', width: 1080, height: 1920 },
    { label: 'B站竖屏 (1080x1920)', width: 1080, height: 1920 },
    { label: 'YouTube Shorts (1080x1920)', width: 1080, height: 1920 },
    { label: 'TikTok (1080x1920)', width: 1080, height: 1920 },
    { label: 'Instagram Reels (1080x1920)', width: 1080, height: 1920 },
    { label: '自定义竖向 (1080x1920)', width: 1080, height: 1920 }
];

// Props
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

// Emits
const emit = defineEmits(['confirm', 'cancel']);

// 响应式数据
const selectedOrientation = ref('landscape');
const selectedResolutionIndex = ref(1); // 默认选择1080p
const resolutions = ref(LANDSCAPE_RESOLUTIONS);

// 计算属性
const currentResolutions = computed(() => {
    return selectedOrientation.value === 'landscape' ? LANDSCAPE_RESOLUTIONS : PORTRAIT_RESOLUTIONS;
});

const currentResolution = computed(() => {
    return currentResolutions.value[selectedResolutionIndex.value];
});

const estimatedSize = computed(() => {
    const { width, height } = currentResolution.value;
    // 简单的文件大小估算（基于像素数量）
    const pixels = width * height;
    const estimatedMB = (pixels * 4) / (1024 * 1024); // 假设4字节/像素
    return `${estimatedMB.toFixed(1)} MB`;
});

// 方法
const handleOrientationChange = () => {
    // 当切换方向时，重置分辨率选择为第一个选项
    selectedResolutionIndex.value = 0;
    resolutions.value = currentResolutions.value;
};

const handleConfirm = () => {
    // 保存用户选择
    storage.setConfig('export.orientation', selectedOrientation.value);
    storage.setConfig('export.resolution.index', selectedResolutionIndex.value);
    storage.setConfig('export.resolution', currentResolution.value.label);
    
    // 触发确认事件
    emit('confirm', currentResolution.value);
};

const handleCancel = () => {
    emit('cancel');
};

const handleOverlayClick = () => {
    // 点击遮罩层时取消
    handleCancel();
};

// 生命周期
onMounted(() => {
    // 获取保存的设置
    const savedOrientation = storage.getConfig('export.orientation', 'landscape');
    const savedResolutionIndex = storage.getConfig('export.resolution.index', 1);
    
    selectedOrientation.value = savedOrientation;
    selectedResolutionIndex.value = savedResolutionIndex;
    resolutions.value = currentResolutions.value;
});
</script>

<style scoped>
.resolution-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.resolution-dialog {
    background: white;
    padding: 24px 32px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
    min-width: 400px;
    max-width: 500px;
}

.dialog-header {
    margin-bottom: 20px;
}

.dialog-header h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
}

.dialog-content {
    margin-bottom: 24px;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
}

.orientation-select,
.resolution-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background: white;
}

.orientation-select:focus,
.resolution-select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.resolution-info {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 4px;
    margin-top: 12px;
}

.resolution-info p {
    margin: 4px 0;
    font-size: 14px;
    color: #666;
}

.dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-primary:hover {
    background: #0056b3;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #545b62;
}
</style> 