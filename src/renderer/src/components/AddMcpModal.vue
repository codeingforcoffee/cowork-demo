<script setup lang="ts">
import { ref, watch } from 'vue'
import type { McpServer } from '../stores/mcp'

export type AddMcpModalProps = {
  open: boolean
  editingServer?: McpServer | null
  busy?: boolean
}

const props = withDefaults(defineProps<AddMcpModalProps>(), {
  editingServer: null,
  busy: false
})

const emit = defineEmits<{
  close: []
  add: [entry: Omit<McpServer, 'id'>]
  update: [id: string, entry: Partial<McpServer>]
}>()

const name = ref('')
const serverType = ref<'remote' | 'local'>('remote')
const url = ref('')
const command = ref('')
const error = ref<string | null>(null)

const isEdit = () => !!props.editingServer

function reset(): void {
  name.value = ''
  serverType.value = 'remote'
  url.value = ''
  command.value = ''
  error.value = null
}

function handleClose(): void {
  reset()
  emit('close')
}

function handleSubmit(): void {
  error.value = null

  const trimmedName = name.value.trim()
  if (!trimmedName) {
    error.value = '请输入服务器名称'
    return
  }

  if (serverType.value === 'remote') {
    const trimmedUrl = url.value.trim()
    if (!trimmedUrl) {
      error.value = '请输入服务器 URL 或命令'
      return
    }
    if (isEdit()) {
      emit('update', props.editingServer!.id, {
        name: trimmedName,
        description: '',
        type: 'sse',
        url: trimmedUrl
      })
    } else {
      emit('add', {
        name: trimmedName,
        description: '',
        type: 'sse',
        url: trimmedUrl
      })
    }
  } else {
    const trimmedCommand = command.value.trim()
    if (!trimmedCommand) {
      error.value = '请输入服务器 URL 或命令'
      return
    }
    const parts = trimmedCommand.split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)
    if (isEdit()) {
      emit('update', props.editingServer!.id, {
        name: trimmedName,
        description: '',
        type: 'stdio',
        command: cmd,
        args
      })
    } else {
      emit('add', {
        name: trimmedName,
        description: '',
        type: 'stdio',
        command: cmd,
        args
      })
    }
  }
  handleClose()
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.editingServer) {
        name.value = props.editingServer.name
        serverType.value = props.editingServer.type === 'sse' ? 'remote' : 'local'
        url.value = props.editingServer.url || ''
        command.value =
          props.editingServer.type === 'stdio'
            ? [props.editingServer.command, ...(props.editingServer.args || [])].filter(Boolean).join(' ')
            : ''
      } else {
        reset()
      }
      error.value = null
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        @click="handleClose"
      />

      <div
        class="relative w-full max-w-lg rounded-2xl border border-border bg-bg-secondary shadow-2xl overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 class="text-lg font-semibold text-text-primary">
              {{ isEdit() ? '编辑 MCP 服务器' : '添加 MCP 服务器' }}
            </h2>
            <p class="text-sm text-text-tertiary">
              {{ isEdit() ? '修改服务器配置' : '连接远程或本地 MCP 服务器' }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            @click="handleClose"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="space-y-4 px-6 py-5">
          <div>
            <label class="mb-1 block text-xs font-medium text-text-secondary">服务器名称 *</label>
            <input
              v-model="name"
              type="text"
              placeholder="My MCP Server"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
              autofocus
            />
          </div>

          <div>
            <div class="mb-1 text-xs font-medium text-text-secondary">服务器类型</div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                :class="[
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  serverType === 'remote'
                    ? 'bg-accent text-white'
                    : 'text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary'
                ]"
                @click="serverType = 'remote'"
              >
                远程 (SSE)
              </button>
              <button
                type="button"
                :class="[
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  serverType === 'local'
                    ? 'bg-accent text-white'
                    : 'text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary'
                ]"
                @click="serverType = 'local'"
              >
                本地 (命令)
              </button>
            </div>
          </div>

          <div v-if="serverType === 'remote'">
            <label class="mb-1 block text-xs font-medium text-text-secondary">服务器 URL</label>
            <input
              v-model="url"
              type="text"
              placeholder="http://localhost:3000/sse"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div v-if="serverType === 'local'">
            <label class="mb-1 block text-xs font-medium text-text-secondary">启动命令</label>
            <input
              v-model="command"
              type="text"
              placeholder="npx -y @modelcontextprotocol/server-filesystem /path"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
            <p class="mt-1 text-xs text-text-tertiary">
              输入完整命令，参数用空格分隔，例如：npx -y @modelcontextprotocol/server-filesystem /path
            </p>
          </div>

          <div
            v-if="error"
            class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500"
          >
            {{ error }}
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 border-t border-border bg-bg-secondary/50 px-6 py-4">
          <button
            type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            @click="handleClose"
          >
            取消
          </button>
          <button
            type="button"
            :disabled="busy"
            class="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            @click="handleSubmit"
          >
            <svg
              v-if="busy"
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ isEdit() ? '保存' : '添加服务器' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
