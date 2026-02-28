import { spawn } from 'child_process';
import * as os from 'os';

export interface ShellExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

/**
 * 跨平台执行 shell 命令
 * - Windows: 使用 cmd.exe（兼容 PowerShell 命令可通过 cmd 调用）
 * - Mac/Linux: 使用 /bin/sh
 */
export function execShell(command: string, cwd?: string): Promise<ShellExecResult> {
  return new Promise((resolve) => {
    const platform = os.platform();
    let shellCmd: string;
    let shellArgs: string[];

    if (platform === 'win32') {
      // Windows: 使用 cmd.exe /c 执行，兼容大部分命令
      shellCmd = process.env.ComSpec || 'cmd.exe';
      shellArgs = ['/c', command];
    } else {
      // Mac/Linux: 使用 sh -c
      shellCmd = process.env.SHELL || '/bin/sh';
      shellArgs = ['-c', command];
    }

    const child = spawn(shellCmd, shellArgs, {
      cwd: cwd || process.cwd(),
      shell: false, // 已通过 shellCmd/shellArgs 指定
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code, signal) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? (signal ? -1 : 0)
      });
    });

    child.on('error', (err) => {
      resolve({
        stdout,
        stderr,
        exitCode: -1,
        error: err.message
      });
    });
  });
}
