import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { MAIN, RENDERER } from '@cowork/shared';

const api = {
  // App (for AboutView, McpView)
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(MAIN.APP.GET_VERSION),
  getSystemInfo: (): Promise<{ platform: string; arch: string; nodeVersion: string }> =>
    ipcRenderer.invoke(MAIN.APP.GET_SYSTEM_INFO),
  openExternalUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke(MAIN.APP.OPEN_EXTERNAL_URL, url),
  getSystemMemory: (): Promise<{ total: number; free: number }> =>
    ipcRenderer.invoke(MAIN.APP.GET_SYSTEM_MEMORY),

  // Settings
  loadSettings: (): Promise<unknown> => ipcRenderer.invoke(MAIN.SETTINGS.LOAD),
  saveSettings: (settings: unknown): Promise<boolean> =>
    ipcRenderer.invoke(MAIN.SETTINGS.SAVE, settings),

  // Sessions
  loadSessions: (): Promise<unknown> => ipcRenderer.invoke(MAIN.SESSIONS.LOAD),
  saveSessions: (data: unknown): Promise<boolean> => ipcRenderer.invoke(MAIN.SESSIONS.SAVE, data),

  // MCP
  loadBuiltinMcps: (): Promise<unknown> => ipcRenderer.invoke(MAIN.MCP.LOAD_BUILTIN),
  loadUserMcps: (): Promise<unknown> => ipcRenderer.invoke(MAIN.MCP.LOAD_USER),
  saveUserMcps: (data: unknown): Promise<boolean> => ipcRenderer.invoke(MAIN.MCP.SAVE_USER, data),

  // Experts
  loadExperts: (): Promise<unknown> => ipcRenderer.invoke(MAIN.EXPERTS.LOAD),
  saveExperts: (data: unknown): Promise<boolean> => ipcRenderer.invoke(MAIN.EXPERTS.SAVE, data),

  // Skills
  loadSkills: (): Promise<unknown> => ipcRenderer.invoke(MAIN.SKILLS.LOAD),
  saveSkills: (data: unknown): Promise<boolean> => ipcRenderer.invoke(MAIN.SKILLS.SAVE, data),

  // File operations
  pickFile: (): Promise<string | null> => ipcRenderer.invoke(MAIN.FILE.PICK),
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke(MAIN.FILE.PICK_FOLDER),
  readFile: (path: string): Promise<{ content: string; name: string; size: number }> =>
    ipcRenderer.invoke(MAIN.FILE.READ, path),
  listDir: (
    path: string
  ): Promise<{ name: string; path: string; isDirectory: boolean; size: number }[]> =>
    ipcRenderer.invoke(MAIN.FILE.LIST_DIR, path),
  writeFile: (path: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke(MAIN.FILE.WRITE, path, content),

  // Shell execution (cross-platform)
  execShell: (
    command: string,
    cwd?: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }> =>
    ipcRenderer.invoke(MAIN.SHELL.EXEC, command, cwd),

  // LLM (streaming) with tool support
  sendChat: (
    messages: { role: string; content: string | null; tool_call_id?: string }[],
    enabledMcpIds: string[] = []
  ): Promise<void> => ipcRenderer.invoke(MAIN.LLM.CHAT, messages, enabledMcpIds),
  abortChat: (): Promise<void> => ipcRenderer.invoke(MAIN.LLM.ABORT),

  // LLM event listeners
  onLLMChunk: (callback: (chunk: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: string): void => callback(chunk);
    ipcRenderer.on(RENDERER.LLM.CHUNK, handler);
    return () => ipcRenderer.removeListener(RENDERER.LLM.CHUNK, handler);
  },
  onLLMDone: (callback: () => void) => {
    const handler = (): void => callback();
    ipcRenderer.on(RENDERER.LLM.DONE, handler);
    return () => ipcRenderer.removeListener(RENDERER.LLM.DONE, handler);
  },
  onLLMError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string): void => callback(error);
    ipcRenderer.on(RENDERER.LLM.ERROR, handler);
    return () => ipcRenderer.removeListener(RENDERER.LLM.ERROR, handler);
  },
  onLLMToolCall: (
    callback: (info: { id: string; name: string; args: Record<string, unknown> }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      info: { id: string; name: string; args: Record<string, unknown> }
    ): void => callback(info);
    ipcRenderer.on(RENDERER.LLM.TOOL_CALL, handler);
    return () => ipcRenderer.removeListener(RENDERER.LLM.TOOL_CALL, handler);
  },
  onLLMToolResult: (callback: (info: { id: string; name: string; result: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      info: { id: string; name: string; result: string }
    ): void => callback(info);
    ipcRenderer.on(RENDERER.LLM.TOOL_RESULT, handler);
    return () => ipcRenderer.removeListener(RENDERER.LLM.TOOL_RESULT, handler);
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
