<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSkillsStore, type Skill } from '../stores/skills';
import ThemeSwitch from '../components/ThemeSwitch.vue';
import AddSkillModal from '../components/AddSkillModal.vue';

const { t } = useI18n();
const skillsStore = useSkillsStore();

const modalOpen = ref(false);
const editingSkill = ref<Skill | null>(null);
const busy = ref(false);

onMounted(async () => {
  await skillsStore.init();
});

function openAddForm(): void {
  editingSkill.value = null;
  modalOpen.value = true;
}

function openEditForm(skill: Skill): void {
  editingSkill.value = skill;
  modalOpen.value = true;
}

function closeModal(): void {
  modalOpen.value = false;
  editingSkill.value = null;
}

async function handleAdd(entry: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  busy.value = true;
  try {
    await skillsStore.addSkill(entry);
  } finally {
    busy.value = false;
  }
}

async function handleUpdate(id: string, updates: Partial<Skill>): Promise<void> {
  busy.value = true;
  try {
    await skillsStore.updateSkill(id, updates);
  } finally {
    busy.value = false;
  }
}

async function removeSkill(id: string): Promise<void> {
  await skillsStore.removeSkill(id);
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <header class="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
      <div>
        <h1 class="text-lg font-bold text-text-primary">{{ t('skills.title') }}</h1>
        <p class="text-xs text-text-tertiary mt-0.5">{{ t('skills.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          @click="openAddForm"
        >
          + {{ t('skills.createSkill') }}
        </button>
        <ThemeSwitch />
      </div>
    </header>

    <AddSkillModal
      :open="modalOpen"
      :editing-skill="editingSkill"
      :busy="busy"
      @close="closeModal"
      @add="handleAdd"
      @update="handleUpdate"
    />

    <div class="flex-1 overflow-y-auto p-6">
      <!-- Concept intro -->
      <div class="mb-6 rounded-xl border border-border bg-bg-secondary p-4">
        <h3 class="text-xs font-semibold text-text-secondary mb-2">
          {{ t('skills.whatIsSkill') }}
        </h3>
        <p class="text-xs text-text-tertiary leading-relaxed">
          {{ t('skills.whatIsSkillDesc') }}
        </p>
      </div>

      <!-- Skill list -->
      <section>
        <h2 class="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
          {{ t('skills.mySkills') }}
        </h2>

        <div
          v-if="skillsStore.skills.length === 0"
          class="rounded-xl border border-dashed border-border p-8 text-center"
        >
          <div class="text-text-tertiary mb-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              class="mx-auto mb-3 opacity-40"
            >
              <circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M16 10v12M10 16h12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <p class="text-sm text-text-secondary">{{ t('skills.noSkills') }}</p>
          <p class="text-xs text-text-tertiary mt-1">{{ t('skills.noSkillsHint') }}</p>
          <button
            class="mt-3 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            @click="openAddForm"
          >
            + {{ t('skills.createSkill') }}
          </button>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="skill in skillsStore.skills"
            :key="skill.id"
            class="flex items-center gap-4 rounded-xl border border-border bg-bg-secondary px-4 py-3"
          >
            <div
              class="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0"
            >
              <span class="text-base">📋</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ skill.name }}</p>
              <p v-if="skill.description" class="text-xs text-text-tertiary mt-0.5">
                {{ skill.description }}
              </p>
              <p v-if="skill.content" class="text-xs text-text-tertiary mt-1 line-clamp-2">
                {{ skill.content }}
              </p>
            </div>
            <div class="shrink-0 flex items-center gap-1">
              <button
                class="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                @click="openEditForm(skill)"
              >
                {{ t('skills.edit') }}
              </button>
              <button
                class="rounded-lg border border-border px-2.5 py-1 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                @click="removeSkill(skill.id)"
              >
                {{ t('skills.deleteBtn') }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
