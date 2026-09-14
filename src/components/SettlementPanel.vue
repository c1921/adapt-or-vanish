<script setup lang="ts">
import { computed } from 'vue'
import { fixationStatus } from '../game/analysis'
import { content } from '../game/content'
import type { EffectContext, EffectChip } from '../game/presentation'
import { effectChips } from '../game/presentation'
import type { GameAction, GenerationResult, RunState } from '../game/types'

const props = defineProps<{
  state: RunState
  result: GenerationResult | null
  fixable: string[]
  context: EffectContext
}>()
const emit = defineEmits<{ action: [action: GameAction] }>()

const slotsLeft = computed(() => content.rules.permanentLimit - props.state.permanentTraits.length)
const progress = computed(() => {
  const expressed = [...new Set(props.result?.expressedTraitIds ?? [])]
  return expressed
    .filter((traitId) => content.traits[traitId])
    .map((traitId) => ({
      traitId,
      name: content.traits[traitId]!.name,
      status: fixationStatus(
        props.state.expressionCounts[traitId] ?? 0,
        content.rules.fixationThreshold,
      ),
    }))
})
const chipsOf = (traitId: string): EffectChip[] =>
  effectChips(content.traits[traitId]!.permanent.effects, props.context)
const copies = (traitId: string) =>
  props.state.cards.filter((card) => card.traitId === traitId).length
</script>

<template>
  <footer
    class="shrink-0 border-t border-frame-line bg-board/95 px-3 py-3"
    aria-label="自然选择与固化"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h2 class="board-title flex items-center gap-1.5">
          <span aria-hidden="true">🧬</span>自然选择：让适应成为本能
        </h2>
        <p class="mt-0.5 text-xs leading-relaxed text-ink-muted">
          本代成功表达的性状累计了一次固化进度。累计
          {{ content.rules.fixationThreshold }} 代，就能把它固定为物种身份的一部分。
        </p>
      </div>
      <span class="board-chip border-violet-400/40 bg-violet-400/15 text-violet-100">
        剩余永久槽位 {{ slotsLeft }} / {{ content.rules.permanentLimit }}
      </span>
    </div>

    <ul v-if="progress.length" class="mt-2 flex flex-wrap gap-x-5 gap-y-1">
      <li v-for="entry in progress" :key="entry.traitId" class="flex items-center gap-2 text-xs">
        <span class="w-20 shrink-0 truncate text-ink">{{ entry.name }}</span>
        <span class="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-black/40">
          <span
            class="block h-full rounded-full bg-violet-400"
            :style="{ width: `${entry.status.ratio * 100}%` }"
          />
        </span>
        <span class="shrink-0 tabular-nums text-ink-dim"
          >{{ entry.status.count }} / {{ entry.status.threshold }}</span
        >
        <span class="shrink-0" :class="entry.status.ready ? 'text-violet-200' : 'text-ink-dim'">
          {{ entry.status.ready ? '可以固化' : entry.status.text }}
        </span>
      </li>
    </ul>

    <div v-if="fixable.length" class="mt-2 flex gap-2 overflow-x-auto pb-1">
      <article
        v-for="traitId in fixable"
        :key="traitId"
        class="flex w-72 shrink-0 flex-col rounded-xl border border-violet-300/40 bg-violet-500/10 p-3"
      >
        <p class="text-sm font-semibold text-violet-50">
          {{ content.traits[traitId]!.name }} → {{ content.traits[traitId]!.permanent.name }}
        </p>
        <p class="mt-0.5 text-[11px] font-medium text-violet-200">🧬 固化进度已达成，永久生效</p>
        <div class="mt-1.5 flex flex-wrap gap-1">
          <span
            v-for="chip in chipsOf(traitId)"
            :key="chip.text"
            class="board-chip"
            :class="
              chip.polarity === 'benefit'
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                : chip.polarity === 'cost'
                  ? 'border-orange-400/40 bg-orange-400/10 text-orange-100'
                  : 'border-white/15 bg-white/5 text-ink-dim'
            "
            ><span aria-hidden="true">{{
              chip.polarity === 'benefit' ? '🟢' : chip.polarity === 'cost' ? '🔴' : '⚪'
            }}</span
            >{{ chip.text }}</span
          >
        </div>
        <p class="mt-1.5 text-[11px] leading-4 text-ink-dim">
          移除全部 {{ copies(traitId) }} 张同名牌，占用一个永久槽位，收益与代价都会永久保留。
        </p>
        <button
          class="btn-board-quiet mt-2"
          type="button"
          @click="emit('action', { type: 'fix-trait', traitId })"
        >
          固化为「{{ content.traits[traitId]!.permanent.name }}」
        </button>
      </article>
    </div>
    <p v-else class="mt-2 text-xs text-ink-dim">
      {{
        slotsLeft <= 0
          ? '永久性状已满。此后靠新牌与分支突变应对环境变化。'
          : '暂时没有可以固化的性状。继续表达同一种性状，让适应积累下来。'
      }}
    </p>

    <div class="mt-2.5 flex flex-wrap items-center justify-between gap-2">
      <p class="text-[11px] text-ink-dim">
        {{ state.permanentTraits.length }} 个永久性状会在下代自动生效，无需再抽到。
      </p>
      <button
        class="btn-board w-full sm:w-auto"
        type="button"
        @click="emit('action', { type: 'continue' })"
      >
        {{
          state.generation % content.rules.rewardInterval === 0
            ? '继续：演化选择 →'
            : `适应并进入第 ${state.generation + 1} 代 →`
        }}
      </button>
    </div>
  </footer>
</template>
