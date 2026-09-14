<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CardImpact } from '../../game/analysis'
import { forecastSummary } from '../../game/analysis'
import { content } from '../../game/content'
import { cardDefinition } from '../../game/engine'
import type { EffectContext } from '../../game/presentation'
import { percent } from '../../game/presentation'
import type { GenerationResult, RunState } from '../../game/types'
import CardDetail from './CardDetail.vue'
import TraitCard from './TraitCard.vue'

const props = defineProps<{
  state: RunState
  context: EffectContext
  impacts: Record<string, CardImpact>
  preview: GenerationResult | null
  baseline: GenerationResult | null
  spent: number
}>()
const emit = defineEmits<{
  select: [cardId: string]
  commit: []
  hover: [cardId: string | null]
}>()

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
const commitLabel = computed(() =>
  summary.value?.extinct || summary.value?.endangered ? '冒险进入下一代' : '确认演化',
)
const detailCardId = ref<string | null>(null)
const detailTrait = computed(() =>
  detailCardId.value ? cardDefinition(props.state, detailCardId.value, content) : null,
)

/** Roving focus: only one card is tabbable, arrows move between cards. */
const focusIndex = ref(0)
const cardRefs = ref<({ focus: () => void } | null)[]>([])
function setCardRef(index: number, element: unknown) {
  cardRefs.value[index] = element as { focus: () => void } | null
}
function moveFocus(to: number) {
  const hand = props.state.hand
  if (!hand.length) return
  const next = (to + hand.length) % hand.length
  focusIndex.value = next
  cardRefs.value[next]?.focus()
}
function onKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'ArrowRight') moveFocus(index + 1)
  else if (event.key === 'ArrowLeft') moveFocus(index - 1)
  else if (event.key === 'Home') moveFocus(0)
  else if (event.key === 'End') moveFocus(props.state.hand.length - 1)
  else return
  event.preventDefault()
}
watch(
  () => props.state.hand,
  () => {
    focusIndex.value = 0
    cardRefs.value = []
  },
)
</script>

<template>
  <footer class="shrink-0 border-t border-frame-line bg-board/95" aria-label="手牌与结算">
    <div class="flex items-stretch gap-3 px-3 pt-2">
      <!-- 额度与说明 -->
      <div class="hidden w-48 shrink-0 flex-col justify-center gap-1 lg:flex">
        <h2 class="board-title">本代要表达的性状</h2>
        <p
          class="flex items-center gap-1.5"
          role="img"
          :aria-label="`表达额度已使用 ${spent} / ${budget} 点`"
        >
          <span
            v-for="point in budget"
            :key="point"
            class="pip"
            :class="
              point <= spent
                ? 'border-emerald-300 bg-emerald-400'
                : 'border-white/25 bg-transparent'
            "
          />
        </p>
        <p class="text-xs font-semibold text-emerald-200">
          {{
            remaining > 0
              ? `已选 ${spent} / ${budget} 点 · 还能再表达 ${remaining} 点`
              : `额度已用完 ${spent} / ${budget} 点`
          }}
        </p>
        <p class="text-[11px] leading-4 text-ink-dim">
          点选卡牌加入方案，再次点击取消；悬停即可预览结果。
        </p>
      </div>

      <!-- 手牌 -->
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center justify-between gap-2 lg:hidden">
          <h2 class="board-title">本代要表达的性状</h2>
          <p class="text-xs font-semibold text-emerald-200">
            已选 {{ spent }} / {{ budget }} 点<template v-if="remaining > 0">
              · 还能再表达 {{ remaining }} 点</template
            >
          </p>
        </div>
        <div
          v-if="state.hand.length"
          class="flex gap-2 overflow-x-auto px-1 pt-8 pb-4"
          role="group"
          aria-label="手牌"
          @mouseleave="emit('hover', null)"
        >
          <div
            v-for="(cardId, index) in state.hand"
            :key="cardId"
            class="shrink-0"
            @mouseenter="emit('hover', cardId)"
            @focusin="emit('hover', cardId)"
            @focusout="emit('hover', null)"
          >
            <TraitCard
              :ref="(element) => setCardRef(index, element)"
              class="card-enter"
              :style="{ animationDelay: `${index * 45}ms` }"
              :trait="cardDefinition(state, cardId, content)"
              :context="context"
              :tab-index="index === focusIndex ? 0 : -1"
              selectable
              :selected="state.selectedCardIds.includes(cardId)"
              :disabled="
                !state.selectedCardIds.includes(cardId) && impacts[cardId]?.affordable === false
              "
              disabled-reason="额度不足"
              :impact="impacts[cardId] ?? null"
              :progress="state.expressionCounts[cardDefinition(state, cardId, content).id] ?? 0"
              :threshold="content.rules.fixationThreshold"
              detail="strip"
              :details-open="detailCardId === cardId"
              @select="emit('select', cardId)"
              @toggle-details="detailCardId = detailCardId === cardId ? null : cardId"
              @keydown="onKeydown($event, index)"
            />
          </div>
        </div>
        <p v-else class="py-6 text-sm text-ink-muted">
          基因库暂时为空。已有的永久性状仍然生效，可以直接确认演化，等待下一次演化机会。
        </p>
      </div>

      <!-- 结算 -->
      <div class="hidden w-60 shrink-0 flex-col justify-center gap-1 sm:flex">
        <p class="board-eyebrow">
          {{ state.selectedCardIds.length ? '按当前选择的下一代种群' : '本代尚未选择性状' }}
        </p>
        <p v-if="preview" class="text-2xl leading-none font-semibold text-ink">
          {{ preview.populationBefore }}
          <span aria-hidden="true" class="text-ink-dim">→</span>
          <span :class="preview.populationAfter === 0 ? 'text-red-300' : 'text-emerald-300'">{{
            preview.populationAfter
          }}</span>
        </p>
        <p class="text-[11px] leading-4 text-ink-muted">
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
          v-if="summary?.extinct || summary?.endangered"
          class="text-[11px] font-medium text-orange-200"
        >
          {{
            summary?.extinct
              ? '⚠ 按当前选择，这一代结束时种群会归零。'
              : `⚠ 种群濒临灭绝，预计仅剩 ${summary?.after} 个体。`
          }}
        </p>
        <p v-else-if="summary" class="text-[11px] text-ink-dim">
          预计下一代 {{ summary.after }} 个体 · 存活率 {{ percent(summary.survivalRate) }}
        </p>
        <button
          class="mt-1"
          :class="summary?.extinct ? 'btn-board-risky' : 'btn-board'"
          type="button"
          :aria-label="`${commitLabel}，预计下一代 ${preview?.populationAfter ?? state.population} 个体`"
          @click="emit('commit')"
        >
          {{ commitLabel }} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>

    <!-- 窄屏结算条 -->
    <div class="flex items-center justify-between gap-2 px-3 pt-1 pb-2 sm:hidden">
      <p class="text-xs text-ink-muted">
        <span class="font-semibold text-ink">{{
          preview?.populationAfter ?? state.population
        }}</span>
        个体 · 存活率 {{ summary ? percent(summary.survivalRate) : '—' }}
      </p>
      <button
        :class="summary?.extinct ? 'btn-board-risky' : 'btn-board'"
        type="button"
        @click="emit('commit')"
      >
        {{ commitLabel }}
      </button>
    </div>

    <CardDetail
      v-if="detailTrait && detailCardId"
      :trait="detailTrait"
      :progress="state.expressionCounts[detailTrait.id] ?? 0"
      @close="detailCardId = null"
    />
  </footer>
</template>
