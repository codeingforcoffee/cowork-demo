<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useSessionsStore } from '../stores/sessions'

const { t } = useI18n()
defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ (e: 'toggle'): void }>()

const router = useRouter()
const route = useRoute()
const sessionsStore = useSessionsStore()

const editingId = ref<string | null>(null)
const editingTitle = ref('')

const bottomNav = [
  { path: '/mcp', labelKey: 'nav.mcp', icon: '🔌' },
  { path: '/settings', labelKey: 'nav.settings', icon: '⚙️' },
  { path: '/about', labelKey: 'nav.about', icon: 'ℹ️' }
]

function handleNewSession(): void {
  sessionsStore.createSession()
  router.push('/')
}

function handleSwitchSession(id: string): void {
  sessionsStore.switchSession(id)
  router.push('/')
}

function handleDeleteSession(id: string, event: MouseEvent): void {
  event.stopPropagation()
  sessionsStore.deleteSession(id)
}

function startEdit(id: string, title: string, event: MouseEvent): void {
  event.stopPropagation()
  editingId.value = id
  editingTitle.value = title
}

function commitEdit(id: string): void {
  if (editingTitle.value.trim()) {
    sessionsStore.renameSession(id, editingTitle.value.trim())
  }
  editingId.value = null
}

function cancelEdit(): void {
  editingId.value = null
}
</script>

