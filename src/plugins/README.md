# 全景查看器单文件打包插件

## 概述

`vite-plugin-panoviewer-singlefile` 是一个专门为全景查看器项目设计的 Vite 插件，用于将应用打包成完全自包含的单个 HTML 文件。

## 功能特性

- ✅ **资源内联**: 将所有 CSS 和 JS 资源内联到 HTML 中
- ✅ **Pannellum库内联**: 自动内联本地的 Pannellum CSS 和 JS 文件
- ✅ **全局函数暴露**: 自动暴露下载函数到全局作用域
- ✅ **完全自包含**: 生成无外部依赖的单个 HTML 文件
- ✅ **可配置**: 支持多种配置选项
- ✅ **详细日志**: 提供详细的构建过程日志

## 安装

插件已包含在项目中，无需额外安装。

## 基本使用

### 1. 简单配置

```javascript
import { defineConfig } from 'vite';
import { panoviewerSinglefile } from './src/plugins/vite-plugin-panoviewer-singlefile.js';

export default defineConfig({
  plugins: [
    panoviewerSinglefile()
  ]
});
```

### 2. 高级配置

```javascript
import { defineConfig } from 'vite';
import { createPanoviewerSinglefilePlugin } from './src/plugins/vite-plugin-panoviewer-singlefile.js';

export default defineConfig({
  plugins: [
    createPanoviewerSinglefilePlugin({
      // 自定义Pannellum库路径
      pannellumCssPath: 'pannellum.css',
      pannellumJsPath: 'pannellum.js',
      
      // 输出目录
      outputDir: 'dist',
      
      // 是否删除内联后的文件
      deleteInlinedFiles: true,
      
      // 自定义全局函数生成器
      globalFunctions: () => `
        window.downloadPage = function() {
          // 自定义下载逻辑
        };
      `
    })
  ]
});
```

## 配置选项

### `createPanoviewerSinglefilePlugin(options)`

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `pannellumCssPath` | `string` | `'pannellum.css'` | Pannellum CSS 文件路径 |
| `pannellumJsPath` | `string` | `'pannellum.js'` | Pannellum JS 文件路径 |
| `outputDir` | `string` | `'dist'` | 输出目录 |
| `deleteInlinedFiles` | `boolean` | `true` | 是否删除内联后的文件 |
| `globalFunctions` | `Function` | `createDefaultGlobalFunctions` | 全局函数生成器 |

## 构建模式

### 开发模式
```bash
pnpm dev
```

### 生产模式（分离文件）
```bash
pnpm build
```

### 单文件模式
```bash
pnpm build:single
```

## 输出结果

单文件模式会生成一个完全自包含的 HTML 文件：

```
dist/
└── index.html  # 完全自包含的HTML文件（约74KB）
```

## 与 vite-plugin-singlefile 的对比

| 特性 | 我们的插件 | vite-plugin-singlefile |
|------|------------|------------------------|
| **Pannellum库内联** | ✅ 专门支持 | ❌ 需要额外配置 |
| **全局函数暴露** | ✅ 自动处理 | ❌ 需要手动处理 |
| **项目特定优化** | ✅ 针对全景查看器 | ❌ 通用插件 |
| **配置复杂度** | ✅ 简单易用 | ⚠️ 需要更多配置 |
| **功能完整性** | ✅ 开箱即用 | ⚠️ 需要额外开发 |

## 技术实现

### 核心原理

1. **构建配置优化**: 自动设置 Vite 构建选项以支持资源内联
2. **资源分类处理**: 将构建产物按类型分类（HTML、CSS、JS、其他）
3. **正则替换内联**: 使用正则表达式替换外部引用为内联内容
4. **特殊字符处理**: 正确处理 HTML 中的特殊字符转义
5. **文件清理**: 内联后删除不需要的文件

### 关键函数

- `replaceCss()`: CSS 链接替换为内联样式
- `replaceScript()`: JS 脚本替换为内联代码
- `inlinePannellumLibraries()`: Pannellum 库文件内联
- `addGlobalFunctions()`: 全局函数添加

## 注意事项

1. **文件大小**: 单文件模式生成的文件较大（约74KB），但功能完整
2. **浏览器兼容性**: 生成的单文件支持现代浏览器
3. **Pannellum版本**: 确保 Pannellum 库文件版本兼容
4. **构建时间**: 单文件构建时间较长，属于正常现象

## 故障排除

### 常见问题

1. **Pannellum库内联失败**
   - 检查 `pannellum.css` 和 `pannellum.js` 文件是否存在
   - 确认文件路径配置正确

2. **全局函数不工作**
   - 检查 HTML 中是否有正确的 `onclick` 调用
   - 确认函数名称匹配

3. **构建失败**
   - 检查 Vite 配置是否正确
   - 确认所有依赖都已安装

## 更新日志

### v1.0.0
- 初始版本
- 支持基本的资源内联功能
- 支持 Pannellum 库内联
- 支持全局函数暴露

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

本插件在开发过程中借鉴了以下开源项目的优秀设计理念和实现方案：

### 主要借鉴项目

#### 1. vite-plugin-singlefile
- **作者**: Richard Tallent
- **许可证**: MIT License
- **仓库**: https://github.com/richardtallent/vite-plugin-singlefile
- **借鉴内容**:
  - 整体插件架构设计
  - `generateBundle` 钩子的使用方式
  - 资源内联的核心算法
  - 正则表达式替换策略
  - 构建配置优化方案

#### 2. Vite
- **作者**: Evan You
- **许可证**: MIT License
- **仓库**: https://github.com/vitejs/vite
- **借鉴内容**:
  - 插件系统设计
  - Rollup 集成方案
  - 构建配置结构

#### 3. Pannellum
- **作者**: Matthew Petroff
- **许可证**: MIT License
- **仓库**: https://github.com/mpetroff/pannellum
- **借鉴内容**:
  - 全景查看器核心功能
  - 库文件集成方案

### 创新点

本插件在借鉴上述项目优秀设计的基础上，针对全景查看器项目的特定需求进行了定制化开发：

- ✅ **Pannellum库专门内联**: 自动内联本地的 Pannellum CSS 和 JS 文件
- ✅ **全局函数自动暴露**: 自动暴露下载函数到全局作用域
- ✅ **项目特定优化**: 针对全景查看器项目的专门优化
- ✅ **简化配置**: 开箱即用，无需复杂配置

感谢所有开源项目的贡献者，正是你们的无私奉献推动了整个开源生态的发展。 