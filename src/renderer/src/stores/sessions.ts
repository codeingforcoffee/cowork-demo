import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useExpertsStore } from './experts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: { name: string; path: string; content: string }[];
  timestamp: number;
  // Tool call display info
  toolCallName?: string;
  toolCallArgs?: string;
  toolResultName?: string;
  toolResultContent?: string;
}

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  enabledMcpIds: string[];
  expertId?: string;
  createdAt: number;
  updatedAt: number;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<Session[]>([]);
  const currentSessionId = ref<string | null>(null);
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  const initialized = ref(false);

  const currentSession = computed<Session | undefined>(() =>
    sessions.value.find((s) => s.id === currentSessionId.value)
  );

  const currentMessages = computed<ChatMessage[]>(() => currentSession.value?.messages ?? []);

  const currentEnabledMcpIds = computed<string[]>(() => currentSession.value?.enabledMcpIds ?? []);

  const currentExpertId = computed<string | undefined>(() => currentSession.value?.expertId);

  // Group sessions by date for sidebar display
  const groupedSessions = computed(() => {
    const now = Date.now();
    const oneDayMs = 86400000;
    const today: Session[] = [];
    const yesterday: Session[] = [];
    const thisWeek: Session[] = [];
    const older: Session[] = [];

    const sorted = [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt);

    for (const s of sorted) {
      const diff = now - s.updatedAt;
      if (diff < oneDayMs) {
        today.push(s);
      } else if (diff < 2 * oneDayMs) {
        yesterday.push(s);
      } else if (diff < 7 * oneDayMs) {
        thisWeek.push(s);
      } else {
        older.push(s);
      }
    }

    return { today, yesterday, thisWeek, older };
  });

  async function init(): Promise<void> {
    if (initialized.value) return;
    try {
      const data = await window.api.loadSessions();
      sessions.value = (data.sessions || []).map((s) => ({
        ...s,
        messages: s.messages || [],
        expertId: s.expertId
      }));

      if (
        data.lastActiveSessionId &&
        sessions.value.find((s) => s.id === data.lastActiveSessionId)
      ) {
        currentSessionId.value = data.lastActiveSessionId;
      } else if (sessions.value.length > 0) {
        currentSessionId.value = sessions.value[sessions.value.length - 1].id;
      }

      if (!currentSessionId.value) {
        createSession();
      }
    } catch {
      createSession();
    }
    initialized.value = true;
  }

  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // Vue ref 将对象包装为 Proxy，IPC 结构化克隆无法处理 Proxy，需先序列化为纯对象
      window.api.saveSessions(
        JSON.parse(
          JSON.stringify({
            sessions: sessions.value,
            lastActiveSessionId: currentSessionId.value ?? undefined
          })
        )
      );
    }, 1000);
  }

  function createSession(): Session {
    const session: Session = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      enabledMcpIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    sessions.value.push(session);
    currentSessionId.value = session.id;
    scheduleSave();
    return session;
  }

  function switchSession(id: string): void {
    if (sessions.value.find((s) => s.id === id)) {
      currentSessionId.value = id;
      error.value = null;
      scheduleSave();
    }
  }

  function deleteSession(id: string): void {
    const idx = sessions.value.findIndex((s) => s.id === id);
    if (idx === -1) return;
    sessions.value.splice(idx, 1);
    if (currentSessionId.value === id) {
      if (sessions.value.length > 0) {
        currentSessionId.value = sessions.value[Math.max(0, idx - 1)].id;
      } else {
        createSession();
      }
    }
    scheduleSave();
  }

  function renameSession(id: string, title: string): void {
    const session = sessions.value.find((s) => s.id === id);
    if (session) {
      session.title = title;
      scheduleSave();
    }
  }

  function toggleMcp(mcpId: string): void {
    const session = currentSession.value;
    if (!session) return;
    const idx = session.enabledMcpIds.indexOf(mcpId);
    if (idx === -1) {
      session.enabledMcpIds.push(mcpId);
    } else {
      session.enabledMcpIds.splice(idx, 1);
    }
    scheduleSave();
  }

  function setExpert(expertId: string | undefined): void {
    const session = currentSession.value;
    if (!session) return;
    session.expertId = expertId;
    if (expertId) {
      const expertsStore = useExpertsStore();
      const expert = expertsStore.getExpertById(expertId);
      if (expert) {
        session.enabledMcpIds = [...expert.mcpIds];
      }
    }
    scheduleSave();
  }

  function addMessage(sessionId: string, msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    const message: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    session.messages.push(message);
    session.updatedAt = Date.now();

    // Auto-title from first user message
    if (msg.role === 'user' && session.messages.filter((m) => m.role === 'user').length === 1) {
      const title = msg.content.slice(0, 40).replace(/\n/g, ' ');
      session.title = title || 'New Chat';
    }

    scheduleSave();
    return message;
  }

  function appendToLastMessage(sessionId: string, chunk: string): void {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (!session) return;
    const last = session.messages[session.messages.length - 1];
    if (last && last.role === 'assistant') {
      last.content += chunk;
    }
  }

  function buildApiMessages(
    sessionId: string,
    systemPromptOverride?: string
  ): { role: string; content: string | null; tool_call_id?: string }[] {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (!session) return [];

    const result: { role: string; content: string | null; tool_call_id?: string }[] = [];
    const defaultSystem =
      'You are a helpful assistant. The user may attach local files; analyze them and answer questions about their contents. Respond in the same language as the user.';
    result.push({
      role: 'system',
      content: systemPromptOverride?.trim() || defaultSystem
    });

    for (const m of session.messages) {
      // Skip tool display messages
      if (m.toolCallName || m.toolResultName) continue;

      let content: string = m.content;
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
    const session = currentSession.value;
    if (!session) return;

    error.value = null;

    addMessage(session.id, { role: 'user', content, files });
    addMessage(session.id, { role: 'assistant', content: '' });
    isStreaming.value = true;

    const removeChunk = window.api.onLLMChunk((chunk) => {
      appendToLastMessage(session.id, chunk);
    });

    const removeDone = window.api.onLLMDone(() => {
      isStreaming.value = false;
      scheduleSave();
      cleanup();
    });

    const removeError = window.api.onLLMError((err) => {
      error.value = err;
      isStreaming.value = false;
      const msgs = session.messages;
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant' && !last.content) {
        msgs.pop();
      }
      cleanup();
    });

    const removeToolCall = window.api.onLLMToolCall((info) => {
      // Add a visual indicator message for the tool call
      addMessage(session.id, {
        role: 'assistant',
        content: '',
        toolCallName: info.name,
        toolCallArgs: JSON.stringify(info.args, null, 2)
      });
    });

    const removeToolResult = window.api.onLLMToolResult((info) => {
      // Update last tool call message with the result
      const msgs = session.messages;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].toolCallName === info.name && !msgs[i].toolResultContent) {
          msgs[i].toolResultContent = info.result;
          msgs[i].toolResultName = info.name;
          break;
        }
      }
      // Add a new empty assistant message for the final response
      addMessage(session.id, { role: 'assistant', content: '' });
    });

    function cleanup(): void {
      removeChunk();
      removeDone();
      removeError();
      removeToolCall();
      removeToolResult();
    }

    try {
      const expertsStore = useExpertsStore();
      const expert = session.expertId ? expertsStore.getExpertById(session.expertId) : undefined;
      const systemPrompt = expert?.systemPrompt;
      const mcpIds = expert ? expert.mcpIds : session.enabledMcpIds;
      const apiMessages = buildApiMessages(session.id, systemPrompt);
      // Exclude the last empty assistant placeholder
      const messagesToSend = apiMessages.slice(0, -1);
      await window.api.sendChat(messagesToSend, [...mcpIds]);
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

  function clearCurrentSession(): void {
    const session = currentSession.value;
    if (session) {
      session.messages = [];
      error.value = null;
      scheduleSave();
    }
  }

  return {
    sessions,
    currentSessionId,
    isStreaming,
    error,
    initialized,
    currentSession,
    currentMessages,
    currentEnabledMcpIds,
    currentExpertId,
    groupedSessions,
    init,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    toggleMcp,
    setExpert,
    sendMessage,
    abortStream,
    clearCurrentSession
  };
});
