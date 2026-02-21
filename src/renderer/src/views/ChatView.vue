<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useSessionsStore } from '../stores/sessions'
import { useMcpStore } from '../stores/mcp'
import { useSettingsStore } from '../stores/settings'
import ThemeSwitch from '../components/ThemeSwitch.vue'

const sessionsStore = useSessionsStore()
const mcpStore = useMcpStore()
const settingsStore = useSettingsStore()

const input = ref('')
const attachments = ref<{ name: string; path: string; content: string }[]>([])
const messagesEnd = ref<HTMLElement | null>(null)
const showMcpPanel = ref(false)

const canSend = computed(
  () => input.value.trim().length > 0 && !sessionsStore.isStreaming
)

// Close MCP panel when clicking outside
function handleClickOutside(e: MouseEvent): void {
  const target = e.target as HTMLElement
  if (!target.closest('.mcp-panel-container')) {
    showMcpPanel.value = false
  }
}

async function pickFile(): Promise<void> {
  const path = await window.api.pickFile()
  if (!path) return
  const { content, name } = await window.api.readFile(path)
  attachments.value.push({ name, path, content })
}

function removeAttachment(idx: number): void {
  attachments.value.splice(idx, 1)
}

async function send(): Promise<void> {
  const text = input.value.trim()
  if (!text && attachments.value.length === 0) return
  input.value = ''
  const files = [...attachments.value]
  attachments.value = []
  await sessionsStore.sendMessage(text || '请分析这些文件：', files)
  await nextTick()
  messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
}

async function abort(): Promise<void> {
  await sessionsStore.abortStream()
}

// Scroll to bottom when messages change
watch(
  () => sessionsStore.currentMessages.length,
  async () => {
    await nextTick()
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }
)

// Load settings on first render
settingsStore.load()
</script>

