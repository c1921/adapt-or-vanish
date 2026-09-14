<script setup lang="ts">
import { computed } from 'vue'
import type { CauseRow } from '../game/analysis'
import { causeRows, forecastSummary } from '../game/analysis'
import { content } from '../game/content'
import { percent } from '../game/presentation'
import type { GenerationResult, RunState } from '../game/types'
import NumberTween from './board/NumberTween.vue'

const props = withDefaults(
  defineProps<{
    result: GenerationResult
    /** The same generation without new adaptations; used to explain every change. */
    baseline?: GenerationResult | null
    preview?: boolean
    temperature: RunState['environment']['temperature']
    /** Board the hovered card would produce, compared against the committed plan. */
    ghost?: { result: GenerationResult; label: string } | null
  }>(),
  { baseline: null, preview: false, ghost: null },
)

/** With a hover preview the shown board is the ghost, compared with the plan. */
const shown = computed(() => (props.ghost ? props.ghost.result : props.result))
const compare = computed(() => (props.ghost ? props.result : (props.baseline ?? null)))
const summary = computed(() => forecastSummary(shown.value, compare.value))
const rows = computed<CauseRow[]>(() => causeRows(shown.value, compare.value, props.temperature))
const improvementLabel = computed(() => (props.ghost ? '相对当前方案' : '比不做新的适应'))
const format = (value: number, polarity: 'gain' | 'loss') =>
  value === 0 ? '0' : polarity === 'gain' ? `+${value}` : `−${value}`
/** Positive means this cause now costs fewer individuals than the comparison board. */
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
  <section class="board-panel p-4" :aria-label="preview ? '生存预测' : '本代结算'">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <span aria-hidden="true">📉</span
        >{{ preview ? '生存预测' : `第 ${result.generation} 代结算` }}
      </h2>
      <span
        v-if="ghost"
        class="board-chip border-dashed border-emerald-300/60 bg-emerald-400/10 text-emerald-100"
      >
        预览 · {{ ghost.label }}
      </span>
      <span
        v-else-if="preview"
        class="board-chip border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
        >随选择即时变化</span
      >
      <span v-else class="board-chip border-white/15 bg-white/5 text-ink-muted">本代结果</span>
    </div>

    <div class="mt-3 flex flex-wrap items-end gap-3">
      <span class="text-2xl leading-none text-ink-dim">
        <NumberTween :value="shown.populationBefore" />
      </span>
      <span aria-hidden="true" class="pb-1 text-ink-dim">→</span>
      <span
        class="text-4xl leading-none font-semibold"
        :class="shown.populationAfter === 0 ? 'text-red-300' : 'text-ink'"
      >
        <NumberTween :value="shown.populationAfter" />
      </span>
      <span
        class="pb-1 text-sm font-semibold tabular-nums"
        :class="summary.delta < 0 ? 'text-orange-300' : 'text-emerald-300'"
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
    <p class="mt-1 text-sm font-medium text-ink" aria-live="polite">{{ headline }}</p>

    <p v-if="baseline || ghost" class="mt-1 text-xs">
      <span v-if="baseline && !ghost" class="text-ink-muted"
        >不做新的适应：{{ baseline.populationAfter }} 个体活下来</span
      >
      <span
        v-if="summary.deltaVsBaseline"
        class="font-medium"
        :class="[
          summary.deltaVsBaseline > 0 ? 'text-emerald-300' : 'text-orange-300',
          baseline && !ghost ? 'ml-1' : '',
        ]"
      >
        {{ baseline && !ghost ? '· ' : '' }}{{ improvementLabel
        }}{{
          summary.deltaVsBaseline > 0
            ? `多存活 ${summary.deltaVsBaseline} 个体`
            : `少存活 ${Math.abs(summary.deltaVsBaseline)} 个体`
        }}
      </span>
    </p>

    <dl class="mt-3 space-y-0.5">
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
        :class="row.changed ? 'flash-once bg-white/5' : ''"
      >
        <dt class="flex items-center gap-1.5 text-ink-muted">
          <span aria-hidden="true">{{ row.icon }}</span
          >{{ row.label }}
        </dt>
        <dd class="ml-auto flex items-center gap-2 tabular-nums">
          <span v-if="row.changed" class="text-xs text-ink-dim"
            >{{ format(row.baseline, row.polarity) }} →</span
          >
          <span
            class="font-semibold"
            :class="
              row.polarity === 'gain'
                ? 'text-emerald-300'
                : row.value > 0
                  ? 'text-orange-200'
                  : 'text-ink-dim'
            "
            >{{ format(row.value, row.polarity) }}</span
          >
          <span
            v-if="row.changed && improvement(row) !== 0"
            class="board-chip"
            :class="
              improvement(row) > 0
                ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100'
                : 'border-rose-400/40 bg-rose-400/15 text-rose-100'
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
      class="pulse-danger mt-3 rounded-lg border border-red-400/50 bg-red-500/15 p-2.5 text-sm font-medium text-red-100"
    >
      {{
        preview
          ? '按当前选择，这一代结束时种群会归零。可以调整性状再试一次。'
          : '种群归零，这条谱系已经终止。'
      }}
    </p>
    <p
      v-else-if="preview && summary.endangered"
      class="mt-3 rounded-lg border border-orange-400/50 bg-orange-500/15 p-2.5 text-sm text-orange-100"
    >
      ⚠ 种群濒临灭绝。再牺牲一个世代，谱系可能撑不到下一种环境。
    </p>

    <details class="mt-3 border-t border-frame-line pt-2 text-xs">
      <summary class="cursor-pointer text-ink-dim">查看计算方式</summary>
      <div class="mt-2 space-y-1 leading-relaxed text-ink-muted">
        <p>
          出生 = 基础 {{ content.rules.baseBirths }} + 繁殖修正 − 剩余食物压力 ×
          {{ content.rules.foodBirthPenalty }}，最低为 0。每点食物、温度、捕食压力各造成
          {{ content.rules.deathRates.food }} 个个体损失，死亡总数不超过当前种群加本代出生。
        </p>
        <p>
          本代剩余压力：食物 {{ shown.remainingPressures.food }} · 温度
          {{ shown.remainingPressures.temperature }} · 捕食
          {{ shown.remainingPressures.predation }}。
        </p>
      </div>
    </details>
  </section>
</template>
