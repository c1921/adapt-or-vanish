<script setup lang="ts">
import { computed } from 'vue'
import { probeTraitImpact } from '../game/analysis'
import { content } from '../game/content'
import type { EffectContext } from '../game/presentation'
import type { EvolutionReward, GameAction, RunState } from '../game/types'
import TraitCard from './TraitCard.vue'

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
</script>

<template>
  <section class="panel p-5" aria-label="演化选择">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="section-title flex items-center gap-1.5">
          <span aria-hidden="true">🧬</span>第 {{ state.generation }} 代 · 演化选择
        </h2>
        <p class="mt-1 text-sm leading-relaxed text-slate-500">
          每
          {{ content.rules.rewardInterval }}
          代出现一次机会：获得一个新性状，或改写已有性状的演化方向。 效果按当前环境估算，仅供参考。
        </p>
      </div>
      <button
        class="btn-secondary"
        type="button"
        @click="emit('action', { type: 'choose-reward', rewardId: null })"
      >
        跳过，直接进入下一代
      </button>
    </div>

    <div v-if="options.length" class="mt-4 grid gap-4 md:grid-cols-3">
      <article v-for="option in options" :key="option.reward.id" class="flex min-w-0 flex-col">
        <p
          class="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium"
          :class="option.mutation ? 'text-violet-800' : 'text-slate-600'"
        >
          <span aria-hidden="true">🧬</span>{{ option.caption }}
          <span v-if="option.from" class="text-xs text-slate-500"
            >{{ option.from.name }} → {{ option.trait.name }}</span
          >
        </p>
        <TraitCard
          class="flex-1"
          :trait="option.trait"
          :context="context"
          :threshold="content.rules.fixationThreshold"
        />
        <p
          v-if="option.impact !== null"
          class="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900"
        >
          在当前环境下预计多存活
          <span class="text-base font-semibold tabular-nums">{{
            option.impact > 0 ? `+${option.impact}` : option.impact
          }}</span>
          个体
        </p>
        <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ option.detail }}</p>
        <button
          class="btn-primary mt-3 w-full"
          type="button"
          @click="emit('action', { type: 'choose-reward', rewardId: option.reward.id })"
        >
          选择「{{ option.trait.name }}」
        </button>
      </article>
    </div>
    <p v-else class="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
      当前没有可用的新性状。跳过后继续下一代。
    </p>
  </section>
</template>
