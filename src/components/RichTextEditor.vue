<template>
  <div class="rich-text-editor-container" @click="handleContainerClick">
    <!-- 高度调节手柄 -->
    <div class="resize-handle" @mousedown="startResize"></div>
    
    <!-- 显示模式 - 双击进入编辑 -->
    <div 
      v-if="!isEditing" 
      class="content-display" 
      @dblclick="startEdit"
      :class="{ 'empty-content': !hasContent }"
    >
      <div v-if="!hasContent" class="empty-placeholder">
        双击此处开始编辑
      </div>
      <div v-else v-html="displayContent"></div>
    </div>
    
    <!-- 编辑模式 -->
    <div v-else class="editor-wrapper">
      <div ref="editorContainer" class="vditor-container"></div>
    </div>
    
    <!-- 角度链接对话框 -->
    <div v-if="showAngleLinkDialog" class="angle-link-dialog" @click="handleDialogClick">
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
            <option v-for="imageItem in imageList" :key="imageItem.id" :value="imageItem.id">
              {{ getImageName(imageItem.id) }}
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
const contentUpdateTrigger = ref(0);
const panelHeight = ref(60); // 面板高度，单位vh
const isResizing = ref(false);
const hiddenVditor = ref(null); // 隐藏的Vditor实例用于渲染
const renderedContent = ref(''); // 缓存渲染后的内容
const hiddenVditorReady = ref(false); // 隐藏Vditor是否已准备好

// 检查是否有内容
const hasContent = computed(() => {
  const content = storage.getIntroductionContent(props.currentImageId) || '';
  // 如果内容为空，检查是否需要设置默认内容
  if (!content.trim()) {
    // 设置默认内容
    const defaultContent = `这是一个"自包含"的全景图查看器,简单封装了<a href="https://pannellum.org/">pannellum</a>的接口,你可以使用它自由地查看你的各种全景图,
右键可以下载包含你的全景图的网页内容（可能有点大，这个网页不会压缩你的全景图），你的图片只会存在网页本身中不会被上传到任何地方
代码本身遵循AGPL-3.0-or-later协议,你可以随意再次分发并修改它,只需要保持修改之后的结果仍然遵守同样的协议即可,这段代码脚注本身也是可以编辑的,
你可以改成你自己喜欢的内容。双击就可以开始编辑它了,工具栏最后一个按钮是视角链接功能,在全景图上面右键能够看到导出菜单。`;
    storage.setIntroductionContent(props.currentImageId, defaultContent);
    return true; // 现在有内容了
  }
  return content.trim().length > 0;
});

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
        loadContent();
        // 添加自定义工具栏按钮
        addCustomToolbarButton();
      }
    });
  } catch (error) {
    console.error('Vditor初始化失败:', error);
  }
};

// 初始化隐藏的Vditor实例用于预览渲染
const initHiddenVditor = () => {
  if (hiddenVditor.value) return;
  
  try {
    // 创建一个隐藏的容器
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'absolute';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.top = '-9999px';
    hiddenContainer.style.width = '1px';
    hiddenContainer.style.height = '1px';
    hiddenContainer.style.overflow = 'hidden';
    document.body.appendChild(hiddenContainer);
    
    // 创建隐藏的Vditor实例
    hiddenVditor.value = new Vditor(hiddenContainer, {
      height: 1,
      mode: 'wysiwyg',
      toolbar: [],
      cache: {
        enable: false
      },
      upload: {
        enable: false
      },
      preview: {
        delay: 0,
        show: false
      },
      after: () => {
        // 确保Vditor完全初始化后再触发内容更新
        hiddenVditorReady.value = true;
        contentUpdateTrigger.value++;
      }
    });
  } catch (error) {
    console.error('隐藏Vditor初始化失败:', error);
  }
};

// 添加自定义工具栏按钮
const addCustomToolbarButton = () => {
  if (!vditor.value) return;
  
  // 等待工具栏渲染完成
  setTimeout(() => {
    const toolbar = editorContainer.value.querySelector('.vditor-toolbar');
    if (toolbar) {
      // 检查是否已经添加过按钮
      const existingBtn = toolbar.querySelector('.angle-link-btn');
      if (existingBtn) return;
      
      const angleLinkBtn = document.createElement('button');
      angleLinkBtn.className = 'vditor-toolbar-btn angle-link-btn';
      angleLinkBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9h2v6h-2V5zm0 8h2v2h-2v-2z"/></svg>';
      angleLinkBtn.title = '添加角度链接';
      angleLinkBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        addAngleLink();
      };
      toolbar.appendChild(angleLinkBtn);
    }
  }, 100); // 增加延迟确保工具栏完全渲染
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
  
  const markdownContent = vditor.value.getValue();
  storage.setIntroductionContent(props.currentImageId, markdownContent);
  emit('content-changed', markdownContent);
  contentUpdateTrigger.value++;
};

