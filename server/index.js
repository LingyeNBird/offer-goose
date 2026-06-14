import express from 'express';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const model = process.env.LLM_MODEL || 'gpt-4o-mini';

const openai = process.env.LLM_API_KEY
  ? new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_API_BASE_URL || 'https://api.openai.com/v1',
    })
  : null;

app.use(express.json({ limit: '2mb' }));

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

app.use(express.static(path.resolve(__dirname, '../dist')));
app.get('*', (_request, response) => {
  response.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Offer Goose demo is running on http://localhost:${port}`);
});
