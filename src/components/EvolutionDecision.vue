<script setup lang="ts">
import { computed } from 'vue'
import type { CardImpact } from '../game/analysis'
import { forecastSummary } from '../game/analysis'
import { cardDefinition } from '../game/engine'
import { content } from '../game/content'
import type { EffectContext } from '../game/presentation'
import { percent } from '../game/presentation'
import type { GameAction, GenerationResult, RunState } from '../game/types'
import TraitCard from './TraitCard.vue'

const props = defineProps<{
  state: RunState
  context: EffectContext
  impacts: Record<string, CardImpact>
  preview: GenerationResult | null
  baseline: GenerationResult | null
  spent: number
}>()
const emit = defineEmits<{ action: [action: GameAction] }>()

const budget = content.rules.expressionBudget
const remaining = computed(() => Math.max(0, budget - props.spent))
const summary = computed(() =>
  props.preview ? forecastSummary(props.preview, props.baseline) : null,
)
const savings = computed(() =>
  props.preview && props.baseline
    ? props.preview.populationAfter - props.baseline.populationAfter
    : 0,
)
const commitLabel = computed(() => {
  if (!summary.value) return '确认演化'
  if (summary.value.extinct) return '冒险进入下一代'
  if (summary.value.endangered) return '冒险进入下一代'
  return '确认演化'
})
const commitHint = computed(() => {
  if (!summary.value) return ''
  if (summary.value.extinct) return '按当前选择，这一代结束时种群会归零。'
  if (summary.value.endangered) return `⚠ 种群濒临灭绝，预计仅剩 ${summary.value.after} 个体。`
  return `预计下一代 ${summary.value.after} 个体 · 存活率 ${percent(summary.value.survivalRate)}`
})
const cardOf = (cardId: string) => cardDefinition(props.state, cardId, content)
</script>

<template>
  <section class="panel p-4 sm:p-5" aria-label="本代性状表达">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="section-title">本代要表达的性状</h2>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">
          本代最多表达 {{ budget }} 点性状（多数性状占 1
          点）。点选卡牌即可加入方案，再次点击可以取消。 预测会随选择立刻变化。
        </p>
      </div>
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-right">
        <p
          class="flex items-center justify-end gap-1.5"
          role="img"
          :aria-label="`表达额度已使用 ${spent} / ${budget} 点`"
        >
          <span
            v-for="point in budget"
            :key="point"
            class="pip"
            :class="
              point <= spent ? 'border-emerald-600 bg-emerald-600' : 'border-emerald-300 bg-white'
            "
          />
        </p>
        <p class="mt-1.5 text-xs font-semibold text-emerald-900">
          {{
            remaining > 0
              ? `已选 ${spent} / ${budget} 点 · 还能再表达 ${remaining} 点`
              : `额度已用完 ${spent} / ${budget} 点`
          }}
        </p>
      </div>
    </div>

    <div
      v-if="state.hand.length"
      class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      <TraitCard
        v-for="cardId in state.hand"
        :key="cardId"
        :trait="cardOf(cardId)"
        :context="context"
        selectable
        :selected="state.selectedCardIds.includes(cardId)"
        :disabled="!state.selectedCardIds.includes(cardId) && impacts[cardId]?.affordable === false"
        disabled-reason="表达额度不足，先取消一张牌再选择它。"
        :impact="impacts[cardId] ?? null"
        :progress="state.expressionCounts[cardOf(cardId).id] ?? 0"
        :threshold="content.rules.fixationThreshold"
        @select="emit('action', { type: 'toggle-card', cardId })"
      />
    </div>
    <p v-else class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
      基因库暂时为空。已有的永久性状仍然生效，可以直接确认演化，等待下一次演化机会。
    </p>

    <div
      class="sticky bottom-2 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-lg"
      :class="
        summary?.extinct || summary?.endangered
          ? 'border-orange-300 bg-orange-50'
          : 'border-slate-200 bg-white'
      "
    >
      <div class="min-w-0">
        <p class="text-[11px] font-semibold tracking-widest text-slate-500">
          {{ state.selectedCardIds.length ? '按当前选择的下一代种群' : '本代尚未选择性状' }}
        </p>
        <p v-if="preview" class="text-xl leading-tight font-semibold tabular-nums">
          {{ preview.populationBefore }}
          <span aria-hidden="true" class="text-slate-400">→</span>
          <span :class="preview.populationAfter === 0 ? 'text-red-700' : 'text-slate-900'">{{
            preview.populationAfter
          }}</span>
        </p>
        <p class="mt-0.5 text-xs leading-5 text-slate-500">
          <template v-if="!state.selectedCardIds.length"
            >只依靠已有的永久性状应对。也可以先选一张牌比较结果。</template
          >
          <template v-else-if="savings > 0">比不做新的适应多保住 {{ savings }} 个体。</template>
          <template v-else-if="savings < 0"
            >比不做新的适应少 {{ Math.abs(savings) }} 个体，可以换个组合。</template
          >
          <template v-else>与不做新的适应结果相同。</template>
        </p>
        <p
          v-if="commitHint"
          class="mt-0.5 text-xs font-medium"
          :class="summary?.extinct || summary?.endangered ? 'text-orange-900' : 'text-slate-500'"
        >
          {{ commitHint }}
        </p>
      </div>
      <button
        class="w-full sm:w-auto"
        :class="summary?.extinct ? 'btn-risky' : 'btn-primary'"
        type="button"
        :aria-label="`${commitLabel}，预计下一代 ${preview?.populationAfter ?? state.population} 个体`"
        @click="emit('action', { type: 'commit-generation' })"
      >
        {{ commitLabel }} <span aria-hidden="true">→</span>
      </button>
    </div>
  </section>
</template>
