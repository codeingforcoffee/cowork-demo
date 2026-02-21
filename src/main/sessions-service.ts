import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface StoredMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: { name: string; path: string; content: string }[]
  timestamp: number
  isToolCall?: boolean
  toolName?: string
  toolArgs?: string
  toolResult?: string
}

export interface StoredSession {
  id: string
  title: string
  messages: StoredMessage[]
  enabledMcpIds: string[]
  createdAt: number
  updatedAt: number
}

export interface SessionsData {
  sessions: StoredSession[]
  lastActiveSessionId?: string
}

function getSessionsPath(): string {
  return path.join(app.getPath('userData'), 'sessions.json')
}

export function loadSessions(): SessionsData {
  try {
    const raw = fs.readFileSync(getSessionsPath(), 'utf-8')
    const data = JSON.parse(raw) as SessionsData
    return {
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      lastActiveSessionId: data.lastActiveSessionId
    }
  } catch {
    return { sessions: [] }
  }
}

export function saveSessions(data: SessionsData): void {
  const filePath = getSessionsPath()
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
