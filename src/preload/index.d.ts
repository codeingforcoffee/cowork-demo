import { ElectronAPI } from '@electron-toolkit/preload';

interface FileInfo {
  content: string;
  name: string;
  size: number;
}

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

interface AppSettings {
  llm: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
}

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: { name: string; path: string; content: string }[];
  timestamp: number;
  isToolCall?: boolean;
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
}

interface StoredSession {
  id: string;
  title: string;
  messages: StoredMessage[];
  enabledMcpIds: string[];
  expertId?: string;
  createdAt: number;
  updatedAt: number;
}

interface SessionsData {
  sessions: StoredSession[];
  lastActiveSessionId?: string;
}

interface McpServer {
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

interface McpData {
  userServers: McpServer[];
}

interface Expert {
  id: string;
  name: string;
  description: string;
  mcpIds: string[];
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

interface ExpertsData {
  experts: Expert[];
}

interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface ToolResultInfo {
  id: string;
  name: string;
  result: string;
}

interface AppAPI {
  // App
  getAppVersion: () => Promise<string>;
  getSystemInfo: () => Promise<{ platform: string; arch: string; nodeVersion: string }>;
  openExternalUrl: (url: string) => Promise<void>;
  getSystemMemory: () => Promise<{ total: number; free: number }>;

  // Settings
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;

  // Sessions
  loadSessions: () => Promise<SessionsData>;
  saveSessions: (data: SessionsData) => Promise<boolean>;

  // MCP
  loadBuiltinMcps: () => Promise<McpServer[]>;
  loadUserMcps: () => Promise<McpData>;
  saveUserMcps: (data: McpData) => Promise<boolean>;

  // Experts
  loadExperts: () => Promise<ExpertsData>;
  saveExperts: (data: ExpertsData) => Promise<boolean>;

  // File operations
  pickFile: () => Promise<string | null>;
  pickFolder: () => Promise<string | null>;
  readFile: (path: string) => Promise<FileInfo>;
  listDir: (path: string) => Promise<FileEntry[]>;
  writeFile: (path: string, content: string) => Promise<boolean>;

  // Shell execution (cross-platform)
  execShell: (
    command: string,
    cwd?: string
  ) => Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }>;

  // LLM streaming
  sendChat: (
    messages: { role: string; content: string | null; tool_call_id?: string }[],
    enabledMcpIds?: string[]
  ) => Promise<void>;
  abortChat: () => Promise<void>;
  onLLMChunk: (callback: (chunk: string) => void) => () => void;
  onLLMDone: (callback: () => void) => () => void;
  onLLMError: (callback: (error: string) => void) => () => void;
  onLLMToolCall: (callback: (info: ToolCallInfo) => void) => () => void;
  onLLMToolResult: (callback: (info: ToolResultInfo) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: AppAPI;
  }
}
