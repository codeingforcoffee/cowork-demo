<script setup lang="ts">
import { ref, onMounted } from 'vue';

const appVersion = ref('...');
const systemInfo = ref<{ platform: string; arch: string; nodeVersion: string } | null>(null);

onMounted(async () => {
  try {
    appVersion.value = await window.api.getAppVersion();
    systemInfo.value = await window.api.getSystemInfo();
  } catch {
    appVersion.value = 'N/A';
  }
});

function openExternal(url: string): void {
  window.api.openExternalUrl(url);
}
</script>

<template>
  <div class="flex-1 p-8 overflow-y-auto">
    <h1 class="text-3xl font-bold text-text-primary mb-2">About</h1>
    <p class="text-text-secondary mb-8">Application info and IPC communication demo.</p>

    <div class="max-w-2xl space-y-6">
      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Application</h2>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-text-secondary">Name</span>
            <span class="text-text-primary font-medium">Corwork Demo</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">Version</span>
            <span class="font-mono text-text-primary">{{ appVersion }}</span>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">System (via IPC)</h2>
        <div v-if="systemInfo" class="space-y-3">
          <div class="flex justify-between">
            <span class="text-text-secondary">Platform</span>
            <span class="font-mono text-text-primary">{{ systemInfo.platform }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">Architecture</span>
            <span class="font-mono text-text-primary">{{ systemInfo.arch }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">Node.js</span>
            <span class="font-mono text-text-primary">{{ systemInfo.nodeVersion }}</span>
          </div>
        </div>
        <div v-else class="text-text-tertiary text-sm">Loading system info...</div>
      </section>

      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Links</h2>
        <div class="flex gap-3">
          <button
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
            @click="openExternal('https://electron-vite.org')"
          >
            electron-vite Docs
          </button>
          <button
            class="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-border"
            @click="openExternal('https://vuejs.org')"
          >
            Vue.js Docs
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