// 开始编辑
const startEdit = () => {
  isEditing.value = true;
  nextTick(() => {
    initEditor();
  });
};

// 退出编辑
const exitEdit = () => {
  if (isEditing.value) {
    saveContent();
    isEditing.value = false;
    if (vditor.value) {
      vditor.value.destroy();
      vditor.value = null;
    }
  }
};

// 处理容器点击事件
const handleContainerClick = (event) => {
  // 如果正在编辑且点击的是容器外部，则退出编辑
  if (isEditing.value && event.target === event.currentTarget) {
    exitEdit();
  }
};

// 处理全局点击事件
const handleGlobalClick = (event) => {
  if (!isEditing.value) return;
  
  // 检查点击是否在编辑器容器外部
  const editorWrapper = document.querySelector('.editor-wrapper');
  const angleLinkDialog = document.querySelector('.angle-link-dialog');
  
  // 如果点击的是角度链接对话框，不退出编辑
  if (angleLinkDialog && angleLinkDialog.contains(event.target)) {
    return;
  }
  
  if (editorWrapper && !editorWrapper.contains(event.target)) {
    exitEdit();
  }
};

// 开始调整大小
const startResize = (event) => {
  event.preventDefault();
  event.stopPropagation();
  isResizing.value = true;
  
  const startY = event.clientY;
  const startHeight = panelHeight.value;
  
  const handleMouseMove = (e) => {
    if (!isResizing.value) return;
    
    const deltaY = e.clientY - startY;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    const newHeight = Math.max(20, Math.min(80, startHeight + deltaVh));
    panelHeight.value = newHeight;
  };
  
  const handleMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// 获取viewer实例的辅助函数
const getViewer = () => {
  const viewer = getCurrentViewer();
  if (viewer) {
    return viewer;
  }
  
  if (window.pannellum?.viewer?.getViewer) {
    return window.pannellum.viewer.getViewer('panorama');
  }
  if (window.pannellum?.viewer) {
    return window.pannellum.viewer('panorama');
  }
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
    const viewer = getViewer();
    if (!viewer) {
      alert('全景图查看器未初始化');
      return;
    }
    
    const pitch = viewer.getPitch();
    const yaw = viewer.getYaw();
    
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
    const viewer = getViewer();
    if (!viewer) {
      alert('全景图查看器未初始化');
      return;
    }
    
    const pitch = viewer.getPitch();
    const yaw = viewer.getYaw();
    
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

// 处理对话框点击事件
const handleDialogClick = (event) => {
  // 阻止事件冒泡，防止触发外部点击事件
  event.stopPropagation();
  event.stopImmediatePropagation();
};

// 获取图片名称
const getImageName = (imageId) => {
  const metadata = storage.getImageMetadata(imageId);
  return metadata?.name || imageId;
};

// 安全地渲染Markdown内容为HTML
const renderMarkdownSafely = (markdownContent, vditorInstance) => {
  if (!vditorInstance || !vditorInstance.getValue || !vditorInstance.setValue || !vditorInstance.getHTML) {
    return markdownContent;
  }
  
  try {
    const originalValue = vditorInstance.getValue();
    vditorInstance.setValue(markdownContent);
    const htmlContent = vditorInstance.getHTML();
    vditorInstance.setValue(originalValue);
    return htmlContent;
  } catch (error) {
    console.error('Vditor渲染失败:', error);
    return markdownContent;
  }
};

// 显示内容
const displayContent = computed(() => {
  contentUpdateTrigger.value;
  
  const markdownContent = storage.getIntroductionContent(props.currentImageId) || '';
  
  if (!markdownContent.trim()) {
    return '';
  }
  
  // 如果编辑器已初始化，使用编辑器的HTML渲染功能
  if (vditor.value) {
    return renderMarkdownSafely(markdownContent, vditor.value);
  }
  
  // 如果编辑器未初始化，使用隐藏的Vditor实例来渲染
  if (hiddenVditor.value && hiddenVditorReady.value) {
    return renderMarkdownSafely(markdownContent, hiddenVditor.value);
  }
  
  // 如果隐藏Vditor也没有初始化，返回原始markdown
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
  document.addEventListener('click', handleAngleLinkClick, true);
  document.addEventListener('click', handleGlobalClick, true);
  
  // 初始化隐藏的Vditor实例用于预览渲染
  nextTick(() => {
    initHiddenVditor();
  });
});

// 组件卸载
onUnmounted(() => {
  if (vditor.value) {
    vditor.value.destroy();
  }
  if (hiddenVditor.value) {
    try {
      hiddenVditor.value.destroy();
      // 清理隐藏容器
      const hiddenContainer = hiddenVditor.value.element?.parentElement;
      if (hiddenContainer && hiddenContainer.parentElement) {
        hiddenContainer.parentElement.removeChild(hiddenContainer);
      }
    } catch (error) {
      console.error('清理隐藏Vditor失败:', error);
    }
  }
  hiddenVditorReady.value = false;
  document.removeEventListener('click', handleAngleLinkClick, true);
  document.removeEventListener('click', handleGlobalClick, true);
});

// 处理角度链接点击
const handleAngleLinkClick = (event) => {
  const href = event.target.getAttribute('href');
  if (href && href.startsWith('angle://')) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    try {
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
    
    return false;
  }
};

// 跳转到指定角度
const jumpToAngle = (angleLink) => {
  try {
    if (angleLink.targetImageId && angleLink.targetImageId !== props.currentImageId) {
      eventBus.emit('switch-to-image', angleLink.targetImageId);
    }
    
    const viewer = getViewer();
    if (viewer) {
      setTimeout(() => {
        try {
          const currentHfov = viewer.getHfov();
          viewer.lookAt(angleLink.pitch, angleLink.yaw, currentHfov);
        } catch (error) {
          console.error('跳转角度失败:', error);
        }
      }, 200);
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
  width: 30vw;
  height: v-bind(panelHeight + 'vh');
  cursor: text;
  transition: height 0.1s ease;
}

.content-display {
  padding: 20px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.116);
  backdrop-filter: blur(10px);
  min-height: 120px;
  height: calc(100% - 40px);
  width: calc(100% - 40px);
  max-width: 100%;
  line-height: 1.8;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow-y: auto;
}

.content-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

.content-display:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.content-display.empty-content {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-style: italic;
  background: rgba(250, 250, 250, 0.9);
  border: 2px dashed rgba(0, 123, 255, 0.3);
  backdrop-filter: blur(10px);
}

.content-display.empty-content:hover {
  border-color: rgba(0, 123, 255, 0.5);
  background: rgba(250, 250, 250, 0.95);
}
/* 预览模式下图片样式优化 */
.content-display img {
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 8px 0;
  display: block;
  object-fit: contain;
  /* 确保图片不会超出容器 */
  overflow: hidden;
  /* 防止图片被其他样式覆盖 */
  box-sizing: border-box;
}

.content-display img:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

/* 确保预览模式下的内容样式正确 */
.content-display {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.content-display p {
  margin: 8px 0;
  line-height: 1.6;
}

.content-display a {
  color: #007bff;
  text-decoration: none;
  transition: color 0.2s ease;
}

.content-display a:hover {
  color: #0056b3;
  text-decoration: underline;
}

/* 强制覆盖Vditor和其他可能的样式 */
.content-display img,
.content-display .vditor-content img,
.content-display .vditor-preview img {
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  margin: 8px 0 !important;
  display: block !important;
  object-fit: contain !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  /* 确保图片不会被其他样式影响 */
  position: relative !important;
  z-index: 1 !important;
}

/* 处理通过v-html插入的内容中的图片 - 使用深度选择器 */
:deep(.content-display img) {
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  margin: 8px 0 !important;
  display: block !important;
  object-fit: contain !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  position: relative !important;
  z-index: 1 !important;
}

.content-display img:hover,
.content-display .vditor-content img:hover,
.content-display .vditor-preview img:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-1px) !important;
  transition: all 0.2s ease !important;
}

.empty-placeholder {
  text-align: center;
  color: #666;
  font-size: 16px;
  font-weight: 500;
  position: relative;
  z-index: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 高度调节手柄 */
.resize-handle {
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 16px;
  cursor: ns-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0 0 8px 8px;
  transition: background 0.2s ease;
}

.resize-handle::before {
  content: '';
  width: 40px;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  transition: background 0.2s ease;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.2);
}

.resize-handle:hover::before {
  background: rgba(0, 0, 0, 0.5);
}

.resize-handle:active {
  background: rgba(255, 255, 255, 0.3);
}

.resize-handle:active::before {
  background: rgba(0, 0, 0, 0.7);
}

.editor-wrapper {
  border: 1px solid #007bff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
  height:calc(100% - 16px)!important;
  overflow: hidden;
}

.vditor-container {
  min-height: 200px;
  height:calc(100% - 16px)!important;
}

/* 自定义工具栏按钮样式 */
:deep(.vditor-toolbar-btn) {
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #666;
  transition: color 0.2s ease;
}

:deep(.vditor-toolbar-btn:hover) {
  color: #007bff;
}

:deep(.angle-link-btn) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0 2px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

:deep(.angle-link-btn:hover) {
  background-color: rgba(0, 123, 255, 0.1);
  color: #007bff;
}

:deep(.angle-link-btn svg) {
  width: 16px;
  height: 16px;
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
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
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
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.btn-secondary {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
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
  transition: color 0.2s ease;
}

:deep(a[href^="angle://"]:hover) {
  color: #0056b3;
}

/* 编辑器内容样式优化 */
:deep(.vditor) {
  border: none !important;
}

:deep(.vditor-toolbar) {
  border-bottom: 1px solid #e0e0e0 !important;
  background: #f8f9fa !important;
}

:deep(.vditor-content) {
  background: white !important;
}

</style> 