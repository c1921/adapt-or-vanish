<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import type { EvolutionReward } from '../game/types'
import TraitCard from './TraitCard.vue'
const props = defineProps<{ rewards: EvolutionReward[] }>()
defineEmits<{ choose: [rewardId: string | null] }>()
const options = computed(() =>
  props.rewards.map((reward) => {
    if (reward.type === 'new-trait')
      return {
        reward,
        trait: content.traits[reward.traitId]!,
        caption: '获得新的性状',
        detail: '加入基因库的弃牌堆，后续洗牌时可以抽到。',
      }
    const mutation = content.mutations.find((entry) => entry.id === reward.mutationId)!
    return {
      reward,
      trait: content.traits[mutation.to]!,
      caption: `${content.traits[mutation.from]!.name} → 分支突变`,
      detail: `${mutation.description} 替换一张原牌，新性状表达进度归零。`,
    }
  }),
)
</script>
<template>
  <section class="panel p-5" aria-label="演化选择">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="section-title">选择下一种可能</h2>
        <p class="mt-1 text-sm text-slate-500">获得一个新性状，或改变现有性状的演化方向。</p>
      </div>
      <button class="btn-secondary" type="button" @click="$emit('choose', null)">
        跳过本次演化
      </button>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <article v-for="option in options" :key="option.reward.id" class="flex min-w-0 flex-col">
        <p
          class="mb-2 text-sm font-medium"
          :class="option.reward.type === 'mutation' ? 'text-emerald-800' : 'text-slate-600'"
        >
          {{ option.caption }}
        </p>
        <TraitCard
          :trait="option.trait"
          :threshold="content.rules.fixationThreshold"
          class="flex-1"
        />
        <p class="mt-3 text-xs leading-relaxed text-slate-500">{{ option.detail }}</p>
        <button
          class="btn-primary mt-3 w-full"
          type="button"
          @click="$emit('choose', option.reward.id)"
        >
          选择「{{ option.trait.name }}」
        </button>
      </article>
    </div>
    <p v-if="!options.length" class="text-sm text-slate-500">
      当前没有可用的新性状。跳过后继续下一代。
    </p>
  </section>
</template>
