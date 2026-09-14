<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { probeTraitImpact } from '../game/analysis'
import { content } from '../game/content'
import type { EffectContext } from '../game/presentation'
import type { EvolutionReward, GameAction, RunState } from '../game/types'
import TraitCard from './board/TraitCard.vue'

const props = defineProps<{
  state: RunState
  rewards: EvolutionReward[]
  context: EffectContext
}>()
const emit = defineEmits<{ action: [action: GameAction] }>()

const options = computed(() =>
  props.rewards.map((reward) => {
    if (reward.type === 'new-trait') {
      const trait = content.traits[reward.traitId]!
      return {
        reward,
        trait,
        from: null,
        mutation: false,
        caption: '新的性状',
        detail: '加入基因库的弃牌堆，后续洗牌时可以表达。',
        impact: probeTraitImpact(props.state, content, reward.traitId),
      }
    }
    const mutation = content.mutations.find((entry) => entry.id === reward.mutationId)!
    const trait = content.traits[mutation.to]!
    return {
      reward,
      trait,
      from: content.traits[mutation.from]!,
      mutation: true,
      caption: '分支突变',
      detail: mutation.description,
      impact: probeTraitImpact(props.state, content, trait.id),
    }
  }),
)

/** Number keys pick a card, Escape skips: the reward screen is fully keyboard driven. */
function onKeydown(event: KeyboardEvent) {
  const index = Number.parseInt(event.key, 10) - 1
  if (Number.isInteger(index) && index >= 0 && index < options.value.length) {
    emit('action', { type: 'choose-reward', rewardId: options.value[index]!.reward.id })
    return
  }
  if (event.key === 'Escape') emit('action', { type: 'choose-reward', rewardId: null })
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <footer class="shrink-0 border-t border-frame-line bg-board/95 px-3 py-3" aria-label="演化选择">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h2 class="board-title flex items-center gap-1.5">
          <span aria-hidden="true">🧬</span>第 {{ state.generation }} 代 · 演化选择
        </h2>
        <p class="mt-0.5 text-xs leading-relaxed text-ink-muted">
          每
          {{ content.rules.rewardInterval }}
          代出现一次机会：获得一个新性状，或改写已有性状的演化方向。 按
          <kbd class="rounded bg-white/10 px-1">1</kbd>
          <kbd class="rounded bg-white/10 px-1">2</kbd>
          <kbd class="rounded bg-white/10 px-1">3</kbd>
          选择，<kbd class="rounded bg-white/10 px-1">Esc</kbd> 跳过。
        </p>
      </div>
      <button
        class="btn-board-quiet"
        type="button"
        @click="emit('action', { type: 'choose-reward', rewardId: null })"
      >
        跳过，直接进入下一代
      </button>
    </div>

    <div v-if="options.length" class="mt-2 flex gap-3 overflow-x-auto pb-1">
      <article
        v-for="(option, index) in options"
        :key="option.reward.id"
        class="flex w-64 shrink-0 flex-col"
      >
        <p
          class="mb-1 flex flex-wrap items-center gap-2 text-xs font-medium"
          :class="option.mutation ? 'text-violet-200' : 'text-ink-muted'"
        >
          <span aria-hidden="true">🧬</span>{{ option.caption }}
          <span v-if="option.from" class="text-ink-dim"
            >{{ option.from.name }} → {{ option.trait.name }}</span
          >
          <span class="ml-auto rounded bg-white/10 px-1.5 tabular-nums">{{ index + 1 }}</span>
        </p>
        <TraitCard :trait="option.trait" :context="context" size="reward" />
        <p
          v-if="option.impact !== null"
          class="mt-1 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-100"
        >
          在当前环境下预计多存活
          <span class="text-sm font-semibold tabular-nums">{{
            option.impact > 0 ? `+${option.impact}` : option.impact
          }}</span>
          个体
        </p>
        <p class="mt-1 text-[11px] leading-4 text-ink-dim">{{ option.detail }}</p>
        <button
          class="btn-board mt-1.5"
          type="button"
          @click="emit('action', { type: 'choose-reward', rewardId: option.reward.id })"
        >
          选择「{{ option.trait.name }}」
        </button>
      </article>
    </div>
    <p v-else class="mt-2 text-xs text-ink-dim">当前没有可用的新性状。跳过后继续下一代。</p>
  </footer>
</template>
