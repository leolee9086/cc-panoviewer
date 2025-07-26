# DocumentDB 集成记录

## 开发者要求
```md
# 这个区段由开发者编写,未经允许禁止AI修改
```
开发者要求将 DocumentDB 模块集成到 src/scripts 中的其他模块，提供统一的数据存储功能。

## 集成过程记录

### 2025-07-26 20:07:18 - 第一阶段：基础集成

#### 1. 创建统一存储模块 (`src/scripts/storage.js`)
- ✅ 创建了基于 DocumentDB 的统一存储接口
- ✅ 提供了分类存储方法：`setImage/getImage`、`setConfig/getConfig`、`setFile/getFile`、`setViewer/getViewer`
- ✅ 实现了事务包装器 `withTransaction`
- ✅ 添加了智能缓存管理器 `cacheManager`
- ✅ 实现了数据迁移工具 `migrationTools`
- ✅ 添加了性能监控工具 `performanceMonitor`

#### 2. 更新主入口 (`src/scripts/main.js`)
- ✅ 导入存储模块和迁移工具
- ✅ 添加存储系统初始化函数 `initStorage()`
- ✅ 实现数据迁移：从全局变量和DOM存储迁移到 DocumentDB
- ✅ 设置默认配置项
- ✅ 优先从存储中获取图片数据，兼容原有逻辑

#### 3. 基础测试验证
- ⚠️ 测试发现 DocumentDB 的 `exportDocument` 方法忽略 `pretty` 参数
- ⚠️ 部分自动化测试超时，需要进一步调查

### 2025-07-26 20:30:00 - 第二阶段：模块集成

#### 1. event-handlers.js 集成
- ✅ 导入存储模块
- ✅ 修改 `exportCompressedPage` 函数，优先从存储获取图片数据
- ✅ 添加数据迁移逻辑，自动迁移全局变量和DOM存储
- ✅ 记录导出操作历史
- ✅ 保存压缩版本到缓存
- ✅ 修改 `showResolutionDialog` 函数，保存和恢复用户分辨率设置

#### 2. file-handler.js 集成
- ✅ 导入存储模块
- ✅ 修改 `handleImageFile` 函数，使用事务保存文件数据
- ✅ 保存文件元数据（名称、大小、类型、上传时间）
- ✅ 保存原始图片数据和压缩版本缓存
- ✅ 记录文件上传历史
- ✅ 移除对 DOM script 标签的依赖

#### 3. viewer-manager.js 集成
- ✅ 导入存储模块
- ✅ 修改 `createViewer` 函数，保存查看器配置和状态
- ✅ 修改 `addHotSpot` 函数，保存热点数据
- ✅ 记录查看器创建时间和配置信息

#### 4. pannellum-loader.js 集成
- ✅ 导入存储模块
- ✅ 修改 `isPannellumLoaded` 函数，记录库加载状态
- ✅ 修改 `waitForPannellum` 函数，记录加载错误
- ✅ 修改 `initPannellum` 函数，记录加载性能和初始化状态

#### 5. download-utils.js 集成
- ✅ 导入存储模块
- ✅ 修改 `downloadPage` 函数，记录下载历史
- ✅ 保存下载文件名、大小、时间等信息

## 技术实现细节

### 存储键名规范
- `image.*` - 图片相关数据
- `config.*` - 配置项
- `files.*` - 文件相关数据
- `viewer.*` - 查看器相关数据
- `history.operations` - 操作历史
- `library.*` - 库加载相关数据
- `download.*` - 下载相关数据

### 事务使用场景
- 文件上传时保存元数据和图片数据
- 批量操作时确保数据一致性

### 性能优化
- 历史记录限制为100条，避免内存占用过大
- 使用缓存管理器处理临时数据
- 性能监控记录操作耗时

## 遗留问题
1. 测试中的格式化输出问题 - DocumentDB 的 `exportDocument` 方法不支持真正的格式化
2. 部分自动化测试超时 - 需要检查测试页面是否正确加载

### 2025-07-26 20:40:00 - 全景图视频导出功能实现

#### 功能概述
基于SACAssetsManager项目的全景图视频导出功能，支持将全景图转换为旋转视频。

#### 实现内容
1. **核心导出模块** (`src/scripts/panorama-exporter.js`)
   - ✅ 实现 `PanoramaVideoGenerator` 类
   - ✅ 支持球面轨迹计算和相机位置更新
   - ✅ 实现帧捕获和视频编码（基于WebCodecs API）
   - ✅ 提供进度回调和资源管理

2. **用户界面集成**
   - ✅ 在右键菜单中添加"导出视频"选项
   - ✅ 创建视频导出配置对话框（分辨率、时长、帧率、旋转圈数）
   - ✅ 实现导出进度显示界面
   - ✅ 添加实时预览帧显示

3. **事件处理集成** (`src/scripts/event-handlers.js`)
   - ✅ 导入视频导出模块
   - ✅ 添加视频导出相关函数
   - ✅ 集成到右键菜单事件处理
   - ✅ 实现对话框事件监听

4. **依赖管理**
   - ✅ 添加Three.js依赖到package.json
   - ✅ 配置WebCodecs API支持

