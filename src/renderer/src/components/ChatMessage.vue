<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../stores/chat';

const props = defineProps<{ message: ChatMessage }>();

const isUser = computed(() => props.message.role === 'user');
</script>

<template>
  <div class="flex gap-3 px-4 py-3" :class="isUser ? 'justify-end' : 'justify-start'">
    <div
      v-if="!isUser"
      class="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center text-sm font-bold shrink-0"
    >
      AI
    </div>

    <div
      class="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
      :class="
        isUser
          ? 'bg-accent text-white rounded-br-md'
          : 'bg-bg-secondary border border-border text-text-primary rounded-bl-md'
      "
    >
      <!-- Attached files -->
      <div v-if="message.files && message.files.length > 0" class="mb-2 space-y-1">
        <div
          v-for="file in message.files"
          :key="file.path"
          class="flex items-center gap-2 rounded-lg px-2 py-1 text-xs"
          :class="isUser ? 'bg-white/15' : 'bg-bg-tertiary'"
        >
          <span>📎</span>
          <span class="truncate">{{ file.name }}</span>
        </div>
      </div>

      <!-- Message content -->
      <div class="whitespace-pre-wrap break-words">{{ message.content }}</div>

      <!-- Streaming cursor -->
      <span
        v-if="!isUser && !message.content"
        class="inline-block w-2 h-4 bg-text-tertiary animate-pulse rounded-sm"
      />
    </div>

    <div
      v-if="isUser"
      class="w-8 h-8 rounded-lg bg-bg-tertiary text-text-secondary flex items-center justify-center text-sm font-bold shrink-0"
    >
      U
    </div>
  </div>
</template>
