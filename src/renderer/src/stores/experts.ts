import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface Expert {
  id: string;
  name: string;
  description: string;
  mcpIds: string[];
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export const useExpertsStore = defineStore('experts', () => {
  const experts = ref<Expert[]>([]);
  const initialized = ref(false);

  async function init(): Promise<void> {
    if (initialized.value) return;
    try {
      const data = await window.api.loadExperts();
      experts.value = data.experts || [];
    } catch {
      experts.value = [];
    }
    initialized.value = true;
  }

  async function addExpert(
    expert: Omit<Expert, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Expert> {
    const now = Date.now();
    const newExpert: Expert = {
      ...expert,
      id: `expert-${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now
    };
    experts.value.push(newExpert);
    await persistExperts();
    return newExpert;
  }

  async function updateExpert(id: string, updates: Partial<Omit<Expert, 'id'>>): Promise<void> {
    const idx = experts.value.findIndex((e) => e.id === id);
    if (idx !== -1) {
      experts.value[idx] = {
        ...experts.value[idx],
        ...updates,
        updatedAt: Date.now()
      };
      await persistExperts();
    }
  }

  async function removeExpert(id: string): Promise<void> {
    const idx = experts.value.findIndex((e) => e.id === id);
    if (idx !== -1) {
      experts.value.splice(idx, 1);
      await persistExperts();
    }
  }

  async function persistExperts(): Promise<void> {
    await window.api.saveExperts(JSON.parse(JSON.stringify({ experts: experts.value })));
  }

  function getExpertById(id: string): Expert | undefined {
    return experts.value.find((e) => e.id === id);
  }

  return {
    experts: computed(() => experts.value),
    initialized,
    init,
    addExpert,
    updateExpert,
    removeExpert,
    getExpertById
  };
});
