# 求职鹅 Offer Goose

面向在校大学生的 AI 求职成长陪伴产品 Demo。核心体验是：学生通过对话倾诉或上传个人经历，求职鹅自动整理为求职文档，提供情感陪伴、鹅厂方向建议和下一步成长行动。

## 产品定位

求职鹅不是单纯的岗位匹配工具，而是一个把「普通经历」翻译成「求职资产」的陪伴型智能体。

- 对话采集：像聊天一样输入课程项目、社团、比赛、实习、作品集和求职焦虑。
- 上传经历：支持上传文本类经历文档，Demo 会读取 txt/md/json 内容。
- 自动文档化：生成经历标题、能力标签、STAR 经历稿、简历 Bullet 和待补充信息。
- 情感陪伴：识别焦虑、迷茫、自我否定，先共情，再给可执行小动作。
- 发展建议：根据经历信号推荐技术研发、产品策划、数据分析、游戏策划、运营、体验设计等方向。
- 文档导出：一键导出 Markdown 版「求职鹅成长档案」。

## 评审亮点

- 思辨深度：把招聘前置为学生成长陪伴，解决信息差之外的表达差、自信差和行动差。
- 创意巧思：用「求职鹅」拟人化陪伴，把普通经历翻译成鹅厂岗位语言。
- 功能完整度：对话、上传、经历结构化、文档生成、岗位建议、情绪陪伴、行动计划、导出闭环完整。
- 交互体验：左侧对话与经历输入，右侧实时沉淀资产，避免复杂表单。
- 落地可行性：本地规则无 Key 可跑；配置 LLM 后走 Node 代理，后续可接岗位库、课程库、宣讲会和投递系统。

## 本地运行

```bash
pnpm install
pnpm dev
```

开发模式默认使用本地规则；如果要完整验证后端代理，请先构建再启动：

```bash
pnpm build
pnpm start
```

## 大模型 API 配置

复制 `.env.example` 为 `.env.local` 或在 Docker/服务器中配置环境变量：

```bash
LLM_API_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your_api_key_here
LLM_MODEL=gpt-4o-mini
```

配置入口在 `server/index.js`，前端调用入口在 `src/services/llm.ts`。API Key 只在 Node 代理中读取，不进入浏览器产物。没有配置 Key 时，Demo 会自动回退到本地规则回复。

## 构建

```bash
pnpm build
```

## Docker 部署

```bash
docker build -t offer-goose .
docker run -p 8080:3000 --env-file .env.local offer-goose
```

访问 `http://localhost:8080`。

## 演示脚本

详见 `docs/demo-script.md`。

## 技术栈

- Vue 3
- Vite
- TypeScript
- TDesign Vue Next
- TDesign Chat
- Express Node 代理
- Docker 部署
