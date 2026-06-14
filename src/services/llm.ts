export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const apiBaseUrl = import.meta.env.VITE_LLM_API_BASE_URL || '';
const apiKey = import.meta.env.VITE_LLM_API_KEY || '';
const model = import.meta.env.VITE_LLM_MODEL || 'gpt-4o-mini';

export const isLlmConfigured = Boolean(apiBaseUrl && apiKey);

export const chatWithLlm = async (messages: LlmMessage[]) => {
  if (!isLlmConfigured) {
    throw new Error('LLM API is not configured. Copy .env.example to .env.local and fill VITE_LLM_API_KEY.');
  }

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
};
