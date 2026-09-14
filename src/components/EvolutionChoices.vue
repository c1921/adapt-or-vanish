<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import type { EvolutionReward } from '../game/types'
import TraitCard from './TraitCard.vue'
import EffectList from './EffectList.vue'
const props = defineProps<{ rewards: EvolutionReward[]; selectedId: string | null }>()
defineEmits<{ select: [id: string]; inspect: [traitId: string] }>()
const options = computed(() => props.rewards.map(reward => {
  const mutation = reward.type === 'mutation' ? content.mutations.find(m => m.id === reward.mutationId)! : null
  const trait = content.traits[reward.type === 'new-trait' ? reward.traitId : mutation!.to]!
  return { reward, trait, mutation }
}))
</script>
<template>
  <section class="evolution-choices" aria-label="演化选择">
    <div class="stage-intro"><p class="eyebrow">演化的岔路</p><h2>选择下一种可能</h2><p>获得一个性状，或让已有的适应走向新分支。</p></div>
    <article v-for="option in options" :key="option.reward.id" class="reward-option" :class="{ 'reward-active': selectedId === option.reward.id }">
      <p class="reward-caption">{{ option.mutation ? `${content.traits[option.mutation.from]!.name} → 分支突变` : '新性状' }}</p>
      <TraitCard :trait="option.trait" variant="reward" :selected="selectedId === option.reward.id" @select="$emit('select', option.reward.id)" @inspect="$emit('inspect', option.trait.id)" />
      <div v-if="selectedId === option.reward.id" class="reward-expanded">
        <p>{{ option.trait.description }}</p>
        <div v-if="option.mutation" class="mutation-comparison"><span class="eyebrow">原性状 · {{ content.traits[option.mutation.from]!.name }}</span><EffectList :effects="content.traits[option.mutation.from]!.effects" /><p>{{ option.mutation.description }} 替换一个副本，目标性状的表达进度归零。</p></div>
        <p v-else class="fine-print">加入弃牌堆，后续洗牌时可被抽到。</p>
      </div>
    </article>
    <p v-if="!options.length" class="empty-state">当前没有可用的演化选项，跳过即可继续。</p>
  </section>
</template>
