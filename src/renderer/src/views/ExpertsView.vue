<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useExpertsStore, type Expert } from '../stores/experts';
import { useMcpStore } from '../stores/mcp';
import ThemeSwitch from '../components/ThemeSwitch.vue';
import AddExpertModal from '../components/AddExpertModal.vue';

const { t } = useI18n();
const expertsStore = useExpertsStore();
const mcpStore = useMcpStore();

const modalOpen = ref(false);
const editingExpert = ref<Expert | null>(null);
const busy = ref(false);

onMounted(async () => {
  await mcpStore.init();
  await expertsStore.init();
});

function openAddForm(): void {
  editingExpert.value = null;
  modalOpen.value = true;
}

function openEditForm(expert: Expert): void {
  editingExpert.value = expert;
  modalOpen.value = true;
}

function closeModal(): void {
  modalOpen.value = false;
  editingExpert.value = null;
}

async function handleAdd(entry: Omit<Expert, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  busy.value = true;
  try {
    await expertsStore.addExpert(entry);
  } finally {
    busy.value = false;
  }
}

async function handleUpdate(id: string, updates: Partial<Expert>): Promise<void> {
  busy.value = true;
  try {
    await expertsStore.updateExpert(id, updates);
  } finally {
    busy.value = false;
  }
}

async function removeExpert(id: string): Promise<void> {
  await expertsStore.removeExpert(id);
}

function getMcpNames(mcpIds: string[]): string[] {
  return mcpIds.map((id) => mcpStore.getServerById(id)?.name).filter((n): n is string => !!n);
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <header class="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
      <div>
        <h1 class="text-lg font-bold text-text-primary">{{ t('experts.title') }}</h1>
        <p class="text-xs text-text-tertiary mt-0.5">{{ t('experts.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          @click="openAddForm"
        >
          + {{ t('experts.createExpert') }}
        </button>
        <ThemeSwitch />
      </div>
    </header>

    <AddExpertModal
      :open="modalOpen"
      :editing-expert="editingExpert"
      :busy="busy"
      :available-mcps="mcpStore.allServers"
      @close="closeModal"
      @add="handleAdd"
      @update="handleUpdate"
    />

    <div class="flex-1 overflow-y-auto p-6">
      <!-- Concept intro -->
      <div class="mb-6 rounded-xl border border-border bg-bg-secondary p-4">
        <h3 class="text-xs font-semibold text-text-secondary mb-2">
          {{ t('experts.whatIsExpert') }}
        </h3>
        <p class="text-xs text-text-tertiary leading-relaxed">
          {{ t('experts.whatIsExpertDesc') }}
        </p>
      </div>

      <!-- Expert list -->
      <section>
        <h2 class="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
          {{ t('experts.myExperts') }}
        </h2>

        <div
          v-if="expertsStore.experts.length === 0"
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
          <p class="text-sm text-text-secondary">{{ t('experts.noExperts') }}</p>
          <p class="text-xs text-text-tertiary mt-1">{{ t('experts.noExpertsHint') }}</p>
          <button
            class="mt-3 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            @click="openAddForm"
          >
            + {{ t('experts.createExpert') }}
          </button>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="expert in expertsStore.experts"
            :key="expert.id"
            class="flex items-center gap-4 rounded-xl border border-border bg-bg-secondary px-4 py-3"
          >
            <div
              class="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0"
            >
              <span class="text-base">🧠</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ expert.name }}</p>
              <p v-if="expert.description" class="text-xs text-text-tertiary mt-0.5">
                {{ expert.description }}
              </p>
              <div v-if="expert.mcpIds.length > 0" class="flex flex-wrap gap-1 mt-1.5">
                <span
                  v-for="name in getMcpNames(expert.mcpIds)"
                  :key="name"
                  class="inline-flex rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] text-accent"
                >
                  {{ name }}
                </span>
              </div>
            </div>
            <div class="shrink-0 flex items-center gap-1">
              <button
                class="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                @click="openEditForm(expert)"
              >
                {{ t('experts.edit') }}
              </button>
              <button
                class="rounded-lg border border-border px-2.5 py-1 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                @click="removeExpert(expert.id)"
              >
                {{ t('experts.deleteBtn') }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
