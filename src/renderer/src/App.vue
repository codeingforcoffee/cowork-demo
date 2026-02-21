<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import { useThemeStore } from './stores/theme'
import { useSessionsStore } from './stores/sessions'
import { useMcpStore } from './stores/mcp'

useThemeStore()

const sessionsStore = useSessionsStore()
const mcpStore = useMcpStore()

const sidebarCollapsed = ref(
  localStorage.getItem('corwork.sidebarCollapsed') === 'true'
)

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('corwork.sidebarCollapsed', String(sidebarCollapsed.value))
}

onMounted(async () => {
  await Promise.all([sessionsStore.init(), mcpStore.init()])
})
</script>

<template>
  <div class="flex h-screen bg-bg-primary min-h-0">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
    <main class="flex-1 min-h-0 overflow-hidden">
      <RouterView />
    </main>
  </div>
</template>
