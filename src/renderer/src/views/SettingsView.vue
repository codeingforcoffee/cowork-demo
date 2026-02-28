<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ThemeSwitch from '../components/ThemeSwitch.vue'
import { useSettingsStore } from '../stores/settings'
import { setLocale, type Locale } from '../i18n'

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()
const saving = ref(false)

function onLocaleChange(newLocale: Locale): void {
  setLocale(newLocale)
}
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
    <h1 class="text-3xl font-bold text-text-primary mb-2">{{ t('settings.title') }}</h1>
    <p class="text-text-secondary mb-8">{{ t('settings.subtitle') }}</p>

    <div class="max-w-2xl space-y-6">
      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">{{ t('settings.llmApi') }}</h2>
        <p class="text-sm text-text-secondary mb-4">
          {{ t('settings.llmApiDesc') }}
        </p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">{{ t('settings.baseUrl') }}</label>
            <input
              v-model="settingsStore.llm.baseUrl"
              type="text"
              :placeholder="t('settings.baseUrlPlaceholder')"
              class="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
            <p class="mt-1 text-xs text-text-tertiary">
              {{ t('settings.baseUrlHint') }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">{{ t('settings.apiKey') }}</label>
            <input
              v-model="settingsStore.llm.apiKey"
              type="password"
              :placeholder="t('settings.apiKeyPlaceholder')"
              autocomplete="off"
              class="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
            <p class="mt-1 text-xs text-text-tertiary">{{ t('settings.apiKeyHint') }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">{{ t('settings.model') }}</label>
            <input
              v-model="settingsStore.llm.model"
              type="text"
              :placeholder="t('settings.modelPlaceholder')"
              class="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
            <p class="mt-1 text-xs text-text-tertiary">
              {{ t('settings.modelHint') }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              :disabled="saving"
              @click="saveLLM"
            >
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
            <span v-if="saved" class="text-sm text-green-600 dark:text-green-400">{{ t('common.saved') }}</span>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">{{ t('settings.appearance') }}</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-primary">{{ t('theme.title') }}</p>
            <p class="text-sm text-text-secondary">{{ t('theme.description') }}</p>
          </div>
          <ThemeSwitch />
        </div>
      </section>

      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">{{ t('settings.general') }}</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-primary">{{ t('language.title') }}</p>
            <p class="text-sm text-text-secondary">{{ t('language.description') }}</p>
          </div>
          <select
            :value="locale"
            class="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            @change="onLocaleChange(($event.target as HTMLSelectElement).value as Locale)"
          >
            <option value="en">{{ t('language.en') }}</option>
            <option value="zh-CN">{{ t('language.zhCN') }}</option>
          </select>
        </div>
      </section>
    </div>
  </div>
</template>
