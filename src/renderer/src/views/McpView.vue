<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMcpStore, type McpServer } from '../stores/mcp'
import ThemeSwitch from '../components/ThemeSwitch.vue'

const mcpStore = useMcpStore()

const showAddForm = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = (): Omit<McpServer, 'id'> => ({
  name: '',
  description: '',
  type: 'stdio',
  command: '',
  args: [],
  url: ''
})

const form = reactive<Omit<McpServer, 'id'>>(emptyForm())
const argsInput = ref('')

function openAddForm(): void {
  Object.assign(form, emptyForm())
  argsInput.value = ''
  editingId.value = null
  showAddForm.value = true
}

function openEditForm(server: McpServer): void {
  Object.assign(form, {
    name: server.name,
    description: server.description,
    type: server.type,
    command: server.command || '',
    args: server.args || [],
    url: server.url || ''
  })
  argsInput.value = (server.args || []).join(' ')
  editingId.value = server.id
  showAddForm.value = true
}

function cancelForm(): void {
  showAddForm.value = false
  editingId.value = null
}

async function submitForm(): Promise<void> {
  if (!form.name.trim()) return

  const args = argsInput.value.trim()
    ? argsInput.value.trim().split(/\s+/)
    : []

  const serverData: Omit<McpServer, 'id'> = {
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type,
    command: form.command?.trim() || undefined,
    args,
    url: form.url?.trim() || undefined
  }

  if (editingId.value) {
    await mcpStore.updateUserServer(editingId.value, serverData)
  } else {
    await mcpStore.addUserServer(serverData)
  }

  showAddForm.value = false
  editingId.value = null
}

async function removeServer(id: string): Promise<void> {
  await mcpStore.removeUserServer(id)
}

function openMcpDocs(): void {
  window.electron.ipcRenderer.invoke('open-external-url', 'https://modelcontextprotocol.io')
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <header class="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
      <div>
        <h1 class="text-lg font-bold text-text-primary">MCP Management</h1>
        <p class="text-xs text-text-tertiary mt-0.5">Model Context Protocol — connect tools and data to your AI</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          @click="openAddForm"
        >
          + Add MCP Server
        </button>
        <ThemeSwitch />
      </div>
    </header>

    <div class="flex-1 overflow-y-auto p-6">

      <!-- Add/Edit form -->
      <div v-if="showAddForm" class="mb-6 rounded-xl border border-border bg-bg-secondary p-5">
        <h2 class="text-sm font-semibold text-text-primary mb-4">
          {{ editingId ? 'Edit MCP Server' : 'Add MCP Server' }}
        </h2>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Name *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="My MCP Server"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Type</label>
            <select
              v-model="form.type"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="stdio">stdio (Command)</option>
              <option value="sse">SSE (HTTP)</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <input
              v-model="form.description"
              type="text"
              placeholder="What does this MCP do?"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <template v-if="form.type === 'stdio'">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Command</label>
              <input
                v-model="form.command"
                type="text"
                placeholder="npx, node, python3, ..."
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Arguments (space-separated)</label>
              <input
                v-model="argsInput"
                type="text"
                placeholder="-y @modelcontextprotocol/server-filesystem /path"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </template>
          <template v-else>
            <div class="col-span-2">
              <label class="block text-xs font-medium text-text-secondary mb-1">Server URL</label>
              <input
                v-model="form.url"
                type="text"
                placeholder="http://localhost:3000/sse"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </template>
        </div>

        <div class="flex gap-2 mt-4">
          <button
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            :disabled="!form.name.trim()"
            @click="submitForm"
          >
            {{ editingId ? 'Save Changes' : 'Add Server' }}
          </button>
          <button
            class="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            @click="cancelForm"
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- Built-in MCPs -->
      <section class="mb-6">
        <h2 class="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
          Built-in Tools
        </h2>
        <div class="space-y-2">
          <div
            v-for="server in mcpStore.builtinServers"
            :key="server.id"
            class="flex items-center gap-4 rounded-xl border border-border bg-bg-secondary px-4 py-3"
          >
            <div class="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <svg v-if="server.builtinId === 'web-search'" width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <svg v-else-if="server.builtinId === 'system-info'" width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/>
                <rect x="7" y="7" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
                <path d="M7 3v2M13 3v2M7 15v2M13 15v2M3 7h2M3 13h2M15 7h2M15 13h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              <span v-else class="text-sm">🔌</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ server.name }}</p>
              <p class="text-xs text-text-tertiary mt-0.5">{{ server.description }}</p>
            </div>
            <span class="shrink-0 rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-[10px] text-green-500 font-medium">
              Built-in
            </span>
          </div>
        </div>
      </section>

      <!-- User-configured MCPs -->
      <section>
        <h2 class="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
          Custom MCP Servers
        </h2>

        <div v-if="mcpStore.userServers.length === 0" class="rounded-xl border border-dashed border-border p-8 text-center">
          <div class="text-text-tertiary mb-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" class="mx-auto mb-3 opacity-40">
              <rect x="4" y="4" width="24" height="24" rx="6" stroke="currentColor" stroke-width="1.5"/>
              <path d="M16 10v12M10 16h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="text-sm text-text-secondary">No custom MCP servers yet</p>
          <p class="text-xs text-text-tertiary mt-1">Add a stdio or SSE MCP server to extend capabilities</p>
          <button
            class="mt-3 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            @click="openAddForm"
          >
            + Add Server
          </button>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="server in mcpStore.userServers"
            :key="server.id"
            class="flex items-center gap-4 rounded-xl border border-border bg-bg-secondary px-4 py-3"
          >
            <div class="w-9 h-9 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-secondary shrink-0">
              <svg v-if="server.type === 'stdio'" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/>
                <path d="M5 6l2 2-2 2M9 10h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M8 2v12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.3"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ server.name }}</p>
              <p class="text-xs text-text-tertiary mt-0.5 truncate">
                {{ server.description || (server.type === 'stdio' ? `${server.command} ${(server.args || []).join(' ')}` : server.url) }}
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-bg-tertiary border border-border px-2 py-0.5 text-[10px] text-text-secondary font-medium uppercase">
              {{ server.type }}
            </span>
            <div class="shrink-0 flex items-center gap-1">
              <button
                class="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                @click="openEditForm(server)"
              >
                Edit
              </button>
              <button
                class="rounded-lg border border-border px-2.5 py-1 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                @click="removeServer(server.id)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Info box -->
      <div class="mt-6 rounded-xl border border-border bg-bg-secondary p-4">
        <h3 class="text-xs font-semibold text-text-secondary mb-2">How to use MCPs</h3>
        <ol class="text-xs text-text-tertiary space-y-1 list-decimal list-inside">
          <li>Add a built-in or custom MCP server above</li>
          <li>Open a chat session and click the <strong class="text-text-secondary">MCP</strong> button in the header</li>
          <li>Toggle which MCPs to enable for that session</li>
          <li>The AI will automatically use enabled tools when relevant</li>
        </ol>
        <p class="text-xs text-text-tertiary mt-2">
          <strong class="text-text-secondary">Web Search</strong> uses DuckDuckGo to find factual information.
          External MCP servers follow the
          <a href="#" class="text-accent underline" @click.prevent="openMcpDocs">Model Context Protocol</a>
          specification.
        </p>
      </div>
    </div>
  </div>
</template>
