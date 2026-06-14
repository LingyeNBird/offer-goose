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

export const streamWithLlm = async (messages: LlmMessage[], onDelta: (delta: string) => void) => {
  let receivedText = '';
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (response.status === 501) {
    throw new Error('LLM_API_KEY is not configured. The demo will fall back to local rules.');
  }

  if (!response.ok || !response.body) {
    throw new Error(`LLM stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const line = event.split('\n').find((item) => item.startsWith('data: '));
      if (!line) continue;
      const payload = line.replace(/^data: /, '');
      if (payload === '[DONE]') continue;
      const parsed = JSON.parse(payload);
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.delta) {
        receivedText += parsed.delta;
        onDelta(parsed.delta);
      }
    }
  }

  return receivedText;
};
