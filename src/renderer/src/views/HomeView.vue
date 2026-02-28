<script setup lang="ts"></script>

<template>
  <div class="flex-1 p-8 overflow-y-auto">
    <h1 class="text-3xl font-bold text-text-primary mb-2">Welcome to Corwork</h1>
    <p class="text-text-secondary mb-8">
      An Electron desktop app built with Vue 3, Vite, and TypeScript.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
      <div class="rounded-xl border border-border bg-bg-secondary p-6">
        <div class="text-2xl mb-3">⚡</div>
        <h3 class="text-lg font-semibold text-text-primary mb-1">Electron + Vite</h3>
        <p class="text-sm text-text-secondary">
          Fast HMR development with electron-vite. Main process hot-reload included.
        </p>
      </div>

      <div class="rounded-xl border border-border bg-bg-secondary p-6">
        <div class="text-2xl mb-3">💚</div>
        <h3 class="text-lg font-semibold text-text-primary mb-1">Vue 3 + TypeScript</h3>
        <p class="text-sm text-text-secondary">
          Composition API, script setup, and full type safety out of the box.
        </p>
      </div>

      <div class="rounded-xl border border-border bg-bg-secondary p-6">
        <div class="text-2xl mb-3">🎨</div>
        <h3 class="text-lg font-semibold text-text-primary mb-1">Tailwind CSS v4</h3>
        <p class="text-sm text-text-secondary">
          Utility-first CSS with dark mode support via custom theme tokens.
        </p>
      </div>

      <div class="rounded-xl border border-border bg-bg-secondary p-6">
        <div class="text-2xl mb-3">🔒</div>
        <h3 class="text-lg font-semibold text-text-primary mb-1">Secure IPC</h3>
        <p class="text-sm text-text-secondary">
          Context-isolated preload bridge for safe main-renderer communication.
        </p>
      </div>
    </div>
  </div>
</template>
