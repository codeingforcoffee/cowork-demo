import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const useSkillsStore = defineStore('skills', () => {
  const skills = ref<Skill[]>([]);
  const initialized = ref(false);

  async function init(): Promise<void> {
    if (initialized.value) return;
    try {
      const data = await window.api.loadSkills();
      skills.value = data.skills || [];
    } catch {
      skills.value = [];
    }
    initialized.value = true;
  }

  async function addSkill(skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> {
    const now = Date.now();
    const newSkill: Skill = {
      ...skill,
      id: `skill-${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now
    };
    skills.value.push(newSkill);
    await persistSkills();
    return newSkill;
  }

  async function updateSkill(id: string, updates: Partial<Omit<Skill, 'id'>>): Promise<void> {
    const idx = skills.value.findIndex((s) => s.id === id);
    if (idx !== -1) {
      skills.value[idx] = {
        ...skills.value[idx],
        ...updates,
        updatedAt: Date.now()
      };
      await persistSkills();
    }
  }

  async function removeSkill(id: string): Promise<void> {
    const idx = skills.value.findIndex((s) => s.id === id);
    if (idx !== -1) {
      skills.value.splice(idx, 1);
      await persistSkills();
    }
  }

  async function persistSkills(): Promise<void> {
    await window.api.saveSkills(JSON.parse(JSON.stringify({ skills: skills.value })));
  }

  function getSkillById(id: string): Skill | undefined {
    return skills.value.find((s) => s.id === id);
  }

  return {
    skills: computed(() => skills.value),
    initialized,
    init,
    addSkill,
    updateSkill,
    removeSkill,
    getSkillById
  };
});
