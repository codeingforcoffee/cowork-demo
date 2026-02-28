import { ref } from 'vue';
import { defineStore } from 'pinia';

export interface LLMSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const useSettingsStore = defineStore('settings', () => {
  const llm = ref<LLMSettings>({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini'
  });
  const loaded = ref(false);

  async function load(): Promise<void> {
    try {
      const settings = await window.api.loadSettings();
      llm.value = { ...llm.value, ...settings.llm };
      loaded.value = true;
    } catch {
      loaded.value = true;
    }
  }

  async function save(): Promise<void> {
    // Vue 的 ref 会将对象包装为 Proxy，IPC 无法克隆 Proxy，需转为普通对象
    await window.api.saveSettings({ llm: { ...llm.value } });
  }

  return { llm, loaded, load, save };
});
