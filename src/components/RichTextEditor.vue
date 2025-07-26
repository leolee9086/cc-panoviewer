<template>
  <div class="rich-text-editor-container">
    <!-- 编辑器工具栏 -->
    <div class="editor-toolbar">
      <button @click="toggleEditor" class="toolbar-btn">
        {{ isEditing ? '保存' : '编辑' }}
      </button>
      <button v-if="isEditing" @click="cancelEdit" class="toolbar-btn">
        取消
      </button>
      <button v-if="isEditing" @click="addAngleLink" class="toolbar-btn angle-link-btn">
        添加角度链接
      </button>
    </div>
    
    <!-- 编辑器容器 -->
    <div v-if="isEditing" class="editor-wrapper">
      <div ref="editorContainer" class="vditor-container"></div>
    </div>
    
    <!-- 显示模式 -->
    <div v-else class="content-display" v-html="displayContent"></div>
    
    <!-- 角度链接对话框 -->
    <div v-if="showAngleLinkDialog" class="angle-link-dialog">
      <div class="dialog-content">
        <h3>添加角度链接</h3>
        <div class="form-group">
          <label>链接文本:</label>
          <input v-model="angleLinkText" type="text" placeholder="输入链接文本">
        </div>
        <div class="form-group">
          <label>目标图片:</label>
          <select v-model="targetImageId">
            <option :value="currentImageId">当前图片</option>
            <option v-for="imageId in imageList" :key="imageId" :value="imageId">
              {{ getImageName(imageId) }}
            </option>
          </select>
        </div>
        <div class="dialog-buttons">
          <button @click="confirmAngleLink" class="btn-primary">确认</button>
          <button @click="cancelAngleLink" class="btn-secondary">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { storage } from '../scripts/storage.js';
import { eventBus } from '../scripts/main.js';
import { getCurrentViewer } from '../scripts/viewer-manager.js';
import { default as Vditor } from 'vditor';
// Props
const props = defineProps({
  currentImageId: {
    type: String,
    default: null
  },
  imageList: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['content-changed']);

// 响应式数据
const isEditing = ref(false);
const editorContainer = ref(null);
const vditor = ref(null);
const showAngleLinkDialog = ref(false);
const angleLinkText = ref('');
const targetImageId = ref('');
// 添加一个响应式触发器，用于强制更新displayContent
const contentUpdateTrigger = ref(0);

// 编辑器配置
const editorConfig = {
  height: 300,
  mode: 'wysiwyg',
  toolbar: [
    'emoji', 'headings', 'bold', 'italic', 'strike', 'link', 
    '|', 'list', 'ordered-list', 'check', 'outdent', 'indent',
    '|', 'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after',
    '|', 'undo', 'redo',
    '|', 'fullscreen', 'edit-mode', 'content-theme', 'code-theme', 'export',
    '|', 'preview'
  ],
  cache: {
    enable: false
  },
  upload: {
    enable: false
  },
  preview: {
    delay: 1000,
    show: false
  }
};

// 初始化编辑器
const initEditor = async () => {
  if (!editorContainer.value) return;
  
  try {
    
    
    vditor.value = new Vditor(editorContainer.value, {
      ...editorConfig,
      after: () => {
        // 编辑器初始化完成后的回调
        loadContent();
      }
    });
  } catch (error) {
    console.error('Vditor初始化失败:', error);
  }
};

// 加载内容
const loadContent = () => {
  if (!vditor.value) return;
  
  const content = storage.getIntroductionContent(props.currentImageId) || '';
  vditor.value.setValue(content);
};

// 保存内容
const saveContent = () => {
  if (!vditor.value) return;
  
  // 保存markdown格式的内容，确保前后一致
  const markdownContent = vditor.value.getValue();
  console.log('保存前的markdown内容:', markdownContent);
  storage.setIntroductionContent(props.currentImageId, markdownContent);
  emit('content-changed', markdownContent);
  
  // 触发displayContent的重新计算
  contentUpdateTrigger.value++;
};

// 切换编辑模式
const toggleEditor = () => {
  if (isEditing.value) {
    saveContent();
  }
  isEditing.value = !isEditing.value;
  
  if (isEditing.value) {
    nextTick(() => {
      initEditor();
    });
  }
};

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  if (vditor.value) {
    vditor.value.destroy();
    vditor.value = null;
  }
};

