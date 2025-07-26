参考项目位于/toread目录
## 📍 全景图视频导出功能定位

根据我的分析，全景图视频导出功能主要分布在以下几个模块：

### 1. **核心视频生成模块**
- `source/UI/pannels/pannoViewer/panoramaToVideo.js` - 主要的视频生成器类
- `source/UI/pannels/pannoViewer/videoEncoderManager.js` - 视频编码管理器
- `source/UI/pannels/pannoViewer/videoMuxer.js` - 视频复用器
- `source/UI/pannels/pannoViewer/tovedioOld.js` - 旧版视频生成器

### 2. **批量导出模块**
- `source/UI/pannels/batchPanoramaExporter/` - 整个批量导出目录
  - `BatchPanoramaExporter.vue` - 批量导出主组件
  - `index.vue` - 批量导出入口
  - `components/` - 批量导出相关子组件
  - `utils/` - 批量导出工具函数

### 3. **全景图预览器中的视频导出功能**
- `source/UI/pannels/pannoViewer/index.vue` - 包含单视频导出功能

### 4. **相关工具和配置**
- `source/UI/pannels/pannoViewer/watermarkUtils.js` - 水印工具
- `source/UI/pannels/pannoViewer/useThree.js` - Three.js工具函数
