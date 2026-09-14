<script setup lang="ts">
import { content } from '../game/content'
import type { RunState } from '../game/types'
defineProps<{ state: RunState }>()
const environmentNames = Object.fromEntries(
  content.environments.map((entry) => [entry.id, entry.name]),
)
</script>
<template>
  <section class="panel p-5">
    <h2 class="section-title">演化记录</h2>
    <ol class="mt-4 max-h-80 space-y-4 overflow-y-auto pr-2" aria-label="演化时间线">
      <li
        v-for="(entry, index) in [...state.timeline].reverse()"
        :key="`${entry.generation}-${index}`"
        class="flex gap-3 text-sm"
      >
        <span class="shrink-0 pt-0.5 text-xs tabular-nums text-slate-400"
          >第 {{ entry.generation }} 代</span
        >
        <div>
          <p class="font-medium text-slate-800">{{ entry.title }}</p>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">{{ entry.detail }}</p>
        </div>
      </li>
    </ol>
    <details class="mt-5 border-t border-slate-200 pt-4">
      <summary class="cursor-pointer text-sm font-medium text-slate-700">
        全部世代结算 · {{ state.history.length }} 代
      </summary>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full min-w-150 text-left text-xs">
          <caption class="sr-only">
            每个世代的环境、表达性状与种群变化
          </caption>
          <thead class="text-slate-500">
            <tr>
              <th class="table-cell">世代</th>
              <th class="table-cell">环境</th>
              <th class="table-cell">表达性状</th>
              <th class="table-cell text-right">出生</th>
              <th class="table-cell text-right">死亡</th>
              <th class="table-cell text-right">种群</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="result in state.history"
              :key="result.generation"
              class="border-t border-slate-100"
            >
              <td class="table-cell tabular-nums">{{ result.generation }}</td>
              <td class="table-cell whitespace-nowrap">
                {{ environmentNames[result.environmentId] }}
              </td>
              <td class="table-cell">
                {{
                  result.expressedTraitIds.map((id) => content.traits[id]!.name).join('、') ||
                  '未表达'
                }}
              </td>
              <td class="table-cell text-right tabular-nums text-emerald-800">
                +{{ result.births }}
              </td>
              <td class="table-cell text-right tabular-nums text-amber-800">
                −{{ result.totalDeaths }}
              </td>
              <td class="table-cell text-right font-medium tabular-nums">
                {{ result.populationAfter }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!state.history.length" class="py-3 text-xs text-slate-500">
          完成第一个世代后，这里会记录物种的变化。
        </p>
      </div>
    </details>
  </section>
</template>
