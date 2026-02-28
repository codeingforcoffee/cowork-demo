import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

export type ThemeMode = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem('corwork.themePref') as ThemeMode) || 'system');

  const resolved = ref<'light' | 'dark'>(mode.value === 'system' ? getSystemTheme() : mode.value);

  function setMode(newMode: ThemeMode): void {
    mode.value = newMode;
    localStorage.setItem('corwork.themePref', newMode);
  }

  watch(
    mode,
    (m) => {
      resolved.value = m === 'system' ? getSystemTheme() : m;
      applyTheme(resolved.value);
    },
    { immediate: true }
  );

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', () => {
    if (mode.value === 'system') {
      resolved.value = getSystemTheme();
      applyTheme(resolved.value);
    }
  });

  return { mode, resolved, setMode };
});
