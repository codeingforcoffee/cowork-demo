/**
 * IPC 通道常量
 * 主进程 handle: MAIN_业务__功能（双下划线）
 * 主进程 send / 渲染进程 listen: RENDERER_业务_功能（单下划线）
 */

import { APP } from './app';
import { SETTINGS } from './settings';
import { SESSIONS } from './sessions';
import { MCP } from './mcp';
import { EXPERTS } from './experts';
import { FILE } from './file';
import { MAIN_LLM, RENDERER_LLM } from './llm';
import { SHELL } from './shell';

/** 主进程处理的通道（渲染进程 invoke → 主进程 handle） */
export const MAIN = {
  APP,
  SETTINGS,
  SESSIONS,
  MCP,
  EXPERTS,
  FILE,
  LLM: MAIN_LLM,
  SHELL
} as const;

/** 主进程发送 / 渲染进程监听的通道（主进程 send → 渲染进程 on） */
export const RENDERER = {
  LLM: RENDERER_LLM
} as const;
