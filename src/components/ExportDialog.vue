<template>
  <div v-if="visible" class="export-dialog-overlay" @click="handleOverlayClick">
    <div class="export-dialog" @click.stop>
      <div class="dialog-header">
        <h3>导出页面</h3>
        <button class="close-btn" @click="handleCancel">&times;</button>
      </div>
      
      <div class="dialog-content">
        <!-- 图片选择列表 -->
        <div class="section">
          <h4>选择要导出的图片</h4>
          <ImageSelectionList 
            :images="images" 
            @update:images="updateImages"
          />
        </div>
        
        <!-- 导出统计 -->
        <div class="section">
          <h4>导出统计</h4>
          <div class="export-stats">
            <div class="stat-item">
              <span class="stat-label">选中图片:</span>
              <span class="stat-value">{{ selectedCount }} 张</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">预计文件大小:</span>
              <span class="stat-value">{{ estimatedFileSize }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">压缩图片:</span>
              <span class="stat-value">{{ compressedCount }} 张</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">原图:</span>
              <span class="stat-value">{{ originalCount }} 张</span>
            </div>
          </div>
        </div>
        
        <!-- 文件命名 -->
        <div class="section">
          <h4>文件设置</h4>
          <div class="file-settings">
            <div class="form-group">
              <label for="fileName">文件名:</label>
              <input 
                id="fileName"
                v-model="fileName"
                type="text"
                class="file-input"
                placeholder="输入文件名"
              />
            </div>
            <div class="file-preview">
              预览: {{ fileName }}.html
            </div>
          </div>
        </div>
      </div>
      
      <div class="dialog-actions">
        <button 
          @click="handleExport" 
          class="btn btn-primary"
          :disabled="selectedCount === 0 || isExporting"
        >
          {{ isExporting ? '导出中...' : '导出' }}
        </button>
        <button @click="handleCancel" class="btn btn-secondary">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { storage } from '../scripts/storage.js';
import ImageSelectionList from './ImageSelectionList.vue';
import { exportSelectedImages, getImagesForExport, generateDefaultFileName } from '../scripts/export-utils.js';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['close', 'export-complete']);

// 响应式数据
const images = ref([]);
const fileName = ref('');
const isExporting = ref(false);

// 计算属性
const selectedCount = computed(() => {
  return images.value.filter(img => img.selected).length;
});

const compressedCount = computed(() => {
  return images.value.filter(img => img.selected && img.compression.enabled).length;
});

const originalCount = computed(() => {
  return images.value.filter(img => img.selected && !img.compression.enabled).length;
});

const estimatedFileSize = computed(() => {
  let totalSize = 0;
  images.value.forEach(img => {
    if (img.selected) {
      if (img.compression.enabled) {
        // 估算压缩后大小
        const { width, height } = img.compression.resolution;
        const originalPixels = img.originalWidth * img.originalHeight;
        const compressedPixels = width * height;
        const compressionRatio = compressedPixels / originalPixels;
        totalSize += Math.round(img.originalSize * compressionRatio);
      } else {
        totalSize += img.originalSize;
      }
    }
  });
  
  return formatFileSize(totalSize);
});

// 方法
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const loadImages = async () => {
  try {
    images.value = await getImagesForExport();
    updateDefaultFileName();
  } catch (error) {
    console.error('加载图片列表失败:', error);
    images.value = [];
  }
};

const updateDefaultFileName = () => {
  fileName.value = generateDefaultFileName(images.value);
};

const updateImages = (newImages) => {
  images.value = newImages;
  updateDefaultFileName();
};

const handleExport = async () => {
  if (selectedCount.value === 0) {
    alert('请至少选择一张图片');
    return;
  }
  
  isExporting.value = true;
  
  try {
    // 调用导出函数
    await exportSelectedImages(images.value, fileName.value);
    emit('export-complete');
    handleCancel();
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + error.message);
  } finally {
    isExporting.value = false;
  }
};

const handleCancel = () => {
  emit('close');
};

const handleOverlayClick = () => {
  handleCancel();
};

// 生命周期
onMounted(() => {
  if (props.visible) {
    loadImages();
  }
});

// 监听visible变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    loadImages();
  }
});
</script>

<style scoped>
.export-dialog-overlay {
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

.export-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.dialog-header h3 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.section {
  margin-bottom: 24px;
}

.section h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.export-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

.file-settings {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.file-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.file-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.file-preview {
  font-size: 12px;
  color: #666;
  font-style: italic;
  margin-top: 4px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
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