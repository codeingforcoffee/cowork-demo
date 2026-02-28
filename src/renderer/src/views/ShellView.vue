<script setup lang="ts">
import { ref } from 'vue';

const command = ref('corepack enable');
const output = ref('');
const running = ref(false);
const lastResult = ref<{ stdout: string; stderr: string; exitCode: number; error?: string } | null>(
  null
);

const presets = [
  { label: '启用 corepack', cmd: 'corepack enable' },
  { label: 'pnpm 版本', cmd: 'pnpm --version' },
  { label: 'node 版本', cmd: 'node --version' },
  { label: 'dir (Win)', cmd: 'dir' },
  { label: 'ls (Mac/Linux)', cmd: 'ls -la' }
];

async function runCommand(): Promise<void> {
  if (!command.value.trim() || running.value) return;
  running.value = true;
  output.value = '执行中...';
  lastResult.value = null;

  try {
    const result = await window.api.execShell(command.value.trim());
    lastResult.value = result;
    const parts: string[] = [];
    if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
    if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
    if (result.error) parts.push(`error: ${result.error}`);
    parts.push(`\n退出码: ${result.exitCode}`);
    output.value = parts.join('\n\n') || '(无输出)';
  } catch (e) {
    output.value = `执行失败: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    running.value = false;
  }
}

function usePreset(cmd: string): void {
  command.value = cmd;
}
</script>

<template>
  <div class="flex-1 p-8 overflow-y-auto">
    <h1 class="text-3xl font-bold text-text-primary mb-2">Shell 命令执行</h1>
    <p class="text-text-secondary mb-6">
      跨平台执行 shell 命令（Windows / Mac / Linux）。示例：启用 corepack、查看 pnpm 版本等。
    </p>

    <div class="max-w-3xl space-y-6">
      <section class="rounded-xl border border-border bg-bg-secondary p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">执行命令</h2>
        <div class="flex gap-2 mb-4">
          <input
            v-model="command"
            type="text"
            placeholder="输入命令，如 corepack enable"
            class="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-accent"
            :disabled="running"
            @keydown.enter="runCommand"
          />
          <button
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            :disabled="running || !command.trim()"
            @click="runCommand"
          >
            {{ running ? '执行中...' : '执行' }}
          </button>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <span class="text-sm text-text-tertiary">快捷命令：</span>
          <button
            v-for="p in presets"
            :key="p.cmd"
            class="rounded-md border border-border bg-bg-tertiary px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
            @click="usePreset(p.cmd)"
          >
            {{ p.label }}
          </button>
        </div>

        <div class="rounded-lg border border-border bg-bg-tertiary p-4">
          <pre class="text-sm text-text-primary whitespace-pre-wrap break-words font-mono">{{
            output || '点击执行或选择快捷命令'
          }}</pre>
        </div>
        <p v-if="lastResult" class="mt-2 text-xs text-text-tertiary">
          退出码: {{ lastResult.exitCode }}
          <span v-if="lastResult.exitCode === 0" class="text-green-500">(成功)</span>
          <span v-else class="text-amber-500">(非零)</span>
        </p>
      </section>
    </div>
  </div>
</template>
