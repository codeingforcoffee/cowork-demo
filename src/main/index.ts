import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { MAIN, RENDERER } from '@cowork/shared';
import { join } from 'path';
import os from 'os';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import {
  streamChat,
  abortLLMStream,
  type ChatMessage,
  type ToolDefinition,
  type ToolExecutor
} from './llm';
import {
  pickFile,
  pickFolder,
  readFileContent,
  listDirectory,
  writeFileContent
} from './file-service';
import { loadSettings, saveSettings, type AppSettings } from './settings';
import { loadSessions, saveSessions, type SessionsData } from './sessions-service';
import {
  loadMcpConfig,
  saveMcpConfig,
  executeWebSearch,
  executeSystemInfo,
  BUILTIN_MCPS,
  type McpData,
  type McpServer
} from './mcp-service';
import { loadExperts, saveExperts, type ExpertsData } from './experts-service';
import { loadSkills, saveSkills, type SkillsData } from './skills-service';
import { connectMcpServer, callMcpTool, type McpConnection } from './mcp-client';
import { execShell } from './shell-service';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// 只有需要"动态查询"的工具才走 tool calling（如 web_search）
// 系统信息是确定性读取，改为上下文注入，不依赖模型自主决策
async function buildToolDefinitions(
  enabledMcpIds: string[],
  userServers: McpServer[]
): Promise<{
  tools: ToolDefinition[];
  mcpConnections: McpConnection[];
  toolToMcp: Map<string, McpConnection>;
}> {
  const tools: ToolDefinition[] = [];
  const mcpConnections: McpConnection[] = [];
  const toolToMcp = new Map<string, McpConnection>();

  // 内置工具
  if (enabledMcpIds.includes('builtin-web-search')) {
    tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description:
          'Search the web using DuckDuckGo to find current information, facts, and answers. Use this when you need up-to-date information or when the user asks about current events.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to look up'
            }
          },
          required: ['query']
        }
      }
    });
  }

  // 用户自定义 MCP 服务器
  for (const id of enabledMcpIds) {
    if (id.startsWith('builtin-')) continue;
    const server = userServers.find((s) => s.id === id);
    if (!server) continue;

    const conn = await connectMcpServer(server);
    if (!conn) continue;

    mcpConnections.push(conn);
    for (const t of conn.tools) {
      const def: ToolDefinition = {
        type: 'function',
        function: t.function
      };
      tools.push(def);
      toolToMcp.set(t.function.name, conn);
    }
  }

  return { tools, mcpConnections, toolToMcp };
}

// 将实时系统信息直接注入 system message，不依赖模型是否决定调用工具
function injectSystemInfoIfEnabled(enabledMcpIds: string[], messages: ChatMessage[]): void {
  if (!enabledMcpIds.includes('builtin-system-info')) return;

  const snapshot = executeSystemInfo();
  const sysMsg = messages.find((m) => m.role === 'system');
  if (sysMsg) {
    sysMsg.content =
      sysMsg.content +
      `\n\n## Real-time System Status (captured just now)\n${snapshot}\n\nUse the data above to answer any questions about the user's system performance, memory, or CPU.`;
  }
  console.log('[system-info] Injected system snapshot into system message');
}

function createToolExecutor(toolToMcp: Map<string, McpConnection>): ToolExecutor {
  return async (name, args) => {
    if (name === 'web_search') {
      const query = args['query'] as string;
      return await executeWebSearch(query);
    }
    if (name === 'get_system_info') {
      return executeSystemInfo();
    }
    const mcpConn = toolToMcp.get(name);
    if (mcpConn) {
      return await callMcpTool(mcpConn, name, args);
    }
    return `Unknown tool: ${name}`;
  };
}

