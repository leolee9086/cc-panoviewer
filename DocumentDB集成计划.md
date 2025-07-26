# DocumentDB 集成计划

**创建时间**: 2025-07-26 19:41:18  
**项目**: cc-panoviewer  
**目标**: 将 DocumentDB 模块集成到 src/scripts 中的其他模块，提供数据存储功能

---

## 一、可行性评估

### 1.1 DocumentDB 功能分析
- ✅ **事务支持**: begin/commit/rollback 事务机制
- ✅ **数据类型**: 自动检测 json/base64/string/number/boolean/null
- ✅ **导入导出**: HTML片段或完整文档导出
- ✅ **元数据**: 支持版本、创建时间等元信息
- ✅ **性能优化**: 使用轻量级span元素，display:none避免重绘
- ✅ **DOM集成**: 基于DOM存储，适合浏览器环境

### 1.2 适用场景
- 用户配置和偏好设置持久化
- 插件状态和配置管理
- 临时数据缓存和会话状态
- 文件处理元数据存储
- 查看器配置和热点数据

### 1.3 局限性
- ❌ 不适合大数据量（DOM存储限制）
- ❌ 不适合高频读写操作
- ❌ 不支持复杂查询和索引
- ❌ 依赖DOM环境，不能用于Node.js

---

## 二、模块分析

### 2.1 当前模块结构
```
src/scripts/
├── main.js              # 应用主入口
├── document-db.js       # 数据存储核心模块
├── event-handlers.js    # 事件处理（223行）
├── file-handler.js      # 文件处理（163行）
├── viewer-manager.js    # 查看器管理（29行）
├── pannellum-loader.js  # 库加载器（47行）
├── download-utils.js    # 下载工具（31行）
└── context-menu.js      # 右键菜单（已废弃）
```

### 2.2 各模块存储需求分析

#### 2.2.1 event-handlers.js
**当前状态**: 使用 window.imageData 全局变量存储图片数据
**存储需求**:
- 图片数据缓存（base64格式）
- 导出分辨率设置
- 用户操作历史（撤销/重做）
- 右键菜单配置

**建议集成**:
```javascript
// 存储键名规范
'image.current'           // 当前显示的图片数据
'image.compressed'        // 压缩版本缓存
'export.resolution'       // 导出分辨率设置
'history.operations'      // 操作历史
'ui.contextMenu'          // 右键菜单配置
```

#### 2.2.2 file-handler.js
**当前状态**: 使用 DOM script 标签存储图片数据
**存储需求**:
- 文件上传历史
- 压缩图片缓存
- 文件元数据（大小、类型、上传时间）
- 用户偏好设置

**建议集成**:
```javascript
// 存储键名规范
'files.uploadHistory'     // 上传历史记录
'files.compressedCache'   // 压缩图片缓存
'files.metadata'          // 文件元数据
'preferences.resolution'  // 用户分辨率偏好
```

#### 2.2.3 viewer-manager.js
**当前状态**: 无数据存储，仅创建查看器实例
**存储需求**:
- 查看器配置
- 热点标记数据
- 视图状态（缩放、旋转等）
- 自定义配置模板

**建议集成**:
```javascript
// 存储键名规范
'viewer.config'           // 查看器配置
'viewer.hotspots'         // 热点标记数据
'viewer.state'            // 当前视图状态
'viewer.templates'        // 配置模板
```

#### 2.2.4 pannellum-loader.js
**当前状态**: 无数据存储，仅检查库加载状态
**存储需求**:
- 库加载状态缓存
- 加载错误记录
- 性能监控数据

**建议集成**:
```javascript
// 存储键名规范
'library.loadStatus'      // 库加载状态
'library.errorLog'        // 加载错误记录
'library.performance'     // 性能数据
```

#### 2.2.5 download-utils.js
**当前状态**: 无数据存储，仅提供下载功能
**存储需求**:
- 下载历史记录
- 导出配置
- 文件命名规则

**建议集成**:
```javascript
// 存储键名规范
'download.history'        // 下载历史
'download.config'         // 导出配置
'download.naming'         // 文件命名规则
```

---

## 三、实现方案

### 3.1 架构设计

#### 3.1.1 统一存储实例
```javascript
// src/scripts/storage.js
import { DocumentDB } from './document-db.js';

// 创建统一的存储实例
export const db = new DocumentDB(document, '#cc-panoviewer-db');

// 导出便捷的存储方法
export const storage = {
    // 图片相关
    setImage: (key, data) => db.set(`image.${key}`, data),
    getImage: (key) => db.get(`image.${key}`),
    
    // 配置相关
    setConfig: (key, value) => db.set(`config.${key}`, value),
    getConfig: (key, defaultValue) => db.get(`config.${key}`, defaultValue),
    
    // 历史记录
    addHistory: (action, data) => {
        const history = db.get('history.operations', []);
        history.push({ action, data, timestamp: Date.now() });
        db.set('history.operations', history);
    },
    
    // 事务包装
    withTransaction: async (callback) => {
        const txId = db.beginTransaction();
        try {
            await callback();
            db.commitTransaction(txId);
        } catch (error) {
            db.rollbackTransaction(txId);
            throw error;
        }
    }
};
```

