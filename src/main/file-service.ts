import { dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export async function pickFile(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Text Files',
        extensions: [
          'txt',
          'md',
          'json',
          'js',
          'ts',
          'vue',
          'py',
          'html',
          'css',
          'yaml',
          'yml',
          'toml',
          'xml',
          'csv',
          'log',
          'sh',
          'bat',
          'rs',
          'go',
          'java',
          'c',
          'cpp',
          'h'
        ]
      },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0] || null;
}

export async function pickFolder(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0] || null;
}

export function readFileContent(filePath: string): { content: string; name: string; size: number } {
  const stat = fs.statSync(filePath);
  const maxSize = 512 * 1024; // 512KB limit for safety
  if (stat.size > maxSize) {
    const partial = fs.readFileSync(filePath, 'utf-8').slice(0, maxSize);
    return {
      content: partial + '\n\n[... file truncated, showing first 512KB ...]',
      name: path.basename(filePath),
      size: stat.size
    };
  }
  return {
    content: fs.readFileSync(filePath, 'utf-8'),
    name: path.basename(filePath),
    size: stat.size
  };
}

export function listDirectory(dirPath: string): FileEntry[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith('.'))
    .map((e) => {
      const fullPath = path.join(dirPath, e.name);
      let size = 0;
      try {
        if (!e.isDirectory()) size = fs.statSync(fullPath).size;
      } catch {
        // skip unreadable
      }
      return {
        name: e.name,
        path: fullPath,
        isDirectory: e.isDirectory(),
        size
      };
    })
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function writeFileContent(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}