<template>
  <div class="flex flex-col h-full" @click="handleClickOutside">
    <!-- Header -->
    <header
      class="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border"
    >
      <!-- Session title -->
      <h1 class="text-sm font-semibold text-text-primary truncate flex-1">
        {{ sessionsStore.currentSession?.title || 'New Chat' }}
      </h1>

      <!-- MCP panel trigger -->
      <div class="relative mcp-panel-container">
        <button
          class="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          :class="sessionsStore.currentEnabledMcpIds.length > 0 ? 'border-accent/50 text-accent' : ''"
          @click.stop="showMcpPanel = !showMcpPanel"
          title="Configure MCPs for this session"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/>
            <path d="M8 5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          MCP
          <span
            v-if="sessionsStore.currentEnabledMcpIds.length > 0"
            class="rounded-full bg-accent text-white text-[10px] px-1.5 py-0 leading-4"
          >
            {{ sessionsStore.currentEnabledMcpIds.length }}
          </span>
        </button>

        <!-- MCP dropdown panel -->
        <div
          v-if="showMcpPanel"
          class="absolute right-0 top-full mt-1 w-64 bg-bg-secondary border border-border rounded-xl shadow-lg z-50 p-3"
          @click.stop
        >
          <p class="text-xs font-medium text-text-secondary mb-2">Available MCPs for this session</p>

          <div v-if="mcpStore.allServers.length === 0" class="text-xs text-text-tertiary py-2 text-center">
            No MCPs configured. Go to MCP settings to add some.
          </div>

          <div v-for="server in mcpStore.allServers" :key="server.id" class="flex items-center gap-2 py-1.5">
            <button
              class="relative flex-shrink-0 w-8 h-5 rounded-full transition-colors"
              :class="sessionsStore.currentEnabledMcpIds.includes(server.id)
                ? 'bg-accent'
                : 'bg-bg-tertiary'"
              @click="sessionsStore.toggleMcp(server.id)"
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm"
                :class="sessionsStore.currentEnabledMcpIds.includes(server.id) ? 'translate-x-3' : 'translate-x-0'"
              />
            </button>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-text-primary truncate">{{ server.name }}</p>
              <p class="text-[10px] text-text-tertiary truncate">{{ server.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Clear button -->
      <button
        class="rounded-lg px-2.5 py-1.5 text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors border border-transparent hover:border-border"
        title="Clear this chat"
        :disabled="sessionsStore.isStreaming"
        @click="sessionsStore.clearCurrentSession()"
      >
        Clear
      </button>

      <ThemeSwitch />
    </header>

    <!-- Enabled MCP chips -->
    <div
      v-if="sessionsStore.currentEnabledMcpIds.length > 0"
      class="shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-accent/5 border-b border-border"
    >
      <span class="text-[10px] text-text-tertiary mr-1">Active MCPs:</span>
      <button
        v-for="id in sessionsStore.currentEnabledMcpIds"
        :key="id"
        class="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] text-accent hover:bg-accent/25 transition-colors"
        :title="`Click to disable ${mcpStore.getServerById(id)?.name}`"
        @click="sessionsStore.toggleMcp(id)"
      >
        {{ mcpStore.getServerById(id)?.name || id }}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
      <div
        v-if="sessionsStore.currentMessages.length === 0"
        class="flex flex-col items-center justify-center h-full text-center text-text-tertiary"
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" class="mb-4 opacity-30">
          <path d="M20 4C11.16 4 4 11.16 4 20c0 2.96.79 5.74 2.17 8.13L4 36l7.87-2.17A15.93 15.93 0 0020 36c8.84 0 16-7.16 16-16S28.84 4 20 4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <p class="mb-1 text-sm">发送消息开始对话</p>
        <p class="text-xs">支持附加本地文件 · 可在 Settings 配置 API</p>
      </div>

      <template v-for="msg in sessionsStore.currentMessages" :key="msg.id">
        <!-- Tool call indicator -->
        <div
          v-if="msg.toolCallName"
          class="flex items-start gap-2 mr-8"
        >
          <div class="rounded-xl bg-bg-tertiary border border-border px-3 py-2 text-xs text-text-secondary w-full">
            <div class="flex items-center gap-1.5 mb-1">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" class="text-accent">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/>
                <path d="M8 5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              <span class="font-medium text-accent">
                <template v-if="msg.toolCallName === 'web_search'">🔍 Web Search</template>
                <template v-else-if="msg.toolCallName === 'get_system_info'">💻 System Info</template>
                <template v-else>{{ msg.toolCallName }}</template>
              </span>
            </div>
            <div v-if="msg.toolCallArgs" class="text-[10px] text-text-tertiary mb-1">
              Query: {{ JSON.parse(msg.toolCallArgs)?.query || msg.toolCallArgs }}
            </div>
            <div v-if="msg.toolResultContent" class="mt-1.5 pt-1.5 border-t border-border text-[10px] text-text-secondary whitespace-pre-wrap max-h-32 overflow-y-auto">
              {{ msg.toolResultContent }}
            </div>
            <div v-else class="mt-1 flex items-center gap-1 text-[10px] text-text-tertiary">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
              Searching...
            </div>
          </div>
        </div>

        <!-- Regular message -->
        <div
          v-else-if="msg.content || (msg.role === 'assistant' && sessionsStore.isStreaming)"
          class="rounded-xl p-3"
          :class="
            msg.role === 'user'
              ? 'ml-10 bg-accent/15 border border-accent/30'
              : 'mr-10 bg-bg-secondary border border-border'
          "
        >
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[10px] font-medium text-text-tertiary">
              {{ msg.role === 'user' ? 'You' : 'Assistant' }}
            </span>
          </div>
          <div v-if="msg.files?.length" class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="f in msg.files"
              :key="f.path"
              class="inline-flex items-center gap-1 rounded-md bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary"
            >
              📄 {{ f.name }}
            </span>
          </div>
          <div
            v-if="msg.content"
            class="text-text-primary text-sm leading-relaxed whitespace-pre-wrap"
          >{{ msg.content }}</div>
          <div
            v-else-if="msg.role === 'assistant' && sessionsStore.isStreaming"
            class="text-text-tertiary"
          >
            <span class="inline-block animate-pulse">▌</span>
          </div>
        </div>
      </template>

      <div v-if="sessionsStore.error" class="rounded-lg bg-red-500/15 border border-red-500/40 p-3 text-sm text-red-600 dark:text-red-400">
        {{ sessionsStore.error }}
      </div>

      <div ref="messagesEnd" />
    </div>

    <!-- Input area -->
    <div class="shrink-0 p-3 border-t border-border">
      <!-- Attachments preview -->
      <div v-if="attachments.length > 0" class="flex flex-wrap gap-1.5 mb-2">
        <span
          v-for="(a, i) in attachments"
          :key="a.path"
          class="inline-flex items-center gap-1 rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-primary"
        >
          📄 {{ a.name }}
          <button
            class="ml-1 text-text-tertiary hover:text-text-primary"
            @click="removeAttachment(i)"
          >×</button>
        </span>
      </div>

      <div class="flex gap-2">
        <button
          class="shrink-0 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="附加文件"
          :disabled="sessionsStore.isStreaming"
          @click="pickFile"
        >
          📎
        </button>

        <textarea
          v-model="input"
          placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
          rows="2"
          class="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary resize-none outline-none focus:ring-2 focus:ring-accent transition-shadow"
          :disabled="sessionsStore.isStreaming"
          @keydown.enter.exact.prevent="send"
        />

        <button
          v-if="sessionsStore.isStreaming"
          class="shrink-0 rounded-lg bg-red-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          @click="abort"
        >
          Stop
        </button>
        <button
          v-else
          class="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="!canSend"
          @click="send"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>
