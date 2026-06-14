export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const chatWithLlm = async (messages: LlmMessage[]) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (response.status === 501) {
    throw new Error('LLM_API_KEY is not configured. The demo will fall back to local rules.');
  }

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.content || '';
};
