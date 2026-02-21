import { BrowserWindow } from 'electron'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_call_id?: string
  tool_calls?: ToolCall[]
  name?: string
}

export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<string>

let abortController: AbortController | null = null

export function abortLLMStream(): void {
  if (abortController) {
    abortController.abort()
    abortController = null
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
    return streamChatWithTools(config, messages, tools, toolExecutor, window)
  }
  return doStreamChat(config, messages, window)
}

async function streamChatWithTools(
  config: LLMConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  toolExecutor: ToolExecutor,
  window: BrowserWindow
): Promise<void> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`
  abortController = new AbortController()

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        tools,
        tool_choice: 'auto',
        stream: false
      }),
      signal: abortController.signal
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      window.webContents.send('llm:done')
      abortController = null
      return
    }
    window.webContents.send('llm:error', String(err))
    abortController = null
    return
  }

  if (!res.ok) {
    const errorBody = await res.text()
    window.webContents.send('llm:error', `API Error ${res.status}: ${errorBody}`)
    abortController = null
    return
  }

  const data = (await res.json()) as {
    choices: {
      message: {
        role: string
        content: string | null
        tool_calls?: ToolCall[]
      }
      finish_reason: string
    }[]
  }

  const choice = data.choices[0]

  console.log('[llm] finish_reason:', choice?.finish_reason)
  console.log('[llm] has tool_calls:', !!(choice?.message?.tool_calls?.length))
  if (choice?.message?.content) {
    console.log('[llm] content preview:', choice.message.content.slice(0, 120))
  }

  if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
    const toolCalls = choice.message.tool_calls
    const currentMessages: ChatMessage[] = [
      ...messages,
      choice.message as ChatMessage
    ]

    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>

        window.webContents.send('llm:tool-call', {
          id: toolCall.id,
          name: toolCall.function.name,
          args
        })

        const result = await toolExecutor(toolCall.function.name, args)

        window.webContents.send('llm:tool-result', {
          id: toolCall.id,
          name: toolCall.function.name,
          result
        })

        currentMessages.push({
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id
        })
      } catch (err) {
        const errMsg = `Tool execution error: ${String(err)}`
        window.webContents.send('llm:tool-result', {
          id: toolCall.id,
          name: toolCall.function.name,
          result: errMsg
        })
        currentMessages.push({
          role: 'tool',
          content: errMsg,
          tool_call_id: toolCall.id
        })
      }
    }

    return doStreamChat(config, currentMessages, window)
  } else {
    const content = choice.message.content || ''
    if (content) {
      window.webContents.send('llm:chunk', content)
    }
    window.webContents.send('llm:done')
    abortController = null
  }
}

async function doStreamChat(
  config: LLMConfig,
  messages: ChatMessage[],
  window: BrowserWindow
): Promise<void> {
  if (!abortController) {
    abortController = new AbortController()
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`

  // Strip any non-standard fields before sending
  const cleanMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    ...(m.tool_calls ? { tool_calls: m.tool_calls } : {})
  }))

  let res: Response
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
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      window.webContents.send('llm:done')
      abortController = null
      return
    }
    window.webContents.send('llm:error', String(err))
    abortController = null
    return
  }

  if (!res.ok) {
    const errorBody = await res.text()
    window.webContents.send('llm:error', `API Error ${res.status}: ${errorBody}`)
    abortController = null
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    window.webContents.send('llm:error', 'No response body')
    abortController = null
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          window.webContents.send('llm:done')
          return
        }

        try {
          const parsed = JSON.parse(data) as {
            choices: { delta: { content?: string } }[]
          }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            window.webContents.send('llm:chunk', delta)
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
    window.webContents.send('llm:done')
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      window.webContents.send('llm:done')
    } else {
      window.webContents.send('llm:error', String(err))
    }
  } finally {
    abortController = null
  }
}
