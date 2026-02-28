<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Skill } from '../stores/skills';

const { t } = useI18n();

export type AddSkillModalProps = {
  open: boolean;
  editingSkill?: Skill | null;
  busy?: boolean;
};

const props = withDefaults(defineProps<AddSkillModalProps>(), {
  editingSkill: null,
  busy: false
});

const emit = defineEmits<{
  close: [];
  add: [entry: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>];
  update: [id: string, entry: Partial<Skill>];
}>();

const name = ref('');
const description = ref('');
const content = ref('');
const error = ref<string | null>(null);

const isEdit = () => !!props.editingSkill;

function reset(): void {
  name.value = '';
  description.value = '';
  content.value = '';
  error.value = null;
}

function handleClose(): void {
  reset();
  emit('close');
}

function handleSubmit(): void {
  error.value = null;

  const trimmedName = name.value.trim();
  if (!trimmedName) {
    error.value = t('skills.errorNameRequired');
    return;
  }

  const trimmedContent = content.value.trim();
  if (!trimmedContent) {
    error.value = t('skills.errorContentRequired');
    return;
  }

  if (isEdit()) {
    emit('update', props.editingSkill!.id, {
      name: trimmedName,
      description: description.value.trim(),
      content: trimmedContent
    });
  } else {
    emit('add', {
      name: trimmedName,
      description: description.value.trim(),
      content: trimmedContent
    });
  }
  handleClose();
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.editingSkill) {
        name.value = props.editingSkill.name;
        description.value = props.editingSkill.description || '';
        content.value = props.editingSkill.content || '';
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
              {{ isEdit() ? t('skills.modalTitleEdit') : t('skills.modalTitleCreate') }}
            </h2>
            <p class="text-sm text-text-tertiary">
              {{ isEdit() ? t('skills.modalDescEdit') : t('skills.modalDescCreate') }}
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
              t('skills.nameLabel')
            }}</label>
            <input
              v-model="name"
              type="text"
              :placeholder="t('skills.namePlaceholder')"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
              autofocus
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-text-secondary">{{
              t('skills.descLabel')
            }}</label>
            <input
              v-model="description"
              type="text"
              :placeholder="t('skills.descPlaceholder')"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-text-secondary">{{
              t('skills.contentLabel')
            }}</label>
            <textarea
              v-model="content"
              rows="8"
              :placeholder="t('skills.contentPlaceholder')"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent resize-none font-mono"
            />
            <p class="mt-1 text-xs text-text-tertiary">
              {{ t('skills.contentHint') }}
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
            {{ isEdit() ? t('skills.save') : t('skills.create') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
