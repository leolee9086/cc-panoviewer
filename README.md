# 全景图浏览器 (CC-PanoViewer)

一个自包含的全景图查看器，基于Pannellum库构建，支持单文件下载和分发。

## 特性

- 🖼️ 支持全景图片查看
- 📁 拖拽上传图片文件
- 💾 单文件HTML下载（包含图片数据）
- 🔄 支持HTML文件导入（恢复之前保存的状态）
- 🎯 右键菜单功能
- 📱 响应式设计

## 项目结构

```
cc-panoviewer/
├── src/                    # 源代码目录
│   ├── index.html         # 主HTML文件
│   ├── styles/            # 样式文件
│   │   └── main.css      # 主样式文件
│   └── scripts/          # JavaScript模块
│       ├── main.js       # 主入口文件
│       ├── pannellum-loader.js    # Pannellum加载器
│       ├── event-handlers.js      # 事件处理器
│       ├── viewer-manager.js      # 查看器管理
│       ├── context-menu.js        # 右键菜单
│       └── file-handler.js        # 文件处理
├── dist/                  # 构建输出目录
├── pannellum.css         # Pannellum CSS库
├── pannellum.js          # Pannellum JS库
├── package.json          # 项目配置
├── vite.config.js        # Vite构建配置
└── README.md            # 项目说明
```

## 开发

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建

#### 正常构建（分离文件）
```bash
pnpm build
```

#### 单文件构建（内联所有资源）
```bash
pnpm build:single
```

### 预览构建结果

```bash
pnpm preview
```

## 使用说明

1. **开发模式**: 运行 `pnpm dev` 启动开发服务器
2. **单文件构建**: 运行 `pnpm build:single` 生成包含所有资源的单文件HTML
3. **正常构建**: 运行 `pnpm build` 生成分离的文件结构

## 构建模式说明

### 开发模式
- 文件分离，便于开发和调试
- 支持热重载
- 模块化结构清晰

### 单文件模式（特殊工程化方案）
- 所有 CSS、JS、Pannellum 库文件（pannellum.js、pannellum.css）全部**内联**到最终的 HTML 文件中
- dist 目录下**只保留唯一一个 index.html 文件**，没有任何外部依赖
- 生成的 HTML 文件可直接分发、离线使用，完全自包含
- 构建流程由 `vite.config.js` 中自定义的 `inline-assets` 插件实现，自动：
  - 查找并内联所有构建产物（main.js、main.css）
  - 内联本地的 pannellum.js 和 pannellum.css
  - 移除所有 `<script src=...>` 和 `<link href=...>` 外链标签
  - 构建结束后自动删除 dist 目录下所有非 index.html 文件
- 依赖 [cheerio](https://github.com/cheeriojs/cheerio) 进行 HTML 解析和 DOM 操作，确保内联健壮性

#### 典型单文件构建流程

```bash
pnpm build:single
# dist/index.html 即为最终自包含单文件
```

## 技术栈

- **构建工具**: Vite
- **全景图库**: Pannellum
- **模块化**: ES6 Modules
- **样式**: CSS3

## 许可证

AGPL-3.0-or-later 