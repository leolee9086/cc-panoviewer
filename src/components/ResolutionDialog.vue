<template>
    <div v-if="visible" class="resolution-dialog-overlay" @click="handleOverlayClick">
        <div class="resolution-dialog" @click.stop>
            <div class="dialog-header">
                <h3>选择导出分辨率</h3>
            </div>
            <div class="dialog-content">
                <div class="form-group">
                    <label for="exportResolution">分辨率：</label>
                    <select 
                        id="exportResolution" 
                        v-model="selectedResolutionIndex"
                        class="resolution-select"
                    >
                        <option 
                            v-for="(resolution, index) in resolutions" 
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

// 定义分辨率选项
const COMMON_RESOLUTIONS = [
    { label: '720p (1280x720)', width: 1280, height: 720 },
    { label: '1080p (1920x1080)', width: 1920, height: 1080 },
    { label: '2K (2560x1440)', width: 2560, height: 1440 },
    { label: '4K (3840x2160)', width: 3840, height: 2160 }
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
const selectedResolutionIndex = ref(1); // 默认选择2K
const resolutions = ref(COMMON_RESOLUTIONS);

// 计算属性
const currentResolution = computed(() => {
    return resolutions.value[selectedResolutionIndex.value];
});

const estimatedSize = computed(() => {
    const { width, height } = currentResolution.value;
    // 简单的文件大小估算（基于像素数量）
    const pixels = width * height;
    const estimatedMB = (pixels * 4) / (1024 * 1024); // 假设4字节/像素
    return `${estimatedMB.toFixed(1)} MB`;
});

// 方法
const handleConfirm = () => {
    // 保存用户选择
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
    // 获取保存的分辨率设置
    const savedResolutionIndex = storage.getConfig('export.resolution.index', 1);
    selectedResolutionIndex.value = savedResolutionIndex;
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

.resolution-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background: white;
}

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