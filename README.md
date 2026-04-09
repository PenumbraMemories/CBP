
# CBP - 剪切板管理工具

CBP（Clipboard Board Program）是一款基于 Electron + Vue 3 开发的跨平台剪切板管理工具，能够自动记录和管理您的剪切板历史记录，支持文本和图片内容。

## 功能特性

- 📋 自动监控剪切板变化
- 📝 支持文本内容记录
- 🖼️ 支持图片内容记录
- ⭐ 支持收藏重要内容
- 📝 支持为记录添加备注
- 🔍 快速搜索历史记录
- 🎨 现代化的用户界面
- 💾 本地数据存储，保护隐私

## 技术栈

- Electron - 桌面应用框架
- Vue 3 - 前端框架
- Node.js - 后端运行环境

## 数据存储

### Windows 系统

应用数据存储在以下位置：

```
C:\Users\[用户名]\AppData\Roaming\CBP
```

- 文本数据：clips.json
- 图片数据：images

### 数据结构

每条剪切板记录包含以下信息：

- content: 剪切板内容
- timestamp: 记录时间戳
- isFavorite: 是否收藏
- note: 用户备注
- type: 内容类型（text/image）
- imageFilename: 图片文件名（仅图片类型）

## 开发

### 安装依赖

若npm install提示网络环境问题或下载速度较慢，建议先设置镜像环境：

```bash
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```

然后执行安装命令：

```bash
npm install
```

### 开发模式运行

```bash
npm run electron:serve
```

### 构建应用

```bash
npm run electron:build
```

## 使用说明

1. 应用启动后会自动监控剪切板变化
2. 每次剪切板内容变化时，会自动记录新的内容
3. 可以通过界面查看、搜索、收藏和管理历史记录
4. 支持删除单条记录或清空所有记录

## 许可证

见 LICENSE 文件
