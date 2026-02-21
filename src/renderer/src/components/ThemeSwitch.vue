<script setup lang="ts">
import { useThemeStore, type ThemeMode } from '../stores/theme'

const themeStore = useThemeStore()

const options: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '☀️ Light' },
  { value: 'dark', label: '🌙 Dark' },
  { value: 'system', label: '💻 System' }
]
</script>

<template>
  <div class="flex rounded-lg border border-border overflow-hidden">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="px-3 py-1.5 text-sm transition-colors"
      :class="
        themeStore.mode === opt.value
          ? 'bg-accent text-white font-medium'
          : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
      "
      @click="themeStore.setMode(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
