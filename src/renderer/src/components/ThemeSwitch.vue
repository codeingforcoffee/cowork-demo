<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useThemeStore, type ThemeMode } from '../stores/theme';

const { t } = useI18n();
const themeStore = useThemeStore();

const options: { value: ThemeMode; labelKey: string }[] = [
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' },
  { value: 'system', labelKey: 'theme.system' }
];
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
      {{ t(opt.labelKey) }}
    </button>
  </div>
</template>
