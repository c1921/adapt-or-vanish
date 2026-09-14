<script setup lang="ts">
import { computed } from 'vue'
import { evolutionTimeline } from '../game/analysis'
import { content } from '../game/content'
import { totalGenerations } from '../game/engine'
import { percent } from '../game/presentation'
import type { RunState, TimelineEntry } from '../game/types'

const props = defineProps<{ state: RunState }>()

const rows = computed(() => evolutionTimeline(props.state, content))
const total = totalGenerations(content)
const kindIcons: Record<TimelineEntry['kind'], string> = {
  environment: '🌍',
  fixation: '🧬',
  mutation: '🧬',
  acquisition: '✨',
  ending: '🏁',
}
const sign = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '±0')
const environmentNames = Object.fromEntries(
  content.environments.map((entry) => [entry.id, entry.name]),
)
</script>

<template>
  <details class="panel p-5">
    <summary class="cursor-pointer text-sm font-semibold">
      <span aria-hidden="true">📜</span>
      演化历史 · 已完成 {{ state.history.length }} / {{ total }} 代
    </summary>
    <p class="mt-2 text-xs text-slate-500">最新的一代排在最前面。这是这条谱系走过的路。</p>

    <ol v-if="rows.length" class="mt-4 space-y-3" aria-label="物种演化时间线">
      <li v-for="row in rows" :key="row.generation" class="flex gap-3">
        <div class="flex w-14 shrink-0 flex-col items-center pt-1">
          <span class="text-[11px] font-semibold tabular-nums text-slate-500"
            >第 {{ row.generation }} 代</span
          >
          <span aria-hidden="true" class="mt-1 w-px flex-1 bg-slate-200" />
        </div>
        <div class="min-w-0 flex-1 rounded-xl border border-slate-200 p-3">
          <p class="flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-800">
            <span aria-hidden="true">{{ row.environmentIcon }}</span>
            <span>{{ row.environmentName || environmentNames[row.environmentId] || '环境' }}</span>
            <span v-if="row.eventName" class="text-slate-500">· {{ row.eventName }}</span>
          </p>
          <p v-if="row.result" class="mt-1 text-sm tabular-nums text-slate-700">
            种群 {{ row.result.populationBefore }} → {{ row.result.populationAfter }}
            <span
              class="ml-1 font-medium"
              :class="
                row.result.populationAfter >= row.result.populationBefore
                  ? 'text-emerald-700'
                  : 'text-amber-800'
              "
              >{{ sign(row.result.populationAfter - row.result.populationBefore) }}</span
            >
            <span class="ml-2 text-xs text-slate-500"
              >存活率
              {{
                percent(
                  row.result.populationBefore > 0
                    ? row.result.populationAfter / row.result.populationBefore
                    : 1,
                )
              }}</span
            >
          </p>
          <p v-if="row.expressed.length" class="mt-1 text-xs text-slate-600">
            表达：{{ row.expressed.join(' · ') }}
          </p>
          <ul v-if="row.entries.length" class="mt-2 space-y-1">
            <li
              v-for="(entry, index) in row.entries"
              :key="`${entry.kind}-${index}`"
              class="text-xs leading-relaxed text-slate-600"
            >
              <span aria-hidden="true">{{ kindIcons[entry.kind] }}</span>
              <span class="font-medium text-slate-800">{{ entry.title }}</span>
              <span class="text-slate-500"> — {{ entry.detail }}</span>
            </li>
          </ul>
        </div>
      </li>
    </ol>
    <p v-else class="mt-3 text-xs text-slate-500">
      完成第一个世代后，这里会开始记录物种的演化过程。
    </p>

    <details class="mt-4 border-t border-slate-200 pt-3">
      <summary class="cursor-pointer text-sm font-medium text-slate-700">
        全部世代数据表 · {{ state.history.length }} 代
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
  </details>
</template>
