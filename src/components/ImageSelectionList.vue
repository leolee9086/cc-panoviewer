<template>
  <div class="image-selection-list">
    <div class="list-header">
      <div class="select-all">
        <input 
          type="checkbox" 
          :checked="allSelected"
          :indeterminate="someSelected"
          @change="toggleSelectAll"
        />
        <span>全选</span>
      </div>
      <div class="list-stats">
        已选择 {{ selectedCount }}/{{ images.length }} 张图片
      </div>
    </div>
    
    <div class="image-items">
      <div v-for="image in images" :key="image.imageId" class="image-item">
        <!-- 选择框 -->
        <div class="image-checkbox">
          <input 
            type="checkbox" 
            v-model="image.selected"
            @change="updateSelection"
          />
        </div>
        
        <!-- 图片信息 -->
        <div class="image-info">
          <div class="image-name">{{ image.name }}</div>
          <div class="image-size">{{ formatFileSize(image.originalSize) }}</div>
        </div>
        
        <!-- 压缩选项 -->
        <div class="compression-options">
          <div class="compression-toggle">
            <label class="radio-label">
              <input 
                type="radio" 
                v-model="image.compression.enabled" 
                :value="false"
                :disabled="!image.selected"
              />
              <span>原图</span>
            </label>
            <label class="radio-label">
              <input 
                type="radio" 
                v-model="image.compression.enabled" 
                :value="true"
                :disabled="!image.selected"
              />
              <span>压缩</span>
            </label>
          </div>
          
          <!-- 分辨率选择（仅压缩时显示） -->
          <div v-if="image.compression.enabled && image.selected" class="resolution-select">
            <select 
              v-model="image.compression.resolution"
              @change="updateSelection"
            >
              <option v-for="res in getAvailableResolutions(image)" :key="res.label" :value="res">
                {{ res.label }}
              </option>
            </select>
            <div class="compressed-size">
              预计: {{ getCompressedSize(image) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// 分辨率预设
const RESOLUTION_PRESETS = [
  { label: '8K (7680x3840)', width: 7680, height: 3840 },
  { label: '4K (3840x1920)', width: 3840, height: 1920 },
  { label: '2K (1920x960)', width: 1920, height: 960 },
  { label: '1080p (1440x720)', width: 1440, height: 720 },
  { label: '720p (960x480)', width: 960, height: 480 },
  { label: '480p (640x320)', width: 640, height: 320 }
];

// Props
const props = defineProps({
  images: {
    type: Array,
    required: true
  }
});

// Emits
const emit = defineEmits(['update:images']);

// 响应式数据
const images = ref(props.images);
const resolutions = ref(RESOLUTION_PRESETS);

// 计算属性
const selectedCount = computed(() => {
  return images.value.filter(img => img.selected).length;
});

const allSelected = computed(() => {
  return images.value.length > 0 && images.value.every(img => img.selected);
});

const someSelected = computed(() => {
  return selectedCount.value > 0 && selectedCount.value < images.value.length;
});

// 获取图片的可用分辨率选项（过滤掉比原图更大的选项）
const getAvailableResolutions = (image) => {
  if (!image.originalWidth || !image.originalHeight) {
    return RESOLUTION_PRESETS;
  }
  
  return RESOLUTION_PRESETS.filter(res => {
    return res.width <= image.originalWidth && res.height <= image.originalHeight;
  });
};

// 方法
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getCompressedSize = (image) => {
  if (!image.compression.enabled) return '';
  
  const { width, height } = image.compression.resolution;
  const originalPixels = image.originalWidth * image.originalHeight;
  const compressedPixels = width * height;
  const compressionRatio = compressedPixels / originalPixels;
  
  const compressedBytes = Math.round(image.originalSize * compressionRatio);
  return formatFileSize(compressedBytes);
};

const toggleSelectAll = () => {
  const newValue = !allSelected.value;
  images.value.forEach(img => {
    img.selected = newValue;
  });
  updateSelection();
};

const updateSelection = () => {
  emit('update:images', images.value);
};

// 监听props变化
watch(() => props.images, (newImages) => {
  images.value = newImages;
}, { deep: true });
</script>

<style scoped>
.image-selection-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f0f0f0;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 500;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-stats {
  font-size: 14px;
  color: #666;
}

.image-items {
  padding: 8px;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.image-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.1);
}

.image-checkbox {
  flex-shrink: 0;
}

.image-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.image-info {
  flex: 1;
  min-width: 0;
}

.image-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-size {
  font-size: 12px;
  color: #666;
}

.compression-options {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compression-toggle {
  display: flex;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 14px;
}

.radio-label input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.radio-label:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.resolution-select {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resolution-select select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

.compressed-size {
  font-size: 11px;
  color: #888;
  font-style: italic;
}
</style> 