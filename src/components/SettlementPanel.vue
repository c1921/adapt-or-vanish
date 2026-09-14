<script setup lang="ts">
import { computed } from 'vue'
import { fixationStatus } from '../game/analysis'
import { content } from '../game/content'
import { effectChips } from '../game/presentation'
import type { EffectContext, EffectChip } from '../game/presentation'
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
</script>

<template>
  <section class="panel p-5" aria-label="自然选择与固化">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="section-title flex items-center gap-1.5">
          <span aria-hidden="true">🧬</span>自然选择：让适应成为本能
        </h2>
        <p class="mt-1 text-sm leading-relaxed text-slate-500">
          本代成功表达的性状累计了一次固化进度。累计
          {{ content.rules.fixationThreshold }}
          代，就能把它固定为物种身份的一部分。
        </p>
      </div>
      <span class="chip border-violet-200 bg-violet-50 text-violet-800">
        剩余永久槽位 {{ slotsLeft }} / {{ content.rules.permanentLimit }}
      </span>
    </div>

    <ul v-if="progress.length" class="mt-4 space-y-2">
      <li v-for="entry in progress" :key="entry.traitId" class="flex items-center gap-3 text-sm">
        <span class="w-20 shrink-0 truncate text-slate-700">{{ entry.name }}</span>
        <span class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
          <span
            class="block h-full rounded-full bg-violet-500 transition-all duration-300"
            :style="{ width: `${entry.status.ratio * 100}%` }"
          />
        </span>
        <span class="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500"
          >{{ entry.status.count }} / {{ entry.status.threshold }}</span
        >
        <span
          class="shrink-0 text-xs"
          :class="entry.status.ready ? 'text-violet-800' : 'text-slate-500'"
        >
          {{ entry.status.ready ? '可以固化' : entry.status.text }}
        </span>
      </li>
    </ul>

    <div v-if="fixable.length" class="mt-5 grid gap-3 md:grid-cols-3">
      <article
        v-for="traitId in fixable"
        :key="traitId"
        class="flex flex-col rounded-xl border border-violet-200 bg-violet-50/40 p-4"
      >
        <p class="text-sm font-semibold text-violet-900">
          {{ content.traits[traitId]!.name }} → {{ content.traits[traitId]!.permanent.name }}
        </p>
        <p class="mt-1 text-xs font-medium text-violet-800">🧬 固化进度已达成，永久生效</p>
        <div class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="chip in chipsOf(traitId)"
            :key="chip.text"
            class="chip"
            :class="
              chip.polarity === 'benefit'
                ? 'border-emerald-200 bg-white text-emerald-800'
                : chip.polarity === 'cost'
                  ? 'border-orange-200 bg-white text-orange-900'
                  : 'border-slate-200 bg-white text-slate-500'
            "
            ><span aria-hidden="true">{{
              chip.polarity === 'benefit' ? '🟢' : chip.polarity === 'cost' ? '🔴' : '⚪'
            }}</span
            >{{ chip.text }}</span
          >
        </div>
        <p class="mt-2 text-xs leading-relaxed text-slate-500">
          移除全部
          {{ state.cards.filter((card) => card.traitId === traitId).length }}
          张同名牌，占用一个永久槽位，收益与代价都会永久保留。
        </p>
        <button
          class="btn-secondary mt-3 w-full"
          type="button"
          @click="emit('action', { type: 'fix-trait', traitId })"
        >
          固化为「{{ content.traits[traitId]!.permanent.name }}」
        </button>
      </article>
    </div>
    <p v-else class="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
      {{
        slotsLeft <= 0
          ? '永久性状已满。此后靠新牌与分支突变应对环境变化。'
          : '暂时没有可以固化的性状。继续表达同一种性状，让适应积累下来。'
      }}
    </p>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-xs text-slate-500">
        {{ state.permanentTraits.length }} 个永久性状会在下代自动生效，无需再抽到。
      </p>
      <button
        class="btn-primary w-full sm:w-auto"
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
  </section>
</template>
