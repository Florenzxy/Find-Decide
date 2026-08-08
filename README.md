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
- 待办工作台
<img width="2022" height="1136" alt="image" src="https://github.com/user-attachments/assets/fdc9d230-7d4a-41f0-8ab5-dd0a8dc6e56a" />

- 建议先前往个人简历库上传简历
<img width="1941" height="1140" alt="image" src="https://github.com/user-attachments/assets/52e1f4bd-7794-4720-ab57-241a2e9b26a9" />
<img width="1680" height="1131" alt="image" src="https://github.com/user-attachments/assets/c72e825b-c16f-48c4-92d7-7b21b5184de3" />

- 求职工作台
<img width="2292" height="1113" alt="image" src="https://github.com/user-attachments/assets/b155aaaf-9c05-495d-80cb-702721694dd6" />
<img width="1650" height="1134" alt="image" src="https://github.com/user-attachments/assets/7db1fbfe-84c6-4ecf-a2ed-571d675c6d5a" />

- 岗位工作台

--ID分析
<img width="1983" height="1137" alt="image" src="https://github.com/user-attachments/assets/1013670c-77b0-4582-9003-8316f91b18e8" />
<img width="1272" height="1014" alt="image" src="https://github.com/user-attachments/assets/d373a215-8c9d-4b5d-b786-6fa15cffa933" />
<img width="1227" height="867" alt="image" src="https://github.com/user-attachments/assets/d9586657-2954-4b5a-936f-aebb85d9917a" />

--简历分析
<img width="2007" height="1131" alt="image" src="https://github.com/user-attachments/assets/8f211acf-f93b-49b9-9e16-cb4807c9f58f" />
<img width="1305" height="855" alt="image" src="https://github.com/user-attachments/assets/2c5d9e63-af84-43dc-b46e-223a16382155" />
<img width="1290" height="1112" alt="image" src="https://github.com/user-attachments/assets/c4495253-faa7-47c5-ae78-bbd1bda2e49f" />

--知识准备
<img width="2049" height="1131" alt="image" src="https://github.com/user-attachments/assets/efac15dc-fc8a-4cdc-840a-b2110ea84e9b" />
<img width="1358" height="849" alt="image" src="https://github.com/user-attachments/assets/b354771d-92ae-43b3-a090-4345afb431d4" />
<img width="1278" height="972" alt="image" src="https://github.com/user-attachments/assets/b4f71462-13fe-4ff4-b3af-9fc4e265dea8" />

--面试复盘
<img width="1311" height="1140" alt="image" src="https://github.com/user-attachments/assets/603832e5-a927-4250-acc0-a22ffbb83356" />
<img width="1218" height="1116" alt="image" src="https://github.com/user-attachments/assets/21ab5f81-ec08-442c-8d27-cb844d40da4e" />

-offer决策助手
<img width="1305" height="1140" alt="image" src="https://github.com/user-attachments/assets/adfa52f8-e7fe-436b-9188-20c499bcf11e" />
<img width="1341" height="1133" alt="image" src="https://github.com/user-attachments/assets/edef0a53-e1ec-4fd5-af9a-434cbb36461c" />
<img width="1290" height="1107" alt="image" src="https://github.com/user-attachments/assets/3257e48b-6c70-40b8-b767-3964336c492e" />

-数据管理
<img width="1313" height="1128" alt="image" src="https://github.com/user-attachments/assets/d59477ba-3a02-4705-98b5-deadaa1fabb2" />
<img width="1305" height="951" alt="image" src="https://github.com/user-attachments/assets/a4c27caa-0056-4ae6-86be-0cc8356beedd" />

## 🚀 快速开始

本项目的本地运行流程为：
**安装环境 → 下载项目 → 安装依赖 → 配置 API Key → 启动开发服务 → 打开浏览器访问**

### 环境要求
- Node.js 18+
- pnpm
 
- 如果你还没有 Node.js，可以先安装 Node.js：https://nodejs.org/
- 安装完成后，打开终端验证：node -v
- 如果还没有 pnpm，可以使用 npm 安装：npm install -g pnpm
- 安装完成后验证：pnpm -v
- 下载项目：点击 Download ZIP-解压压缩包-打开终端，进入解压后的项目文件夹
- 在项目根目录下执行：pnpm install
- 等待依赖安装完成即可

- 配置 API Key
  Linux / macOS：cp .env.example .env
  Windows PowerShell：Copy-Item .env.example .env
  Windows CMD：copy .env.example .env
  然后打开项目根目录下的 .env 文件
  填入你自己的百炼 API Key：VITE_DASHSCOPE_API_KEY=你的百炼APIKey
  获取方式：打开阿里云百炼控制台-登录账号-创建或复制你的 API Key-粘贴到 .env 文件中

- 启动开发服务
  在终端中输入：pnpm dev
  启动后，终端会显示本地地址，例如：Local: http://localhost:5173/
  在浏览器中打开终端显示的地址即可。

- 常见问题
常见问题
1. 提示找不到 pnpm，说明还没有安装 pnpm，执行：npm install -g pnpm，安装后重新打开终端再试。
2. 提示 node -v 不是内部或外部命令，说明 Node.js 没有安装，或者没有正确添加到系统环境变量。重新安装 Node.js，并在安装时勾选添加到 PATH，然后重启终端。
3. 提示端口被占用，如果终端显示：Port 5173 is in use, trying another one...说明默认端口被占用，Vite 会自动切换到其他端口。请以终端实际显示的地址为准，例如：http://localhost:5174/。
4. 浏览器显示无法访问页面，可以尝试：http://127.0.0.1:端口号/，例如：http://127.0.0.1:5173/。也可以检查：运行 pnpm dev 的终端窗口是否关闭，端口号是否和终端显示的一致，防火墙或杀毒软件是否拦截了本地端口，换一个浏览器再试
5. AI 功能无法调用，请检查：项目根目录是否存在 .env 文件，.env 中是否填写了正确的 VITE_DASHSCOPE_API_KEY，API Key 是否有效，百炼账户是否有对应服务权限或额度，终端是否有报错信息。
6. 依赖安装失败：可以尝试清理后重新安装：pnpm install。如果仍然失败，可以删除 node_modules 和锁文件后重试：
   rm -rf node_modules
   rm pnpm-lock.yaml
   pnpm install
   Remove-Item -Recurse -Force node_modules
   Remove-Item pnpm-lock.yaml
   pnpm install

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