#### 技术特点
- 基于WebCodecs API进行视频编码
- 使用Three.js进行3D渲染
- 支持多种分辨率和帧率设置
- 实时进度显示和预览
- 完整的资源管理和错误处理

#### 使用方式
1. 右键点击全景图查看器
2. 选择"导出视频"
3. 配置导出参数（分辨率、时长、帧率、旋转圈数）
4. 点击"开始导出"
5. 等待导出完成，视频自动下载

### 2025-07-26 21:37:20 - 视频导出过曝问题修复

#### 问题分析
视频导出时画面出现过度曝光问题，主要原因是：
1. **渲染器缺少伽马校正设置**：Three.js渲染器默认使用线性颜色空间，但输出到视频时没有正确的伽马校正
2. **纹理加载时缺少颜色空间设置**：纹理加载器没有正确设置颜色空间
3. **渲染目标配置不完整**：缺少正确的颜色空间和伽马校正设置

#### 修复内容
1. **渲染器初始化修复** (`initRenderer` 方法)
   - ✅ 添加 `outputColorSpace = THREE.SRGBColorSpace` 设置
   - ✅ 设置 `toneMapping = THREE.NoToneMapping` 避免色调映射干扰
   - ✅ 设置 `toneMappingExposure = 1.0` 确保正确的曝光值

2. **纹理加载修复** (`setupScene` 方法)
   - ✅ 设置 `texture.colorSpace = THREE.SRGBColorSpace`
   - ✅ 设置 `texture.encoding = THREE.sRGBEncoding` 确保正确的编码

3. **渲染目标配置优化** (`captureFrame` 函数)
   - ✅ 保持 `colorSpace: THREE.SRGBColorSpace` 设置
   - ✅ 添加 `generateMipmaps: false` 优化性能

#### 技术原理
- **sRGB颜色空间**：确保颜色在显示设备上正确显示，避免线性颜色空间的过曝问题
- **伽马校正**：通过正确的颜色空间转换，确保视频输出的亮度符合人眼感知
- **无色调映射**：避免额外的色调处理影响原始颜色

#### 预期效果
- ✅ 修复视频画面过曝问题
- ✅ 保持与原始全景图一致的颜色和亮度
- ✅ 确保视频在不同设备上正确显示

### 2025-07-26 21:41:44 - 视频导出卡顿问题修复

#### 问题分析
通过对比SACAssetsManager项目，发现视频导出卡顿的主要原因：
1. **编码器队列管理不够优化**：队列等待逻辑过于保守，导致处理速度慢
2. **资源释放不够及时**：缺少完善的资源释放机制，导致内存占用过高
3. **批次处理策略可以优化**：批次大小设置不够合理
4. **缺少编码器状态监控**：没有充分利用编码器的状态信息

#### 修复内容
1. **编码器管理优化** (`VideoEncoderManager` 类)
   - ✅ 添加编码器状态监控：`encodingQueue` 和 `isProcessingQueue`
   - ✅ 优化批次大小：根据分辨率动态调整（3000px以上30帧，2000px以上60帧，其他120帧）
   - ✅ 改进队列等待逻辑：`encodeQueueSize > 3` 且等待时间增加到2ms
   - ✅ 增加垃圾回收时间：从10ms增加到20ms

2. **资源释放优化**
   - ✅ 添加多种图像数据类型支持：`HTMLCanvasElement`、`ImageData`、`ImageBitmap`
   - ✅ 及时释放资源：`frame.imageData.close()` 调用
   - ✅ 优化渲染目标配置：禁用不需要的缓冲区

3. **帧捕获优化** (`captureFrame` 函数)
   - ✅ 添加水印支持框架（待实现具体功能）
   - ✅ 优化渲染目标配置：`stencilBuffer: false`、`depthBuffer: true`
   - ✅ 改进错误处理和资源清理

4. **相机轨迹计算优化**
   - ✅ 使用线性插值确保帧的均匀分布
   - ✅ 添加调试信息输出
   - ✅ 优化球面坐标计算，确保定位的确定性

#### 技术原理
- **智能批次处理**：根据分辨率动态调整批次大小，平衡内存使用和处理速度
- **编码器队列管理**：通过监控编码器状态，避免队列积压导致的卡顿
- **资源及时释放**：确保不再需要的资源能够及时释放，减少内存占用
- **确定性计算**：使用线性插值和确定性算法，确保每次运行结果一致

#### 预期效果
- ✅ 显著减少视频导出时的卡顿现象
- ✅ 提高处理速度，特别是高分辨率视频
- ✅ 降低内存占用，提高系统稳定性
- ✅ 保持视频质量和流畅度

#### 参考来源
- SACAssetsManager项目的 `videoEncoderManager.js` 实现
- SACAssetsManager项目的 `useThree.js` 相机控制优化
- SACAssetsManager项目的 `panoramaToVideo.js` 帧处理策略

### 2025-07-26 22:09:23 - 架构重构：数据源统一和临时状态管理

