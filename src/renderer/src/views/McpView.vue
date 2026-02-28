<script setup lang="ts">
import { ref } from 'vue';
import { useMcpStore, type McpServer } from '../stores/mcp';
import ThemeSwitch from '../components/ThemeSwitch.vue';
import AddMcpModal from '../components/AddMcpModal.vue';

const mcpStore = useMcpStore();

const modalOpen = ref(false);
const editingServer = ref<McpServer | null>(null);
const busy = ref(false);

function openAddForm(): void {
  editingServer.value = null;
  modalOpen.value = true;
}

function openEditForm(server: McpServer): void {
  editingServer.value = server;
  modalOpen.value = true;
}

function closeModal(): void {
  modalOpen.value = false;
  editingServer.value = null;
}

async function handleAdd(entry: Omit<McpServer, 'id'>): Promise<void> {
  busy.value = true;
  try {
    await mcpStore.addUserServer(entry);
  } finally {
    busy.value = false;
  }
}

async function handleUpdate(id: string, updates: Partial<McpServer>): Promise<void> {
  busy.value = true;
  try {
    await mcpStore.updateUserServer(id, updates);
  } finally {
    busy.value = false;
  }
}

async function removeServer(id: string): Promise<void> {
  await mcpStore.removeUserServer(id);
}

function openMcpDocs(): void {
  window.api.openExternalUrl('https://modelcontextprotocol.io');
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <header class="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
      <div>
        <h1 class="text-lg font-bold text-text-primary">MCP Management</h1>
        <p class="text-xs text-text-tertiary mt-0.5">
          Model Context Protocol — connect tools and data to your AI
        </p>
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

    <AddMcpModal
      :open="modalOpen"
      :editing-server="editingServer"
      :busy="busy"
      @close="closeModal"
      @add="handleAdd"
      @update="handleUpdate"
    />

    <div class="flex-1 overflow-y-auto p-6">
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
            <div
              class="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0"
            >
              <svg
                v-if="server.builtinId === 'web-search'"
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
              >
                <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M13.5 13.5L17 17"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <svg
                v-else-if="server.builtinId === 'system-info'"
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
              >
                <rect
                  x="3"
                  y="3"
                  width="14"
                  height="14"
                  rx="3"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <rect
                  x="7"
                  y="7"
                  width="6"
                  height="6"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="1.3"
                />
                <path
                  d="M7 3v2M13 3v2M7 15v2M13 15v2M3 7h2M3 13h2M15 7h2M15 13h2"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
              </svg>
              <span v-else class="text-sm">🔌</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ server.name }}</p>
              <p class="text-xs text-text-tertiary mt-0.5">{{ server.description }}</p>
            </div>
            <span
              class="shrink-0 rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-[10px] text-green-500 font-medium"
            >
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

        <div
          v-if="mcpStore.userServers.length === 0"
          class="rounded-xl border border-dashed border-border p-8 text-center"
        >
          <div class="text-text-tertiary mb-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              class="mx-auto mb-3 opacity-40"
            >
              <rect
                x="4"
                y="4"
                width="24"
                height="24"
                rx="6"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M16 10v12M10 16h12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <p class="text-sm text-text-secondary">No custom MCP servers yet</p>
          <p class="text-xs text-text-tertiary mt-1">
            Add a stdio or SSE MCP server to extend capabilities
          </p>
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
            <div
              class="w-9 h-9 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-secondary shrink-0"
            >
              <svg
                v-if="server.type === 'stdio'"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <rect
                  x="2"
                  y="2"
                  width="12"
                  height="12"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.3"
                />
                <path
                  d="M5 6l2 2-2 2M9 10h2"
                  stroke="currentColor"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 8h12M8 2v12"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
                <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.3" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ server.name }}</p>
              <p class="text-xs text-text-tertiary mt-0.5 truncate">
                {{
                  server.description ||
                  (server.type === 'stdio'
                    ? `${server.command} ${(server.args || []).join(' ')}`
                    : server.url)
                }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full bg-bg-tertiary border border-border px-2 py-0.5 text-[10px] text-text-secondary font-medium uppercase"
            >
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
          <li>
            Open a chat session and click the
            <strong class="text-text-secondary">MCP</strong> button in the header
          </li>
          <li>Toggle which MCPs to enable for that session</li>
          <li>The AI will automatically use enabled tools when relevant</li>
        </ol>
        <p class="text-xs text-text-tertiary mt-2">
          <strong class="text-text-secondary">Web Search</strong> uses DuckDuckGo to find factual
          information. External MCP servers follow the
          <a href="#" class="text-accent underline" @click.prevent="openMcpDocs"
            >Model Context Protocol</a
          >
          specification.
        </p>
      </div>
    </div>
  </div>
</template>
