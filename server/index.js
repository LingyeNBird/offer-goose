import express from 'express';
import mammoth from 'mammoth';
import multer from 'multer';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const model = process.env.LLM_MODEL || 'gpt-4o-mini';
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const stateFile = path.join(dataDir, 'state.json');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 5 } });

const openai = process.env.LLM_API_KEY
  ? new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_API_BASE_URL || 'https://api.openai.com/v1',
    })
  : null;

app.use(express.json({ limit: '2mb' }));

const readState = async () => {
  try {
    const content = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
};

const writeState = async (state) => {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
};

app.get('/api/state', async (_request, response) => {
  response.json(await readState());
});

app.post('/api/state', async (request, response) => {
  await writeState(request.body || {});
  response.json({ ok: true });
});

const fallbackAsset = (experience = '', target = '产品策划', stage = '大三') => ({
  title: /小程序|系统|平台|网站|应用/.test(experience) ? '校园产品从 0 到 1 项目经历' : '可迁移能力型校园经历',
  summary: experience.slice(0, 180) || '暂未收集到足够经历。',
  scores: {
    asset: /\d|百|千|万|%|用户|试用|增长/.test(experience) ? 86 : 68,
    match: 82,
    action: /焦虑|担心|迷茫|比不过|害怕|不会/.test(experience) ? 74 : 84,
  },
  abilityTags: [
    /需求|用户|调研|原型|产品/.test(experience) ? '用户洞察' : '经历挖掘',
    /开发|代码|前端|后端|系统|小程序/.test(experience) ? '技术理解' : '表达整理',
    /负责|团队|协作|推进|沟通/.test(experience) ? '协作推进' : '个人复盘',
    /\d|百|千|万|%|用户|试用|增长/.test(experience) ? '结果量化' : '结果补充',
  ],
  starStory: `S/T：在${stage}阶段，围绕${target}相关方向完成一段校园/项目经历。A：你承担了调研、推进、交付或复盘等动作。R：这段经历已具备求职价值，建议继续补充数据、困难和个人贡献。`,
  resumeBullets: [
    `围绕${target}方向完成项目/活动推进，沉淀用户洞察、协作推进和结果复盘能力。`,
    '建议补充用户规模、效率提升、反馈数量或业务结果，让简历表达更可信。',
  ],
  missingInfo: ['补充量化结果', '补充关键困难', '补充个人贡献边界'],
  roleMatches: [
    { name: target, score: 82, reason: '与当前目标方向一致，已有经历可继续包装验证。' },
    { name: '数据分析', score: 68, reason: '如果补齐量化指标，可进一步证明业务分析能力。' },
    { name: '技术研发', score: 62, reason: '如有开发细节，可作为技术理解或工程实践证据。' },
  ],
  careMessage: /焦虑|担心|迷茫|比不过|害怕|不会/.test(experience)
    ? '你现在不是没有价值，而是经历还没有被翻译成招聘语言。先把做过的事整理清楚，掌控感会回来。'
    : '这段经历已经有求职价值，下一步是把角色、行动和结果讲清楚。',
  growthPlan: [
    { label: '今天', title: '补全经历', content: '补充项目结果数据、个人贡献和关键困难。' },
    { label: '本周', title: '产出资产', content: `完成 1 版${target}方向简历 bullet 和 1 段面试讲述稿。` },
    { label: '两周', title: '岗位验证', content: `拆解 3 个腾讯${target}岗位 JD，标出高频能力词。` },
  ],
  nextAction: '先补一个数字结果，并把经历改写成 150 字 STAR 故事。',
});

const extractTextFromFile = async (file) => {
  const fileName = file.originalname || '';
  const mime = file.mimetype || '';

  if (/pdf/i.test(mime) || /\.pdf$/i.test(fileName)) {
    const parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  }

  if (/word|officedocument/i.test(mime) || /\.docx$/i.test(fileName)) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || '';
  }

  if (/text|json|markdown/i.test(mime) || /\.(txt|md|json|csv)$/i.test(fileName)) {
    return file.buffer.toString('utf8');
  }

  return `已收到文件 ${fileName}，当前 Demo 暂不支持该格式正文解析。`;
};

app.post('/api/upload', upload.array('files', 5), async (request, response) => {
  try {
    const files = request.files || [];
    const parsed = await Promise.all(files.map(async (file) => ({
      name: file.originalname,
      size: file.size,
      text: (await extractTextFromFile(file)).slice(0, 12000),
    })));
    response.json({ files: parsed, text: parsed.map((item) => `【${item.name}】\n${item.text}`).join('\n\n') });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'File parse failed' });
  }
});

app.post('/api/analyze', async (request, response) => {
  const { experience = '', target = '产品策划', stage = '大三', focus = 'all' } = request.body || {};

  if (!openai) {
    response.json(fallbackAsset(experience, target, stage));
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是求职鹅，擅长把大学生经历结构化为求职资产。只返回 JSON，不要 Markdown。字段必须包含 title, summary, scores, abilityTags, starStory, resumeBullets, missingInfo, roleMatches, careMessage, growthPlan, nextAction。scores 必须包含 asset, match, action 三个 0-100 的整数；roleMatches 每项含 name, score, reason；growthPlan 每项含 label, title, content。发展建议、情绪陪伴、仪表盘分数都必须由你基于经历生成。',
        },
        {
          role: 'user',
          content: `生成重点：${focus}\n学生阶段：${stage}\n目标方向：${target}\n经历：${experience}`,
        },
      ],
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    response.json(JSON.parse(content));
  } catch (error) {
    response.json(fallbackAsset(experience, target, stage));
  }
});

app.post('/api/chat', async (request, response) => {
  if (!openai) {
    response.status(501).json({ error: 'LLM_API_KEY is not configured' });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: request.body.messages || [],
      temperature: 0.7,
    });

    response.json({ content: completion.choices[0]?.message?.content || '' });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'Unknown LLM error' });
  }
});

app.post('/api/chat/stream', async (request, response) => {
  if (!openai) {
    response.writeHead(501, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'LLM_API_KEY is not configured' }));
    return;
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: request.body.messages || [],
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) response.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    response.write('data: [DONE]\n\n');
    response.end();
  } catch (error) {
    response.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown stream error' })}\n\n`);
    response.end();
  }
});

app.use(express.static(path.resolve(__dirname, '../dist')));
app.get('*', (_request, response) => {
  response.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Offer Goose demo is running on http://localhost:${port}`);
});