function registerIpcHandlers(): void {
  // App info
  ipcMain.handle(MAIN.APP.GET_VERSION, () => app.getVersion());
  ipcMain.handle(MAIN.APP.GET_SYSTEM_INFO, () => ({
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
  }));
  ipcMain.handle(MAIN.APP.OPEN_EXTERNAL_URL, (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
    }
  });
  ipcMain.handle(MAIN.APP.GET_SYSTEM_MEMORY, () => ({
    total: Math.round(os.totalmem() / 1024 / 1024),
    free: Math.round(os.freemem() / 1024 / 1024)
  }));

  // Settings
  ipcMain.handle(MAIN.SETTINGS.LOAD, () => loadSettings());
  ipcMain.handle(MAIN.SETTINGS.SAVE, (_event, settings: AppSettings) => {
    saveSettings(settings);
    return true;
  });

  // Sessions
  ipcMain.handle(MAIN.SESSIONS.LOAD, () => loadSessions());
  ipcMain.handle(MAIN.SESSIONS.SAVE, (_event, data: SessionsData) => {
    saveSessions(data);
    return true;
  });

  // MCP management
  ipcMain.handle(MAIN.MCP.LOAD_BUILTIN, () => BUILTIN_MCPS);
  ipcMain.handle(MAIN.MCP.LOAD_USER, () => loadMcpConfig());
  ipcMain.handle(MAIN.MCP.SAVE_USER, (_event, data: McpData) => {
    saveMcpConfig(data);
    return true;
  });

  // Experts management
  ipcMain.handle(MAIN.EXPERTS.LOAD, () => loadExperts());
  ipcMain.handle(MAIN.EXPERTS.SAVE, (_event, data: ExpertsData) => {
    saveExperts(data);
    return true;
  });

  // Skills management
  ipcMain.handle(MAIN.SKILLS.LOAD, () => loadSkills());
  ipcMain.handle(MAIN.SKILLS.SAVE, (_event, data: SkillsData) => {
    saveSkills(data);
    return true;
  });

  // File operations
  ipcMain.handle(MAIN.FILE.PICK, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? pickFile(win) : null;
  });
  ipcMain.handle(MAIN.FILE.PICK_FOLDER, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? pickFolder(win) : null;
  });
  ipcMain.handle(MAIN.FILE.READ, (_event, filePath: string) => readFileContent(filePath));
  ipcMain.handle(MAIN.FILE.LIST_DIR, (_event, dirPath: string) => listDirectory(dirPath));
  ipcMain.handle(MAIN.FILE.WRITE, (_event, filePath: string, content: string) => {
    writeFileContent(filePath, content);
    return true;
  });

  // Shell execution (cross-platform)
  ipcMain.handle(MAIN.SHELL.EXEC, (_event, command: string, cwd?: string) =>
    execShell(command, cwd)
  );

  // LLM chat (streaming) with optional MCP tool support
  ipcMain.handle(
    MAIN.LLM.CHAT,
    async (_event, messages: ChatMessage[], enabledMcpIds: string[] = []) => {
      if (!mainWindow) return;
      const settings = loadSettings();
      if (!settings.llm.apiKey) {
        mainWindow.webContents.send(
          RENDERER.LLM.ERROR,
          'API Key not configured. Please set it in Settings.'
        );
        return;
      }

      // system-info：直接把快照注入 system message（确定性，不依赖模型决策）
      injectSystemInfoIfEnabled(enabledMcpIds, messages);

      // web_search 等动态工具：走 tool calling（含内置 + 用户 MCP）
      const { userServers } = loadMcpConfig();
      const { tools, mcpConnections, toolToMcp } = await buildToolDefinitions(
        enabledMcpIds,
        userServers
      );
      const toolExecutor = createToolExecutor(toolToMcp);

      console.log('[llm:chat] enabledMcpIds:', enabledMcpIds);
      console.log(
        '[llm:chat] tool-calling tools:',
        tools.map((t) => t.function.name)
      );

      try {
        await streamChat(settings.llm, messages, mainWindow, tools, toolExecutor);
      } finally {
        for (const conn of mcpConnections) {
          try {
            await conn.client.close();
          } catch (e) {
            console.warn('[llm:chat] MCP close error:', conn.serverId, e);
          }
        }
      }
    }
  );
  ipcMain.handle(MAIN.LLM.ABORT, () => {
    abortLLMStream();
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.corwork.demo');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
