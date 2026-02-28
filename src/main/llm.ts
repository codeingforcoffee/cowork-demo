import { BrowserWindow } from 'electron';
import { RENDERER } from '@cowork/shared';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
}

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<string>;

let abortController: AbortController | null = null;

export function abortLLMStream(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

export async function streamChat(
  config: LLMConfig,
  messages: ChatMessage[],
  window: BrowserWindow,
  tools: ToolDefinition[] = [],
  toolExecutor?: ToolExecutor
): Promise<void> {
  if (tools.length > 0 && toolExecutor) {
    return streamChatWithTools(config, messages, tools, toolExecutor, window);
  }
  return doStreamChat(config, messages, window);
}

interface StreamToolCallAccumulator {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

async function streamChatWithTools(
  config: LLMConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  toolExecutor: ToolExecutor,
  window: BrowserWindow
): Promise<void> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  if (!abortController) {
    abortController = new AbortController();
  }

  const cleanMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    ...(m.tool_calls ? { tool_calls: m.tool_calls } : {})
  }));

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: cleanMessages,
        tools,
        tool_choice: 'auto',
        stream: true
      }),
      signal: abortController.signal
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      window.webContents.send(RENDERER.LLM.DONE);
      abortController = null;
      return;
    }
    window.webContents.send(RENDERER.LLM.ERROR, String(err));
    abortController = null;
    return;
  }

  if (!res.ok) {
    const errorBody = await res.text();
    window.webContents.send(RENDERER.LLM.ERROR, `API Error ${res.status}: ${errorBody}`);
    abortController = null;
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    window.webContents.send(RENDERER.LLM.ERROR, 'No response body');
    abortController = null;
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  const toolCallsAccum: Map<number, StreamToolCallAccumulator> = new Map();
  let delegatedToDoStream = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          window.webContents.send(RENDERER.LLM.DONE);
          abortController = null;
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices: {
              delta: {
                content?: string;
                tool_calls?: Array<{
                  index: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason?: string;
            }[];
          };
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const { delta, finish_reason } = choice;

          if (delta?.content) {
            window.webContents.send(RENDERER.LLM.CHUNK, delta.content);
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              let acc = toolCallsAccum.get(idx);
              if (!acc) {
                acc = {
                  id: tc.id || `call_${idx}`,
                  type: 'function',
                  function: { name: '', arguments: '' }
                };
                toolCallsAccum.set(idx, acc);
              }
              if (tc.id) acc.id = tc.id;
              if (tc.function?.name) acc.function.name += tc.function.name;
              if (tc.function?.arguments) acc.function.arguments += tc.function.arguments;
            }
          }

          if (finish_reason === 'tool_calls' && toolCallsAccum.size > 0) {
            const toolCalls: ToolCall[] = Array.from(toolCallsAccum.entries())
              .sort(([a], [b]) => a - b)
              .map(([, acc]) => ({
                id: acc.id,
                type: 'function' as const,
                function: { name: acc.function.name, arguments: acc.function.arguments }
              }));

            const assistantMsg: ChatMessage = {
              role: 'assistant',
              content: null,
              tool_calls: toolCalls
            };
            const currentMessages: ChatMessage[] = [...messages, assistantMsg];

            for (const toolCall of toolCalls) {
              try {
                const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

                window.webContents.send(RENDERER.LLM.TOOL_CALL, {
                  id: toolCall.id,
                  name: toolCall.function.name,
                  args
                });

                const result = await toolExecutor(toolCall.function.name, args);

                window.webContents.send(RENDERER.LLM.TOOL_RESULT, {
                  id: toolCall.id,
                  name: toolCall.function.name,
                  result
                });

                currentMessages.push({
                  role: 'tool',
                  content: result,
                  tool_call_id: toolCall.id
                });
              } catch (err) {
                const errMsg = `Tool execution error: ${String(err)}`;
                window.webContents.send(RENDERER.LLM.TOOL_RESULT, {
                  id: toolCall.id,
                  name: toolCall.function.name,
                  result: errMsg
                });
                currentMessages.push({
                  role: 'tool',
                  content: errMsg,
                  tool_call_id: toolCall.id
                });
              }
            }

            delegatedToDoStream = true;
            return doStreamChat(config, currentMessages, window);
          }

          if (finish_reason === 'stop' || finish_reason === 'length') {
            window.webContents.send(RENDERER.LLM.DONE);
            abortController = null;
            return;
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
    window.webContents.send(RENDERER.LLM.DONE);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      window.webContents.send(RENDERER.LLM.DONE);
    } else {
      window.webContents.send(RENDERER.LLM.ERROR, String(err));
    }
  } finally {
    if (!delegatedToDoStream) {
      abortController = null;
    }
  }
}

async function doStreamChat(
  config: LLMConfig,
  messages: ChatMessage[],
  window: BrowserWindow
): Promise<void> {
  if (!abortController) {
    abortController = new AbortController();
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  // Strip any non-standard fields before sending
  const cleanMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    ...(m.tool_calls ? { tool_calls: m.tool_calls } : {})
  }));

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: cleanMessages,
        stream: true
      }),
      signal: abortController.signal
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      window.webContents.send(RENDERER.LLM.DONE);
      abortController = null;
      return;
    }
    window.webContents.send(RENDERER.LLM.ERROR, String(err));
    abortController = null;
    return;
  }

  if (!res.ok) {
    const errorBody = await res.text();
    window.webContents.send(RENDERER.LLM.ERROR, `API Error ${res.status}: ${errorBody}`);
    abortController = null;
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    window.webContents.send(RENDERER.LLM.ERROR, 'No response body');
    abortController = null;
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          window.webContents.send(RENDERER.LLM.DONE);
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices: { delta: { content?: string } }[];
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            window.webContents.send(RENDERER.LLM.CHUNK, delta);
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
    window.webContents.send(RENDERER.LLM.DONE);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      window.webContents.send(RENDERER.LLM.DONE);
    } else {
      window.webContents.send(RENDERER.LLM.ERROR, String(err));
    }
  } finally {
    abortController = null;
  }
}
