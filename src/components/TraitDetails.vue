<script setup lang="ts">
import type { TraitDefinition } from '../game/types'
import type { EffectContext } from '../game/effects'
import { tagLabels } from '../game/presentation'
import { content } from '../game/content'
import TraitCard from './TraitCard.vue'
import EffectList from './EffectList.vue'
defineProps<{ trait: TraitDefinition; progress?: number; context?: EffectContext }>()
</script>
<template>
  <div class="trait-detail-layout">
    <TraitCard :trait="trait" variant="detail" :progress="progress" :threshold="content.rules.fixationThreshold" :context="context" />
    <p class="body-copy">{{ trait.description }}</p>
    <div class="tag-list"><span v-for="tag in trait.tags" :key="tag" class="tag">{{ tagLabels[tag] ?? tag }}</span></div>
    <section class="detail-section"><p class="eyebrow">永久性状 · {{ Math.min(progress ?? 0, content.rules.fixationThreshold) }}/{{ content.rules.fixationThreshold }}</p><h3>{{ trait.permanent.name }}</h3><EffectList :effects="trait.permanent.effects" /><p class="fine-print">表达且存活累计 {{ content.rules.fixationThreshold }} 代后，可在结算时固化。占用一个永久槽位，移除全部同名牌，下代起生效。</p></section>
  </div>
</template>
