<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import { cardDefinition } from '../game/engine'
import type { RunState } from '../game/types'
import type { EffectContext } from '../game/effects'
import TraitCard from './TraitCard.vue'
import GameIcon from './GameIcon.vue'
const props = defineProps<{ state: RunState; spent: number; context: EffectContext }>()
defineEmits<{ toggle: [id: string]; inspect: [id: string]; blocked: [reason: string]; library: [zone: 'draw' | 'discard'] }>()
const midpoint = computed(() => (props.state.hand.length - 1) / 2)
</script>
<template>
  <section class="hand-dock" aria-label="本代手牌">
    <div class="hand-toolbar"><div><span class="eyebrow">本代手牌</span><span class="hand-count">{{ state.hand.length }} 张</span></div><div class="pile-actions"><button type="button" aria-label="查看抽牌堆" @click="$emit('library', 'draw')"><GameIcon name="cards" :size="15" />抽牌 <b>{{ state.drawPile.length }}</b></button><button type="button" aria-label="查看弃牌堆" @click="$emit('library', 'discard')">弃牌 <b>{{ state.discardPile.length }}</b></button></div></div>
    <div v-if="state.hand.length" class="hand-fan" :style="{ '--card-count': state.hand.length }">
      <TraitCard v-for="(cardId, i) in state.hand" :key="cardId" :trait="cardDefinition(state, cardId, content)" variant="hand" :selected="state.selectedCardIds.includes(cardId)" :disabled-reason="!state.selectedCardIds.includes(cardId) && spent + cardDefinition(state, cardId, content).cost > content.rules.expressionBudget ? '表达额度不足，请先取消其他卡牌。' : ''" :progress="state.expressionCounts[cardDefinition(state, cardId, content).id] ?? 0" :threshold="content.rules.fixationThreshold" :context="state.selectedCardIds.includes(cardId) ? context : undefined" :style="{ '--i': i, '--rotation': `${(i - midpoint) * 2}deg`, '--arc': `${Math.abs(i - midpoint) * 4}px` }" @select="$emit('toggle', cardId)" @inspect="$emit('inspect', cardId)" @blocked="reason => $emit('blocked', reason)" />
    </div>
    <div v-else class="empty-hand"><GameIcon name="dna" :size="28" /><p>让已经留下的适应，继续发挥作用。</p><span>本代没有手牌，永久性状仍然生效。</span></div>
    <p class="hand-hint">点按选择 · 再点撤销 · <GameIcon name="info" :size="12" /> 查看详情</p>
  </section>
</template>
