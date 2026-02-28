import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

const api = {
  // Settings
  loadSettings: (): Promise<unknown> => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: unknown): Promise<boolean> =>
    ipcRenderer.invoke('settings:save', settings),

  // Sessions
  loadSessions: (): Promise<unknown> => ipcRenderer.invoke('sessions:load'),
  saveSessions: (data: unknown): Promise<boolean> => ipcRenderer.invoke('sessions:save', data),

  // MCP
  loadBuiltinMcps: (): Promise<unknown> => ipcRenderer.invoke('mcp:load-builtin'),
  loadUserMcps: (): Promise<unknown> => ipcRenderer.invoke('mcp:load-user'),
  saveUserMcps: (data: unknown): Promise<boolean> => ipcRenderer.invoke('mcp:save-user', data),

  // Experts
  loadExperts: (): Promise<unknown> => ipcRenderer.invoke('experts:load'),
  saveExperts: (data: unknown): Promise<boolean> => ipcRenderer.invoke('experts:save', data),

  // File operations
  pickFile: (): Promise<string | null> => ipcRenderer.invoke('file:pick'),
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke('file:pick-folder'),
  readFile: (path: string): Promise<{ content: string; name: string; size: number }> =>
    ipcRenderer.invoke('file:read', path),
  listDir: (
    path: string
  ): Promise<{ name: string; path: string; isDirectory: boolean; size: number }[]> =>
    ipcRenderer.invoke('file:list-dir', path),
  writeFile: (path: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('file:write', path, content),

  // LLM (streaming) with tool support
  sendChat: (
    messages: { role: string; content: string | null; tool_call_id?: string }[],
    enabledMcpIds: string[] = []
  ): Promise<void> => ipcRenderer.invoke('llm:chat', messages, enabledMcpIds),
  abortChat: (): Promise<void> => ipcRenderer.invoke('llm:abort'),

  // LLM event listeners
  onLLMChunk: (callback: (chunk: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: string): void => callback(chunk);
    ipcRenderer.on('llm:chunk', handler);
    return () => ipcRenderer.removeListener('llm:chunk', handler);
  },
  onLLMDone: (callback: () => void) => {
    const handler = (): void => callback();
    ipcRenderer.on('llm:done', handler);
    return () => ipcRenderer.removeListener('llm:done', handler);
  },
  onLLMError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string): void => callback(error);
    ipcRenderer.on('llm:error', handler);
    return () => ipcRenderer.removeListener('llm:error', handler);
  },
  onLLMToolCall: (
    callback: (info: { id: string; name: string; args: Record<string, unknown> }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      info: { id: string; name: string; args: Record<string, unknown> }
    ): void => callback(info);
    ipcRenderer.on('llm:tool-call', handler);
    return () => ipcRenderer.removeListener('llm:tool-call', handler);
  },
  onLLMToolResult: (callback: (info: { id: string; name: string; result: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      info: { id: string; name: string; result: string }
    ): void => callback(info);
    ipcRenderer.on('llm:tool-result', handler);
    return () => ipcRenderer.removeListener('llm:tool-result', handler);
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