#### 重构背景
发现现有架构存在数据源混乱问题：
1. **临时状态持久化**：`storage.getImage('current')` 作为临时状态被错误地存储到DB
2. **缩略图使用base64**：应该用canvas从DocumentDB数据源绘制
3. **viewer依赖缩略图**：应该直接从DocumentDB获取数据
4. **压缩图存储混乱**：压缩图被错误地持久化到DB

#### 重构目标
- **DocumentDB作为唯一数据源**：只存储原始图片数据和图片编号
- **临时状态仅在内存中**：压缩图、缩略图等临时状态只在内存维护
- **currentImage只存储编号**：不存储图片数据，只存储图片ID
- **按需生成临时数据**：压缩图只在导出时生成，缩略图只在内存中

#### 重构内容

##### 1. storage.js 重构
- ✅ **移除current图片数据存储**：`setImage('current', data)` 改为 `setCurrentImage(imageId)`
- ✅ **添加图片ID管理**：`setImage(imageId, data)` 和 `getImage(imageId)`
- ✅ **添加元数据管理**：`setImageMetadata(imageId, metadata)` 和 `getImageMetadata(imageId)`
- ✅ **更新迁移工具**：迁移时生成唯一ID并存储原图，只保存编号到currentImage

##### 2. file-handler.js 重构
- ✅ **上传时只存原图和编号**：生成唯一ID，存储原图到DB，设置currentImage为ID
- ✅ **缩略图只在内存生成**：`createThumbnail()` 函数生成200x100缩略图，不写入DB
- ✅ **移除压缩图存储**：不再生成多分辨率压缩图并存储到DB
- ✅ **简化预览区显示**：只显示缩略图，移除分辨率选择器

##### 3. main.js 重构
- ✅ **初始化时读取编号**：`storage.getCurrentImage()` 获取当前图片ID
- ✅ **从DB获取原图**：`storage.getImage(currentImageId)` 获取原图数据
- ✅ **内存生成缩略图**：`createThumbnail()` 在内存中生成缩略图
- ✅ **更新预览区**：显示内存中的缩略图

##### 4. event-handlers.js 重构
- ✅ **缩略图点击使用原图**：点击缩略图时从DB获取原图创建viewer
- ✅ **视频导出从DB获取**：`startVideoExport()` 直接从DB获取原图数据
- ✅ **压缩图临时生成**：`exportCompressedPage()` 只在导出时临时生成压缩图
- ✅ **移除临时数据依赖**：所有操作都从DB原图获取数据

#### 新的数据流架构

##### 图片上传流程
1. 生成唯一ID：`img_${timestamp}_${random}`
2. 存储原图：`storage.setImage(imageId, base64data)`
3. 存储元数据：`storage.setImageMetadata(imageId, metadata)`
4. 设置当前图片：`storage.setCurrentImage(imageId)`
5. 内存生成缩略图：`createThumbnail(base64data)`
6. 显示缩略图到预览区

##### 页面初始化流程
1. 获取当前图片ID：`storage.getCurrentImage()`
2. 从DB获取原图：`storage.getImage(currentImageId)`
3. 内存生成缩略图：`createThumbnail(imageData)`
4. 显示缩略图到预览区
5. 创建viewer（使用原图）

##### 缩略图点击流程
1. 获取当前图片ID：`storage.getCurrentImage()`
2. 从DB获取原图：`storage.getImage(currentImageId)`
3. 创建viewer（使用原图）

##### 视频导出流程
1. 获取当前图片ID：`storage.getCurrentImage()`
2. 从DB获取原图：`storage.getImage(currentImageId)`
3. 使用原图进行视频导出

##### 压缩版页面导出流程
1. 获取当前图片ID：`storage.getCurrentImage()`
2. 从DB获取原图：`storage.getImage(currentImageId)`
3. 临时生成压缩图：`compressImage(src, width, height)`
4. 写入导出HTML（不存储到DB）

#### 技术优势
- **数据源统一**：所有图片数据都来自DocumentDB的原始图片
- **临时状态清晰**：压缩图、缩略图等临时状态只在内存中
- **性能优化**：避免重复存储压缩图和缩略图
- **架构简洁**：currentImage只存储编号，逻辑清晰
- **按需生成**：压缩图只在需要时生成，不占用存储空间

#### 解决的问题
- ✅ **下载后页面加载异常**：页面初始化时正确从DB读取原图
- ✅ **视频导出显示没有图片数据**：直接从DB获取原图数据
- ✅ **缩略图切换清晰度问题**：缩略图固定200x100，不切换清晰度
- ✅ **临时状态持久化问题**：所有临时状态都在内存中

## 下一步计划
1. 第三阶段：实现高级功能（撤销/重做、数据导出、性能优化）
2. 第四阶段：文档清理和性能监控
3. 修复测试问题
4. 添加更多单元测试
5. 测试视频导出功能的兼容性和性能

## 注意事项
- 所有存储操作都通过统一的 `storage` 接口
- 保持向后兼容，支持原有的全局变量和DOM存储
- 使用事务确保数据一致性
- 记录操作历史便于调试和用户行为分析
- DocumentDB只存储原始图片数据和图片编号
- 临时状态（压缩图、缩略图）只在内存中维护 