// 获取viewer实例的辅助函数
const getViewer = () => {
  // 优先使用viewer-manager中的getCurrentViewer
  const viewer = getCurrentViewer();
  if (viewer) {
    return viewer;
  }
  
  // 回退到其他方式获取viewer实例
  if (window.pannellum?.viewer?.getViewer) {
    return window.pannellum.viewer.getViewer('panorama');
  }
  if (window.pannellum?.viewer) {
    return window.pannellum.viewer('panorama');
  }
  // 尝试从全局变量获取
  if (window.pannellumViewer) {
    return window.pannellumViewer;
  }
  return null;
};

// 添加角度链接
const addAngleLink = () => {
  if (!props.currentImageId) {
    alert('请先选择一张图片');
    return;
  }
  
  try {
    // 获取当前视角
    const viewer = getViewer();
    if (!viewer) {
      alert('全景图查看器未初始化');
      return;
    }
    
    // 使用正确的Pannellum API获取当前视角
    const pitch = viewer.getPitch();
    const yaw = viewer.getYaw();
    
    // 显示角度链接对话框
    targetImageId.value = props.currentImageId;
    showAngleLinkDialog.value = true;
  } catch (error) {
    console.error('获取视角失败:', error);
    alert('获取当前视角失败，请确保全景图已正确加载');
  }
};

// 确认添加角度链接
const confirmAngleLink = () => {
  if (!angleLinkText.value.trim()) {
    alert('请输入链接文本');
    return;
  }
  
  try {
    // 获取当前视角
    const viewer = getViewer();
    if (!viewer) {
      alert('全景图查看器未初始化');
      return;
    }
    
    const pitch = viewer.getPitch();
    const yaw = viewer.getYaw();
    
    // 创建角度链接
    const angleLink = {
      id: `link_${Date.now()}`,
      text: angleLinkText.value.trim(),
      pitch: pitch,
      yaw: yaw,
      imageId: props.currentImageId,
      targetImageId: targetImageId.value
    };
    
    // 插入到编辑器
    if (vditor.value) {
      // 在markdown中插入角度链接，使用markdown语法
      // 格式：[链接文本](angle://pitch/yaw/targetImage)
      const markdownLink = `[${angleLink.text}](angle://${pitch}/${yaw}/${targetImageId.value})`;
      vditor.value.insertValue(markdownLink);
    }
    
    // 保存角度链接到存储
    const angleLinks = storage.getAngleLinks(props.currentImageId) || [];
    angleLinks.push(angleLink);
    storage.setAngleLinks(props.currentImageId, angleLinks);
    
    // 重置对话框
    showAngleLinkDialog.value = false;
    angleLinkText.value = '';
  } catch (error) {
    console.error('添加角度链接失败:', error);
    alert('添加角度链接失败，请重试');
  }
};

// 取消角度链接
const cancelAngleLink = () => {
  showAngleLinkDialog.value = false;
  angleLinkText.value = '';
};

// 获取图片名称
const getImageName = (imageId) => {
  const metadata = storage.getImageMetadata(imageId);
  return metadata?.name || imageId;
};

// 显示内容（使用Vditor导出HTML方法生成预览内容）
const displayContent = computed(() => {
  // 依赖contentUpdateTrigger，确保在保存后能重新计算
  contentUpdateTrigger.value;
  
  const markdownContent = storage.getIntroductionContent(props.currentImageId) || '';
  
  // 如果没有内容，直接返回
  if (!markdownContent.trim()) {
    return '';
  }
  
  // 如果有Vditor实例，使用其导出HTML方法
  if (vditor.value) {
    try {
      // 临时设置markdown内容到Vditor，然后导出HTML
      const originalValue = vditor.value.getValue();
      vditor.value.setValue(markdownContent);
      const htmlContent = vditor.value.getHTML();
      // 恢复原始内容
      vditor.value.setValue(originalValue);
      return htmlContent;
    } catch (error) {
      console.error('导出HTML失败:', error);
      // 如果导出失败，返回原始markdown内容
      return markdownContent;
    }
  }
  
  // 如果没有Vditor实例，返回原始markdown内容
  return markdownContent;
});

