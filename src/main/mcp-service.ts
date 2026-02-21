import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface McpServer {
  id: string
  name: string
  description: string
  type: 'builtin' | 'stdio' | 'sse'
  builtinId?: string
  command?: string
  args?: string[]
  url?: string
  config?: Record<string, string>
}

export interface McpData {
  userServers: McpServer[]
}

export const BUILTIN_MCPS: McpServer[] = [
  {
    id: 'builtin-web-search',
    name: 'Web Search',
    description: 'Use DuckDuckGo to search the web for current information',
    type: 'builtin',
    builtinId: 'web-search'
  },
  {
    id: 'builtin-system-info',
    name: 'System Info',
    description: 'Read real-time system metrics: memory, CPU, OS, and app process info',
    type: 'builtin',
    builtinId: 'system-info'
  }
]

function getMcpPath(): string {
  return path.join(app.getPath('userData'), 'mcp-config.json')
}

export function loadMcpConfig(): McpData {
  try {
    const raw = fs.readFileSync(getMcpPath(), 'utf-8')
    const data = JSON.parse(raw) as McpData
    return {
      userServers: Array.isArray(data.userServers) ? data.userServers : []
    }
  } catch {
    return { userServers: [] }
  }
}

export function saveMcpConfig(data: McpData): void {
  const filePath = getMcpPath()
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function executeWebSearch(query: string): Promise<string> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const apiUrl = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`

    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Corwork/0.1.0 (Desktop AI Assistant)' }
    })

    if (!res.ok) {
      return `Search failed: HTTP ${res.status}`
    }

    const data = (await res.json()) as {
      Abstract?: string
      AbstractText?: string
      AbstractURL?: string
      AbstractSource?: string
      RelatedTopics?: { Text?: string; FirstURL?: string; Topics?: unknown[] }[]
      Answer?: string
      AnswerType?: string
    }

    const parts: string[] = []

    if (data.Answer) {
      parts.push(`**Direct Answer:** ${data.Answer}`)
    }

    if (data.AbstractText) {
      parts.push(`**Summary:** ${data.AbstractText}`)
      if (data.AbstractSource && data.AbstractURL) {
        parts.push(`*Source: [${data.AbstractSource}](${data.AbstractURL})*`)
      }
    }

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics
        .filter(t => t.Text && !t.Topics)
        .slice(0, 5)
        .map(t => `- ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ''}`)

      if (topics.length > 0) {
        parts.push(`**Related Results:**\n${topics.join('\n')}`)
      }
    }

    if (parts.length === 0) {
      return `No direct results found for "${query}". This search engine is best for factual queries.`
    }

    return parts.join('\n\n')
  } catch (err) {
    return `Web search error: ${String(err)}`
  }
}

export function executeSystemInfo(): string {
  const toGB = (bytes: number): string => (bytes / 1024 / 1024 / 1024).toFixed(2)
  const toMB = (bytes: number): number => Math.round(bytes / 1024 / 1024)

  // ── Memory ──
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memPct = ((usedMem / totalMem) * 100).toFixed(1)

  // ── CPU ──
  const cpus = os.cpus()
  const cpuModel = cpus[0]?.model.trim() ?? 'Unknown'
  const cpuCores = cpus.length
  // 每个核的 times: user/nice/sys/idle/irq
  const totalTimes = cpus.reduce(
    (acc, c) => {
      acc.user += c.times.user
      acc.nice += c.times.nice
      acc.sys += c.times.sys
      acc.idle += c.times.idle
      acc.irq += c.times.irq
      return acc
    },
    { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 }
  )
  const totalAll = Object.values(totalTimes).reduce((a, b) => a + b, 0)
  const cpuUsagePct = (((totalAll - totalTimes.idle) / totalAll) * 100).toFixed(1)
  const loadAvg = os.loadavg() // 1m / 5m / 15m（Windows 始终为 0）

  // ── OS ──
  const uptimeSec = os.uptime()
  const uptimeH = Math.floor(uptimeSec / 3600)
  const uptimeM = Math.floor((uptimeSec % 3600) / 60)

  // ── App process memory ──
  const proc = process.memoryUsage()

  const lines: string[] = [
    '### 内存',
    `- 总内存：${toGB(totalMem)} GB`,
    `- 已用内存：${toGB(usedMem)} GB（${memPct}%）`,
    `- 空闲内存：${toGB(freeMem)} GB`,
    '',
    '### CPU',
    `- 型号：${cpuModel}`,
    `- 核心数：${cpuCores} 核`,
    `- 综合使用率（当前快照）：${cpuUsagePct}%`,
    `- 负载均值：${loadAvg[0].toFixed(2)}（1m）/ ${loadAvg[1].toFixed(2)}（5m）/ ${loadAvg[2].toFixed(2)}（15m）`,
    '',
    '### 操作系统',
    `- 平台：${os.platform()}`,
    `- 内核版本：${os.release()}`,
    `- 架构：${os.arch()}`,
    `- 主机名：${os.hostname()}`,
    `- 系统已运行：${uptimeH} 小时 ${uptimeM} 分钟`,
    '',
    '### 当前应用进程内存',
    `- RSS（常驻内存）：${toMB(proc.rss)} MB`,
    `- Heap 已用：${toMB(proc.heapUsed)} MB`,
    `- Heap 总量：${toMB(proc.heapTotal)} MB`,
    `- 外部 C++ 对象：${toMB(proc.external)} MB`
  ]

  return lines.join('\n')
}
