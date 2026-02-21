<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ThemeSwitch from '../components/ThemeSwitch.vue'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()
const saving = ref(false)
const saved = ref(false)

onMounted(async () => {
  await settingsStore.load()
})

async function saveLLM(): Promise<void> {
  saving.value = true
  saved.value = false
  try {
    await settingsStore.save()
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex-1 p-8 overflow-y-auto">
    <h1 class="text-3xl font-bold text-text-primary mb-2">Settings</h1>
    <p class="text-text-secondary mb-8">Configure your application preferences.</p>

    <div class="max-w-2xl space-y-6">
      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">LLM API</h2>
        <p class="text-sm text-text-secondary mb-4">
          支持 OpenAI 兼容 API（OpenAI、Claude、Ollama、各类中转等）。API Key 仅保存在本地。
        </p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Base URL</label>
            <input
              v-model="settingsStore.llm.baseUrl"
              type="text"
              placeholder="https://api.openai.com/v1"
              class="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
            <p class="mt-1 text-xs text-text-tertiary">
              示例：OpenAI <code>https://api.openai.com/v1</code>，Ollama
              <code>http://localhost:11434/v1</code>
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">API Key</label>
            <input
              v-model="settingsStore.llm.apiKey"
              type="password"
              placeholder="sk-..."
              autocomplete="off"
              class="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
            <p class="mt-1 text-xs text-text-tertiary">Ollama 等本地模型可留空</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Model</label>
            <input
              v-model="settingsStore.llm.model"
              type="text"
              placeholder="gpt-4o-mini"
              class="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
            <p class="mt-1 text-xs text-text-tertiary">
              示例：gpt-4o-mini、gpt-4o、claude-3-5-sonnet、llama3.2 等
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              :disabled="saving"
              @click="saveLLM"
            >
              {{ saving ? '保存中...' : '保存' }}
            </button>
            <span v-if="saved" class="text-sm text-green-600 dark:text-green-400">已保存</span>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Appearance</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-primary">Theme</p>
            <p class="text-sm text-text-secondary">Select your preferred color scheme.</p>
          </div>
          <ThemeSwitch />
        </div>
      </section>

      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">General</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-primary">Language</p>
            <p class="text-sm text-text-secondary">Display language for the application.</p>
          </div>
          <select
            class="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="en">English</option>
            <option value="zh-cn">简体中文</option>
          </select>
        </div>
      </section>
    </div>
  </div>
</template>