// 监听图片切换
watch(() => props.currentImageId, (newImageId) => {
  if (isEditing.value && vditor.value) {
    loadContent();
  }
});

// 组件挂载
onMounted(() => {
  // 监听角度链接点击事件
  document.addEventListener('click', handleAngleLinkClick, true); // 使用捕获阶段
});

// 组件卸载
onUnmounted(() => {
  if (vditor.value) {
    vditor.value.destroy();
  }
  document.removeEventListener('click', handleAngleLinkClick, true);
});

// 处理角度链接点击
const handleAngleLinkClick = (event) => {
  // 检查是否是角度链接（通过href协议判断）
  const href = event.target.getAttribute('href');
  if (href && href.startsWith('angle://')) {
    // 立即阻止默认行为和事件冒泡
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // 阻止其他事件监听器
    
    try {
      // 解析自定义协议：angle://pitch/yaw/targetImage
      const parts = href.replace('angle://', '').split('/');
      if (parts.length === 3) {
        const pitch = parseFloat(parts[0]);
        const yaw = parseFloat(parts[1]);
        const targetImage = parts[2];
        
        if (!isNaN(pitch) && !isNaN(yaw)) {
          jumpToAngle({ pitch, yaw, targetImageId: targetImage });
        } else {
          console.error('角度链接参数无效:', { pitch, yaw, targetImage });
        }
      } else {
        console.error('角度链接格式错误:', href);
      }
    } catch (error) {
      console.error('角度链接解析失败:', error);
    }
    
    // 确保返回false，进一步阻止默认行为
    return false;
  }
};

// 跳转到指定角度
const jumpToAngle = (angleLink) => {
  try {
    // 如果目标图片不是当前图片，先切换图片
    if (angleLink.targetImageId && angleLink.targetImageId !== props.currentImageId) {
      eventBus.emit('switch-to-image', angleLink.targetImageId);
    }
    
    // 跳转到指定角度
    const viewer = getViewer();
    if (viewer) {
      // 使用setTimeout确保图片切换完成后再跳转角度
      setTimeout(() => {
        try {
          // 根据Pannellum API，lookAt方法接受pitch、yaw、hfov参数
          // 使用当前的水平视野角度，保持用户当前的缩放级别
          const currentHfov = viewer.getHfov();
          viewer.lookAt(angleLink.pitch, angleLink.yaw, currentHfov);
        } catch (error) {
          console.error('跳转角度失败:', error);
        }
      }, 200); // 增加延迟时间确保图片切换完成
    }
  } catch (error) {
    console.error('角度跳转失败:', error);
  }
};
</script>

<style scoped>
.rich-text-editor-container {
  position: fixed;
    margin-bottom: 20px;
    top: 20px;
    right: 20px;
    width: 500px;
    height: 400px;
}

.editor-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.toolbar-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
}

.toolbar-btn:hover {
  background: #f5f5f5;
}

.angle-link-btn {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.angle-link-btn:hover {
  background: #0056b3;
}

.editor-wrapper {
  border: 1px solid #ddd;
  border-radius: 4px;
}

.vditor-container {
  min-height: 200px;
}

.content-display {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  min-height: 100px;
  line-height: 1.6;
}

.angle-link-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.dialog-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-primary {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary:hover {
  background: #545b62;
}

/* 角度链接样式 */
:deep(a[href^="angle://"]) {
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
}

:deep(a[href^="angle://"]:hover) {
  color: #0056b3;
}
</style> 