/** 主进程 LLM 相关通道（invoke → handle） */
export const MAIN_LLM = {
  CHAT: 'MAIN_LLM__CHAT',
  ABORT: 'MAIN_LLM__ABORT'
} as const;

/** 渲染进程 LLM 相关通道（主进程 send → 渲染进程 on） */
export const RENDERER_LLM = {
  CHUNK: 'RENDERER_LLM_CHUNK',
  DONE: 'RENDERER_LLM_DONE',
  ERROR: 'RENDERER_LLM_ERROR',
  TOOL_CALL: 'RENDERER_LLM_TOOL_CALL',
  TOOL_RESULT: 'RENDERER_LLM_TOOL_RESULT'
} as const;
