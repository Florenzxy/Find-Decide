# AI 代理部署教程

本文用于把 Find & Decide 1.0 分享给其他用户。项目不会内置或使用开发者的 API Key，部署者需要接入自己的阿里云百炼 Key。

## 1. 工作方式

生产环境推荐使用下面的请求链路：

```text
浏览器前端 -> /api/ai/chat/completions -> 你的代理服务 -> 阿里云百炼
```

API Key 只放在代理服务器的环境变量 `DASHSCOPE_API_KEY` 中，不放进前端代码、不放进 `VITE_` 变量、不提交到 Git。

仓库已经提供了一个无额外依赖的 Node 生产服务：

```text
server/app.mjs
```

它会同时托管 `dist/` 前端和 AI 代理，因此线上只需要一个服务地址。

## 2. 本地验证

复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

本地开发时可以在 `.env` 中填写自己的 Key：

```env
VITE_DASHSCOPE_API_KEY=你的百炼APIKey
```

然后启动前端：

```powershell
pnpm install
pnpm dev
```

本地 Vite proxy 会把 `/api/ai` 请求转发到阿里云百炼。

## 3. 启动单服务生产版本

先构建前端：

```powershell
pnpm build
```

生产服务不要使用 `VITE_DASHSCOPE_API_KEY`，请在运行服务的服务器上设置：

```env
DASHSCOPE_API_KEY=你的百炼APIKey
PORT=8787
ALLOWED_ORIGIN=https://你的前端域名.example
```

启动线上服务：

```powershell
pnpm start
```

服务会同时提供网页和 `/api/ai` 接口，默认监听 `8787` 端口。托管平台通常需要把 `PORT` 注入的端口直接暴露为公网网址。

如果只想单独运行 AI 代理，也可以使用：

```powershell
pnpm start:ai-proxy
```

## 4. 部署到 Node 托管平台

选择支持 Node.js Web 服务的托管平台，设置：

```text
Build Command: pnpm install --frozen-lockfile && pnpm build
Start Command: pnpm start
```

并在平台的服务环境变量中填写：

```env
DASHSCOPE_API_KEY=用户自己的百炼APIKey
```

部署完成后，平台会提供一个公网 HTTPS 地址，直接把这个地址发给目标用户即可。

服务同时负责前端路由回退，因此刷新 `/applications`、`/resumes` 等页面不会出现 404。

## 5. 前后端分开部署

如果代理不在前端同域名下，在构建前设置公开的代理地址：

```env
VITE_AI_PROXY_URL=https://api.你的域名.example/api/ai
```

这个变量只包含代理地址，不包含任何密钥。跨域部署时，还需要在代理服务器设置：

```env
ALLOWED_ORIGIN=https://你的前端域名.example
```

## 6. 更换其他 OpenAI 兼容模型

当前默认配置是阿里云百炼兼容接口和 `qwen3.7-max`。如果用户使用其他 OpenAI 兼容服务，需要同时调整：

- `src/services/aiService.ts` 中的 `AI_MODEL`
- `server/ai-proxy.mjs` 中的上游域名和路径
- 代理服务器的环境变量命名

不要把第三方 API Key 改成 `VITE_*` 后打进前端包。

## 7. API Key 安全检查

- `.env` 已被 `.gitignore` 忽略。
- `.env.example` 只提供空模板。
- 不要把真实 Key 写入 README、截图、Issue 或提交记录。
- 如果某个 Key 曾经被公开粘贴或上传，请在百炼控制台立即禁用并重新生成。
- 建议给代理服务增加域名限制、访问日志、限流和登录鉴权，避免代理接口被滥用。
