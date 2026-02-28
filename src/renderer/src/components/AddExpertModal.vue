<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Expert } from '../stores/experts';
import type { McpServer } from '../stores/mcp';

const { t } = useI18n();

export type AddExpertModalProps = {
  open: boolean;
  editingExpert?: Expert | null;
  busy?: boolean;
  availableMcps: McpServer[];
};

const props = withDefaults(defineProps<AddExpertModalProps>(), {
  editingExpert: null,
  busy: false,
  availableMcps: () => []
});

const emit = defineEmits<{
  close: [];
  add: [entry: Omit<Expert, 'id' | 'createdAt' | 'updatedAt'>];
  update: [id: string, entry: Partial<Expert>];
}>();

const name = ref('');
const description = ref('');
const mcpIds = ref<string[]>([]);
const systemPrompt = ref('');
const error = ref<string | null>(null);

const isEdit = () => !!props.editingExpert;

function reset(): void {
  name.value = '';
  description.value = '';
  mcpIds.value = [];
  systemPrompt.value = '';
  error.value = null;
}

function handleClose(): void {
  reset();
  emit('close');
}

function toggleMcp(id: string): void {
  const idx = mcpIds.value.indexOf(id);
  if (idx === -1) {
    mcpIds.value.push(id);
  } else {
    mcpIds.value.splice(idx, 1);
  }
}

function handleSubmit(): void {
  error.value = null;

  const trimmedName = name.value.trim();
  if (!trimmedName) {
    error.value = t('experts.errorNameRequired');
    return;
  }

  const trimmedPrompt = systemPrompt.value.trim();
  if (!trimmedPrompt) {
    error.value = t('experts.errorPromptRequired');
    return;
  }

  if (isEdit()) {
    emit('update', props.editingExpert!.id, {
      name: trimmedName,
      description: description.value.trim(),
      mcpIds: [...mcpIds.value],
      systemPrompt: trimmedPrompt
    });
  } else {
    emit('add', {
      name: trimmedName,
      description: description.value.trim(),
      mcpIds: [...mcpIds.value],
      systemPrompt: trimmedPrompt
    });
  }
  handleClose();
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.editingExpert) {
        name.value = props.editingExpert.name;
        description.value = props.editingExpert.description || '';
        mcpIds.value = [...props.editingExpert.mcpIds];
        systemPrompt.value = props.editingExpert.systemPrompt || '';
      } else {
        reset();
      }
      error.value = null;
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="handleClose" />

      <div
        class="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-border bg-bg-secondary shadow-2xl overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 class="text-lg font-semibold text-text-primary">
              {{ isEdit() ? t('experts.modalTitleEdit') : t('experts.modalTitleCreate') }}
            </h2>
            <p class="text-sm text-text-tertiary">
              {{ isEdit() ? t('experts.modalDescEdit') : t('experts.modalDescCreate') }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            @click="handleClose"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto space-y-4 px-6 py-5">
          <div>
            <label class="mb-1 block text-xs font-medium text-text-secondary">{{
              t('experts.nameLabel')
            }}</label>
            <input
              v-model="name"
              type="text"
              :placeholder="t('experts.namePlaceholder')"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
              autofocus
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-text-secondary">{{
              t('experts.descLabel')
            }}</label>
            <input
              v-model="description"
              type="text"
              :placeholder="t('experts.descPlaceholder')"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-text-secondary">{{
              t('experts.mcpLabel')
            }}</label>
            <p class="mb-2 text-xs text-text-tertiary">{{ t('experts.mcpHint') }}</p>
            <div
              v-if="availableMcps.length === 0"
              class="rounded-lg border border-dashed border-border p-3 text-xs text-text-tertiary"
            >
              {{ t('experts.noMcps') }}
            </div>
            <div
              v-else
              class="space-y-1.5 max-h-32 overflow-y-auto rounded-lg border border-border p-2"
            >
              <label
                v-for="mcp in availableMcps"
                :key="mcp.id"
                class="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-bg-tertiary"
              >
                <input
                  type="checkbox"
                  :checked="mcpIds.includes(mcp.id)"
                  class="rounded border-border text-accent focus:ring-accent"
                  @change="toggleMcp(mcp.id)"
                />
                <span class="text-sm text-text-primary">{{ mcp.name }}</span>
                <span class="text-[10px] text-text-tertiary truncate">{{ mcp.description }}</span>
              </label>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-text-secondary">{{
              t('experts.promptLabel')
            }}</label>
            <textarea
              v-model="systemPrompt"
              rows="5"
              :placeholder="t('experts.promptPlaceholder')"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent resize-none"
            />
            <p class="mt-1 text-xs text-text-tertiary">
              {{ t('experts.promptHint') }}
            </p>
          </div>

          <div
            v-if="error"
            class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500"
          >
            {{ error }}
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex items-center justify-end gap-3 border-t border-border bg-bg-secondary/50 px-6 py-4 shrink-0"
        >
          <button
            type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            @click="handleClose"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="busy"
            class="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            @click="handleSubmit"
          >
            <svg v-if="busy" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ isEdit() ? t('experts.save') : t('experts.create') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
