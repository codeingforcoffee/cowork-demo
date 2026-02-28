<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  send: [content: string, files: { name: string; path: string; content: string }[]];
  abort: [];
}>();

defineProps<{ isStreaming: boolean }>();

const input = ref('');
const attachedFiles = ref<{ name: string; path: string; content: string }[]>([]);

async function handleAttachFile(): Promise<void> {
  const filePath = await window.api.pickFile();
  if (!filePath) return;

  const alreadyAttached = attachedFiles.value.some((f) => f.path === filePath);
  if (alreadyAttached) return;

  try {
    const fileInfo = await window.api.readFile(filePath);
    attachedFiles.value.push({
      name: fileInfo.name,
      path: filePath,
      content: fileInfo.content
    });
  } catch (err) {
    console.error('Failed to read file:', err);
  }
}

function removeFile(path: string): void {
  attachedFiles.value = attachedFiles.value.filter((f) => f.path !== path);
}

function handleSend(): void {
  const text = input.value.trim();
  if (!text) return;

  emit('send', text, [...attachedFiles.value]);
  input.value = '';
  attachedFiles.value = [];
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}
</script>

<template>
  <div class="border-t border-border bg-bg-primary px-4 py-3">
    <!-- Attached files preview -->
    <div v-if="attachedFiles.length > 0" class="flex flex-wrap gap-2 mb-2">
      <div
        v-for="file in attachedFiles"
        :key="file.path"
        class="flex items-center gap-1.5 rounded-lg bg-bg-secondary border border-border px-2.5 py-1 text-xs text-text-secondary"
      >
        <span>📎</span>
        <span class="max-w-[150px] truncate">{{ file.name }}</span>
        <button
          class="ml-1 text-text-tertiary hover:text-text-primary transition-colors"
          @click="removeFile(file.path)"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="flex items-end gap-2">
      <button
        class="shrink-0 w-9 h-9 rounded-lg border border-border bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors flex items-center justify-center"
        title="Attach file"
        @click="handleAttachFile"
      >
        📂
      </button>

      <div class="flex-1 relative">
        <textarea
          v-model="input"
          :disabled="isStreaming"
          class="w-full resize-none rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
          :rows="1"
          placeholder="Type a message... (Shift+Enter for new line)"
          @keydown="handleKeydown"
        />
      </div>

      <button
        v-if="!isStreaming"
        class="shrink-0 h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40"
        :disabled="!input.trim()"
        @click="handleSend"
      >
        Send
      </button>
      <button
        v-else
        class="shrink-0 h-9 px-4 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
        @click="emit('abort')"
      >
        Stop
      </button>
    </div>
  </div>
</template>
