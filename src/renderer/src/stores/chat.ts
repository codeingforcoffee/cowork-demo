import { ref } from 'vue';
import { defineStore } from 'pinia';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: { name: string; path: string; content: string }[];
  timestamp: number;
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const isStreaming = ref(false);
  const error = ref<string | null>(null);

  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const message: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    messages.value.push(message);
    return message;
  }

  function appendToLast(chunk: string): void {
    const last = messages.value[messages.value.length - 1];
    if (last && last.role === 'assistant') {
      last.content += chunk;
    }
  }

  function clearMessages(): void {
    messages.value = [];
    error.value = null;
  }

  function buildApiMessages(): { role: string; content: string }[] {
    const result: { role: string; content: string }[] = [];
    result.push({
      role: 'system',
      content:
        'You are a helpful assistant. The user may attach local files; analyze them and answer questions about their contents. Respond in the same language as the user.'
    });
    for (const m of messages.value) {
      let content = m.content;
      if (m.files && m.files.length > 0) {
        const fileContext = m.files
          .map((f) => `--- File: ${f.name} (${f.path}) ---\n${f.content}\n--- End of file ---`)
          .join('\n\n');
        content = `${fileContext}\n\n${content}`;
      }
      result.push({ role: m.role, content });
    }
    return result;
  }

  async function sendMessage(
    content: string,
    files?: { name: string; path: string; content: string }[]
  ): Promise<void> {
    error.value = null;

    addMessage({ role: 'user', content, files });
    addMessage({ role: 'assistant', content: '' });
    isStreaming.value = true;

    const removeChunk = window.api.onLLMChunk((chunk) => {
      appendToLast(chunk);
    });
    const removeDone = window.api.onLLMDone(() => {
      isStreaming.value = false;
      cleanup();
    });
    const removeError = window.api.onLLMError((err) => {
      error.value = err;
      isStreaming.value = false;
      const last = messages.value[messages.value.length - 1];
      if (last && last.role === 'assistant' && !last.content) {
        messages.value.pop();
      }
      cleanup();
    });

    function cleanup(): void {
      removeChunk();
      removeDone();
      removeError();
    }

    try {
      const apiMessages = buildApiMessages().slice(0, -1); // exclude empty assistant
      await window.api.sendChat(apiMessages);
    } catch (err) {
      error.value = String(err);
      isStreaming.value = false;
      cleanup();
    }
  }

  async function abortStream(): Promise<void> {
    await window.api.abortChat();
    isStreaming.value = false;
  }

  return { messages, isStreaming, error, sendMessage, abortStream, clearMessages };
});
