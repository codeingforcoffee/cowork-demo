import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface McpServer {
  id: string;
  name: string;
  description: string;
  type: 'builtin' | 'stdio' | 'sse';
  builtinId?: string;
  command?: string;
  args?: string[];
  url?: string;
  config?: Record<string, string>;
}

export const useMcpStore = defineStore('mcp', () => {
  const builtinServers = ref<McpServer[]>([]);
  const userServers = ref<McpServer[]>([]);
  const initialized = ref(false);

  const allServers = computed<McpServer[]>(() => [...builtinServers.value, ...userServers.value]);

  async function init(): Promise<void> {
    if (initialized.value) return;
    try {
      const builtins = await window.api.loadBuiltinMcps();
      builtinServers.value = builtins;

      const userData = await window.api.loadUserMcps();
      userServers.value = userData.userServers || [];
    } catch {
      builtinServers.value = [];
      userServers.value = [];
    }
    initialized.value = true;
  }

  async function addUserServer(server: Omit<McpServer, 'id'>): Promise<void> {
    const newServer: McpServer = {
      ...server,
      id: `user-${crypto.randomUUID()}`
    };
    userServers.value.push(newServer);
    await saveUserServers();
  }

  async function updateUserServer(id: string, updates: Partial<McpServer>): Promise<void> {
    const idx = userServers.value.findIndex((s) => s.id === id);
    if (idx !== -1) {
      userServers.value[idx] = { ...userServers.value[idx], ...updates };
      await saveUserServers();
    }
  }

  async function removeUserServer(id: string): Promise<void> {
    const idx = userServers.value.findIndex((s) => s.id === id);
    if (idx !== -1) {
      userServers.value.splice(idx, 1);
      await saveUserServers();
    }
  }

  async function saveUserServers(): Promise<void> {
    // Vue Proxy 无法通过 IPC 克隆，需先序列化为纯对象
    await window.api.saveUserMcps(JSON.parse(JSON.stringify({ userServers: userServers.value })));
  }

  function getServerById(id: string): McpServer | undefined {
    return allServers.value.find((s) => s.id === id);
  }

  return {
    builtinServers,
    userServers,
    allServers,
    initialized,
    init,
    addUserServer,
    updateUserServer,
    removeUserServer,
    getServerById
  };
});
