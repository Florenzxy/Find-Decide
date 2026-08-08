# Find-Decide-AI求职工作台
Find & Decide是一款以本地数据管理为基础、以大模型分析为辅助的个人求职全流程工作台，帮助用户实现从投递记录、JD理解、简历匹配、知识准备、面试复盘到Offer的求职闭环管理工具。
## 🌟 核心功能

*   **🎯 待办工作台**：按日期和优先级管理求职任务。
*   **👜 求职工作台**：管理投递记录、企业性质、岗位状态和面试进度。
*   **🧠 岗位工作台**：包含JD结构化拆解、简历匹配度分析、知识准备清单、面试复盘与AI教练建议。
*   **📄 个人简历库**：保存多个简历版本，并支持关联岗位使用。
*   **⚖️ Offer决策助手**：使用加权决策矩阵比较多个 Offer。
  
## 🛠️ 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Dexie / IndexedDB
- Zustand
- OpenAI 兼容 SDK
- 阿里云百炼 Qwen 模型

## 📸 功能预览


## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 配置 AI

复制环境变量模板：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

本地开发时，在 `.env` 中填入使用者自己的百炼 API Key：

```env
VITE_DASHSCOPE_API_KEY=你的百炼APIKey
```

启动开发服务：

```bash
pnpm dev
```

打开终端中显示的本地地址即可。

## ☁️ 生产部署

项目已经支持单服务部署：同一个 Node 服务同时提供前端页面和 AI 代理。

### 构建

```bash
pnpm build
```

### 启动

生产环境只在服务端配置 API Key：

```env
DASHSCOPE_API_KEY=部署者自己的百炼APIKey
PORT=8787
```

启动服务：

```bash
pnpm start
```

托管平台配置建议：

```text
Build Command: pnpm install --frozen-lockfile && pnpm build
Start Command: pnpm start
Environment Variable: 设置 DASHSCOPE_API_KEY
```
完整部署说明请查看：
[AI 代理部署教程](docs/ai-proxy-deployment.md)

## 💾 数据存储与隐私

用户数据默认保存在浏览器本地 IndexedDB 中，包括：

- 投递记录
- JD 和简历内容
- 知识准备清单
- 面试复盘
- 待办任务
- Offer 决策记录
- AI 分析缓存

不同用户之间不会自动共享本地数据。换浏览器、清理浏览器数据或更换设备前，请在“数据管理”中导出备份。

## 常用命令

```bash
pnpm dev          # 启动开发服务
pnpm build        # 构建生产版本
pnpm start        # 启动生产单服务
pnpm test         # 运行测试
pnpm test:e2e     # 运行端到端测试
```

## 项目结构

```text
src/
  db/              Dexie 数据库与备份逻辑
  pages/           页面
  services/        AI 服务与 Prompt
  store/           Zustand 状态管理
  types/           数据结构与校验
server/
  app.mjs          生产单服务入口
  ai-proxy.mjs     独立 AI 代理入口
  ai-proxy-handler.mjs
docs/
  ai-proxy-deployment.md
```


