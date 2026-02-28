/**
 * MCP 客户端：连接用户配置的 stdio/SSE 服务器，获取工具列表并执行
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { McpServer } from './mcp-service';
import type { ToolDefinition } from './llm';

export interface McpToolDefinition extends ToolDefinition {
  _mcpServerId: string;
}

export interface McpConnection {
  serverId: string;
  client: Client;
  tools: McpToolDefinition[];
}

/**
 * 将 MCP inputSchema 转为 OpenAI 兼容的 parameters
 */
function mcpInputSchemaToParameters(inputSchema: {
  type?: string;
  properties?: Record<string, object>;
  required?: string[];
}): ToolDefinition['function']['parameters'] {
  return {
    type: inputSchema.type === 'object' ? 'object' : 'object',
    properties:
      (inputSchema.properties as Record<string, { type?: string; description?: string }>) || {},
    required: inputSchema.required || []
  };
}

/**
 * 连接单个 MCP 服务器并获取工具列表
 */
export async function connectMcpServer(server: McpServer): Promise<McpConnection | null> {
  const client = new Client({ name: 'corwork-demo', version: '0.1.0' }, { capabilities: {} });

  let transport: { start(): Promise<void>; close(): Promise<void> };

  if (server.type === 'stdio') {
    if (!server.command) {
      console.error('[mcp-client] stdio server missing command:', server.id);
      return null;
    }
    transport = new StdioClientTransport({
      command: server.command,
      args: server.args || []
    });
  } else if (server.type === 'sse') {
    if (!server.url) {
      console.error('[mcp-client] sse server missing url:', server.id);
      return null;
    }
    const url = new URL(server.url);
    // 优先 Streamable HTTP，部分旧版 MCP 仅支持 legacy SSE
    transport = new StreamableHTTPClientTransport(url);
  } else {
    console.error('[mcp-client] unsupported server type:', server.type);
    return null;
  }

  async function doConnect(
    c: Client,
    t: { start(): Promise<void>; close(): Promise<void> }
  ): Promise<McpConnection | null> {
    try {
      await c.connect(t as Parameters<Client['connect']>[0]);
      const result = await c.listTools();
      const tools: McpToolDefinition[] = (result.tools || []).map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description || `Tool: ${t.name}`,
          parameters: mcpInputSchemaToParameters(t.inputSchema || { type: 'object' })
        },
        _mcpServerId: server.id
      }));

      console.log(
        '[mcp-client] connected:',
        server.name,
        'tools:',
        tools.map((x) => x.function.name)
      );

      return { serverId: server.id, client: c, tools };
    } catch (e) {
      try {
        await t.close();
      } catch {
        /* ignore */
      }
      throw e;
    }
  }

  try {
    return await doConnect(client, transport);
  } catch (err) {
    // 若为 SSE 类型且 Streamable HTTP 失败，尝试 legacy SSE
    if (server.type === 'sse' && server.url) {
      console.log('[mcp-client] Streamable HTTP failed, trying legacy SSE:', server.name);
      const sseTransport = new SSEClientTransport(new URL(server.url));
      const sseClient = new Client(
        { name: 'corwork-demo', version: '0.1.0' },
        { capabilities: {} }
      );
      try {
        return await doConnect(sseClient, sseTransport);
      } catch (e2) {
        console.error('[mcp-client] legacy SSE also failed:', server.name, e2);
      }
    } else {
      console.error('[mcp-client] failed to connect:', server.name, err);
    }
    return null;
  }
}

/**
 * 通过 MCP 客户端执行工具调用
 */
export async function callMcpTool(
  conn: McpConnection,
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const result = await conn.client.callTool({
    name: toolName,
    arguments: args
  });

  const content = result.content;
  if (!content || !Array.isArray(content)) {
    return String(result);
  }

  const textParts = content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text);

  return textParts.join('\n\n') || JSON.stringify(result);
}