<template>
  <aside
    class="shrink-0 bg-sidebar-bg border-r border-border flex flex-col transition-all duration-200 overflow-hidden"
    :class="collapsed ? 'w-[52px]' : 'w-[220px]'"
  >
    <!-- Header: traffic lights + title + toggle -->
    <div class="h-12 flex items-center drag-region shrink-0"
         :class="collapsed ? 'justify-center px-0' : 'px-3 gap-2'">
      <button
        class="no-drag shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        :class="collapsed ? '' : 'ml-[52px]'"
        :title="collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')"
        @click="emit('toggle')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor"/>
          <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor"/>
          <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor"/>
        </svg>
      </button>
      <span v-if="!collapsed" class="no-drag text-sm font-semibold text-text-primary truncate">
        Corwork
      </span>
    </div>

    <!-- New Chat button -->
    <div class="px-2 py-1 shrink-0">
      <button
        class="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        :class="collapsed ? 'justify-center' : ''"
        :title="collapsed ? t('common.newChat') : ''"
        @click="handleNewSession"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="shrink-0">
          <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span v-if="!collapsed" class="truncate">{{ t('common.newChat') }}</span>
      </button>
    </div>

    <!-- Session list -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-0.5 min-h-0">
      <!-- Today -->
      <template v-if="sessionsStore.groupedSessions.today.length > 0">
        <p v-if="!collapsed" class="px-2 pt-2 pb-1 text-xs text-text-tertiary font-medium">{{ t('common.today') }}</p>
        <div v-for="session in sessionsStore.groupedSessions.today" :key="session.id">
          <div
            class="group relative flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer text-sm transition-colors"
            :class="[
              collapsed ? 'justify-center' : '',
              session.id === sessionsStore.currentSessionId && route.path === '/'
                ? 'bg-sidebar-active text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            ]"
            :title="collapsed ? session.title : ''"
            @click="handleSwitchSession(session.id)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="shrink-0">
              <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z"
                stroke="currentColor" stroke-width="1.3"/>
              <path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>

            <template v-if="!collapsed">
              <div v-if="editingId === session.id" class="flex-1 min-w-0" @click.stop>
                <input
                  v-model="editingTitle"
                  class="w-full bg-bg-primary border border-accent rounded px-1 py-0.5 text-xs text-text-primary outline-none"
                  @keydown.enter="commitEdit(session.id)"
                  @keydown.escape="cancelEdit"
                  @blur="commitEdit(session.id)"
                  autofocus
                />
              </div>
              <span v-else class="flex-1 truncate text-xs">{{ session.title }}</span>

              <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button
                  class="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-primary opacity-60 hover:opacity-100"
                  :title="t('common.rename')"
                  @click="startEdit(session.id, session.title, $event)"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2v-2l6.5-6.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button
                  class="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-primary opacity-60 hover:opacity-100 hover:text-red-400"
                  :title="t('common.delete')"
                  @click="handleDeleteSession(session.id, $event)"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.5 7h5L9 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Yesterday -->
      <template v-if="sessionsStore.groupedSessions.yesterday.length > 0">
        <p v-if="!collapsed" class="px-2 pt-2 pb-1 text-xs text-text-tertiary font-medium">{{ t('common.yesterday') }}</p>
        <div v-for="session in sessionsStore.groupedSessions.yesterday" :key="session.id">
          <div
            class="group relative flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer text-sm transition-colors"
            :class="[
              collapsed ? 'justify-center' : '',
              session.id === sessionsStore.currentSessionId && route.path === '/'
                ? 'bg-sidebar-active text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            ]"
            :title="collapsed ? session.title : ''"
            @click="handleSwitchSession(session.id)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="shrink-0">
              <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z"
                stroke="currentColor" stroke-width="1.3"/>
              <path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <template v-if="!collapsed">
              <span class="flex-1 truncate text-xs">{{ session.title }}</span>
              <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button class="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-primary opacity-60 hover:opacity-100"
                  :title="t('common.rename')" @click="startEdit(session.id, session.title, $event)">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2v-2l6.5-6.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button class="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-primary opacity-60 hover:opacity-100 hover:text-red-400"
                  :title="t('common.delete')" @click="handleDeleteSession(session.id, $event)">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.5 7h5L9 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- This week -->
      <template v-if="sessionsStore.groupedSessions.thisWeek.length > 0">
        <p v-if="!collapsed" class="px-2 pt-2 pb-1 text-xs text-text-tertiary font-medium">{{ t('common.thisWeek') }}</p>
        <div v-for="session in sessionsStore.groupedSessions.thisWeek" :key="session.id">
          <div
            class="group relative flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer text-sm transition-colors"
            :class="[
              collapsed ? 'justify-center' : '',
              session.id === sessionsStore.currentSessionId && route.path === '/'
                ? 'bg-sidebar-active text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            ]"
            :title="collapsed ? session.title : ''"
            @click="handleSwitchSession(session.id)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="shrink-0">
              <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z"
                stroke="currentColor" stroke-width="1.3"/>
              <path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <template v-if="!collapsed">
              <span class="flex-1 truncate text-xs">{{ session.title }}</span>
              <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button class="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-primary opacity-60 hover:opacity-100"
                  :title="t('common.rename')" @click="startEdit(session.id, session.title, $event)">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2v-2l6.5-6.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button class="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-primary opacity-60 hover:opacity-100 hover:text-red-400"
                  :title="t('common.delete')" @click="handleDeleteSession(session.id, $event)">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.5 7h5L9 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Older -->
      <template v-if="sessionsStore.groupedSessions.older.length > 0">
        <p v-if="!collapsed" class="px-2 pt-2 pb-1 text-xs text-text-tertiary font-medium">{{ t('common.older') }}</p>
        <div v-for="session in sessionsStore.groupedSessions.older" :key="session.id">
          <div
            class="group relative flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer text-sm transition-colors"
            :class="[
              collapsed ? 'justify-center' : '',
              session.id === sessionsStore.currentSessionId && route.path === '/'
                ? 'bg-sidebar-active text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            ]"
            :title="collapsed ? session.title : ''"
            @click="handleSwitchSession(session.id)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="shrink-0">
              <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z"
                stroke="currentColor" stroke-width="1.3"/>
              <path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <template v-if="!collapsed">
              <span class="flex-1 truncate text-xs">{{ session.title }}</span>
              <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button class="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-primary opacity-60 hover:opacity-100"
                  :title="t('common.rename')" @click="startEdit(session.id, session.title, $event)">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2v-2l6.5-6.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button class="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-primary opacity-60 hover:opacity-100 hover:text-red-400"
                  :title="t('common.delete')" @click="handleDeleteSession(session.id, $event)">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.5 7h5L9 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- Bottom nav: MCP, Settings, About -->
    <div class="shrink-0 border-t border-border px-2 py-2 space-y-0.5">
      <router-link
        v-for="item in bottomNav"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors"
        :class="[
          collapsed ? 'justify-center' : '',
          route.path === item.path
            ? 'bg-sidebar-active text-accent font-medium'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
        ]"
        :title="collapsed ? t(item.labelKey) : ''"
      >
        <span class="text-base shrink-0">{{ item.icon }}</span>
        <span v-if="!collapsed" class="text-xs truncate">{{ t(item.labelKey) }}</span>
      </router-link>
    </div>
  </aside>
</template>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
