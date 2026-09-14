<script setup lang="ts">
import { computed } from 'vue'
import type { CauseRow } from '../game/analysis'
import { causeRows, forecastSummary } from '../game/analysis'
import { content } from '../game/content'
import { percent } from '../game/presentation'
import type { GenerationResult, RunState } from '../game/types'

const props = defineProps<{
  result: GenerationResult
  /** The same generation without new adaptations, used to explain every change. */
  baseline?: GenerationResult | null
  preview?: boolean
  temperature: RunState['environment']['temperature']
}>()

const summary = computed(() => forecastSummary(props.result, props.baseline ?? null))
const rows = computed<CauseRow[]>(() =>
  causeRows(props.result, props.baseline ?? null, props.temperature),
)
const format = (value: number, polarity: 'gain' | 'loss') =>
  value === 0 ? '0' : polarity === 'gain' ? `+${value}` : `−${value}`
/** Positive means this cause now costs fewer individuals than doing nothing. */
const improvement = (row: CauseRow) =>
  row.polarity === 'gain' ? row.value - row.baseline : row.baseline - row.value
const headline = computed(() => {
  const { delta, extinct, survivalRate } = summary.value
  if (extinct) return '这一代会灭绝'
  if (delta > 0) return `种群增加 ${delta} 个体 · 存活率 ${percent(survivalRate)}`
  if (delta === 0) return '种群规模不变'
  return `损失 ${Math.abs(delta)} 个体 · 存活率 ${percent(survivalRate)}`
})
</script>

<template>
  <section class="panel p-5" :aria-label="preview ? '生存预测' : '本代结算'">
    <div class="flex items-center justify-between gap-2">
      <h2 class="section-title flex items-center gap-1.5">
        <span aria-hidden="true">📉</span
        >{{ preview ? '生存预测' : `第 ${result.generation} 代结算` }}
      </h2>
      <span v-if="preview" class="chip border-emerald-200 bg-emerald-50 text-emerald-800"
        >随选择即时变化</span
      >
    </div>

    <div class="mt-3 flex flex-wrap items-end gap-3 tabular-nums">
      <span class="text-3xl leading-none text-slate-500">{{ result.populationBefore }}</span>
      <span aria-hidden="true" class="pb-1 text-slate-400">→</span>
      <span
        class="text-4xl leading-none font-semibold"
        :class="result.populationAfter === 0 ? 'text-red-700' : 'text-slate-900'"
        >{{ result.populationAfter }}</span
      >
      <span
        class="pb-1 text-sm font-medium"
        :class="summary.delta < 0 ? 'text-amber-800' : 'text-emerald-700'"
      >
        {{
          summary.delta > 0
            ? `+${summary.delta}`
            : summary.delta < 0
              ? `−${Math.abs(summary.delta)}`
              : '±0'
        }}
      </span>
    </div>
    <p class="mt-1 text-sm font-medium text-slate-700" aria-live="polite">{{ headline }}</p>

    <p
      v-if="summary.deltaVsBaseline !== null && summary.deltaVsBaseline !== 0"
      class="mt-2 text-xs font-medium"
      :class="summary.deltaVsBaseline > 0 ? 'text-emerald-700' : 'text-orange-800'"
    >
      {{
        summary.deltaVsBaseline > 0
          ? `比不做新的适应多存活 ${summary.deltaVsBaseline} 个体`
          : `比不做新的适应少存活 ${Math.abs(summary.deltaVsBaseline)} 个体`
      }}
    </p>

    <dl class="mt-4 space-y-1">
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
        :class="row.changed ? 'bg-slate-50' : ''"
      >
        <dt class="flex items-center gap-1.5 text-slate-600">
          <span aria-hidden="true">{{ row.icon }}</span
          >{{ row.label }}
        </dt>
        <dd class="ml-auto flex items-center gap-2 tabular-nums">
          <span v-if="row.changed" class="text-xs text-slate-400"
            >{{ format(row.baseline, row.polarity) }} →</span
          >
          <span
            class="font-semibold"
            :class="
              row.polarity === 'gain'
                ? 'text-emerald-700'
                : row.value > 0
                  ? 'text-amber-800'
                  : 'text-slate-400'
            "
            >{{ format(row.value, row.polarity) }}</span
          >
          <span
            v-if="row.changed && improvement(row) !== 0"
            class="chip"
            :class="
              improvement(row) > 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            "
          >
            <span aria-hidden="true">{{ improvement(row) > 0 ? '↑' : '↓' }}</span>
            {{ Math.abs(improvement(row)) }}
          </span>
        </dd>
      </div>
    </dl>

    <p
      v-if="summary.extinct"
      class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
    >
      {{
        preview
          ? '按当前选择，这一代结束时种群会归零。可以调整性状再试一次。'
          : '种群归零，这条谱系已经终止。'
      }}
    </p>
    <p
      v-else-if="preview && summary.endangered"
      class="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900"
    >
      ⚠ 种群濒临灭绝。再牺牲一个世代，谱系可能撑不到下一种环境。
    </p>

    <details class="mt-4 border-t border-slate-100 pt-3 text-xs">
      <summary class="cursor-pointer text-slate-600">查看计算方式</summary>
      <div class="mt-2 space-y-1 leading-relaxed text-slate-500">
        <p>
          出生 = 基础 {{ content.rules.baseBirths }} + 繁殖修正 − 剩余食物压力 ×
          {{ content.rules.foodBirthPenalty }}，最低为 0。每点食物、温度、捕食压力各造成
          {{ content.rules.deathRates.food }} 个个体损失，死亡总数不超过当前种群加本代出生。
        </p>
        <p>
          本代剩余压力：食物 {{ result.remainingPressures.food }} · 温度
          {{ result.remainingPressures.temperature }} · 捕食
          {{ result.remainingPressures.predation }}。
        </p>
      </div>
    </details>
  </section>
</template>