#### 3.1.2 模块集成方式
```javascript
// 各模块集成示例
import { storage } from './storage.js';

// event-handlers.js 集成
export function setupEventListeners() {
    // 加载保存的配置
    const savedResolution = storage.getConfig('export.resolution', '2K');
    
    // 保存用户选择
    function onResolutionSelect(resolution) {
        storage.setConfig('export.resolution', resolution);
        // ... 其他逻辑
    }
}

// file-handler.js 集成
export function handleFileUpload(file) {
    // 保存文件元数据
    const metadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadTime: Date.now()
    };
    
    storage.withTransaction(async () => {
        const history = storage.get('files.uploadHistory', []);
        history.push(metadata);
        storage.set('files.uploadHistory', history);
        storage.set('files.current', metadata);
    });
}
```

### 3.2 数据迁移策略

#### 3.2.1 从全局变量迁移
```javascript
// 迁移 window.imageData 到 DocumentDB
function migrateGlobalData() {
    if (window.imageData && !storage.getImage('current')) {
        storage.setImage('current', window.imageData);
        console.log('已迁移全局图片数据到 DocumentDB');
    }
}
```

#### 3.2.2 从DOM存储迁移
```javascript
// 迁移 script 标签中的数据
function migrateDOMData() {
    const scriptElement = document.querySelector('.images');
    if (scriptElement && scriptElement.textContent.includes('window.imageData')) {
        try {
            const match = scriptElement.textContent.match(/window\.imageData = "([^"]+)"/);
            if (match) {
                const imageData = match[1];
                storage.setImage('current', imageData);
                console.log('已迁移DOM图片数据到 DocumentDB');
            }
        } catch (e) {
            console.warn('DOM数据迁移失败:', e);
        }
    }
}
```

### 3.3 性能优化策略

#### 3.3.1 数据分片存储
```javascript
// 大图片数据分片存储
function storeLargeImage(imageData, maxChunkSize = 1000000) {
    if (imageData.length > maxChunkSize) {
        const chunks = [];
        for (let i = 0; i < imageData.length; i += maxChunkSize) {
            chunks.push(imageData.slice(i, i + maxChunkSize));
        }
        storage.set('image.chunks', chunks);
        storage.set('image.chunkCount', chunks.length);
    } else {
        storage.setImage('current', imageData);
    }
}
```

#### 3.3.2 缓存策略
```javascript
// 智能缓存管理
const cacheManager = {
    set: (key, value, ttl = 3600000) => { // 默认1小时过期
        const item = {
            value,
            timestamp: Date.now(),
            ttl
        };
        storage.set(`cache.${key}`, item);
    },
    
    get: (key) => {
        const item = storage.get(`cache.${key}`);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > item.ttl) {
            storage.delete(`cache.${key}`);
            return null;
        }
        
        return item.value;
    }
};
```

---

## 四、实施计划

### 4.1 第一阶段：基础集成
1. **创建统一存储模块** (`src/scripts/storage.js`)
2. **迁移全局变量** (window.imageData → DocumentDB)
3. **更新 main.js** 初始化存储
4. **基础测试** 验证存储功能

### 4.2 第二阶段：模块集成
1. **event-handlers.js** 集成存储
2. **file-handler.js** 集成存储
3. **viewer-manager.js** 集成存储
4. **功能测试** 验证各模块存储

### 4.3 第三阶段：高级功能
1. **事务支持** 实现撤销/重做
2. **数据导出** 支持配置备份
3. **性能优化** 实现缓存策略
4. **完整测试** 端到端测试

### 4.4 第四阶段：文档和清理
1. **更新 AInote.md** 记录集成过程
2. **清理旧代码** 移除全局变量
3. **性能监控** 添加存储性能指标
4. **用户文档** 说明新功能

---

## 五、风险评估

### 5.1 技术风险
- **数据丢失**: DocumentDB 依赖DOM，页面刷新可能丢失数据
- **性能影响**: 大量数据存储可能影响页面性能
- **兼容性**: 不同浏览器的DOM实现差异

### 5.2 缓解措施
- **数据备份**: 定期导出重要数据
- **大小限制**: 设置存储大小上限
- **降级方案**: 保留原有存储方式作为备选

---

## 六、成功标准

### 6.1 功能标准
- ✅ 所有模块成功集成 DocumentDB
- ✅ 数据持久化正常工作
- ✅ 事务机制正常运行
- ✅ 导入导出功能正常

### 6.2 性能标准
- ✅ 页面加载时间增加 < 100ms
- ✅ 存储操作响应时间 < 50ms
- ✅ 内存使用增加 < 10MB

### 6.3 兼容性标准
- ✅ 支持主流浏览器（Chrome、Firefox、Safari、Edge）
- ✅ 向后兼容现有功能
- ✅ 支持移动端浏览器

---

**下一步行动**: 等待哥哥确认计划后开始实施第一阶段 