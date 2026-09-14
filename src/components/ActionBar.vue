<script setup lang="ts">
import type { GenerationResult, RunState } from '../game/types'
import { content } from '../game/content'
import { signed } from '../game/presentation'
import GameIcon from './GameIcon.vue'
defineProps<{ state: RunState; preview: GenerationResult | null; spent: number; label: string; disabled?: boolean; busy?: boolean }>()
defineEmits<{ confirm: []; skip: [] }>()
</script>
<template>
  <footer class="action-bar">
    <div v-if="state.phase === 'adaptation' && preview" class="decision-readout" aria-live="polite" aria-atomic="true">
      <div class="budget-readout"><span class="readout-label">表达额度</span><div><span class="budget-pips" aria-hidden="true"><i v-for="n in content.rules.expressionBudget" :key="n" :class="{ available: n > spent }"></i></span><strong>{{ content.rules.expressionBudget - spent }}</strong><span class="muted"> / {{ content.rules.expressionBudget }}</span></div></div>
      <div class="population-readout"><span class="readout-label">预计种群</span><div><span class="population-before">{{ preview.populationBefore }} → </span><strong data-testid="preview-population">{{ preview.populationAfter }}</strong><span :class="preview.populationAfter >= preview.populationBefore ? 'benefit' : 'cost'">{{ signed(preview.populationAfter - preview.populationBefore) }}</span></div></div>
    </div>
    <p v-if="state.phase === 'adaptation'" class="zero-selection-note">{{ state.selectedCardIds.length ? `已选 ${state.selectedCardIds.length} 张 · 未选手牌也会进入弃牌堆` : '尚未选择手牌 · 本代仅依靠永久性状' }}</p>
    <div class="action-buttons"><button v-if="state.phase === 'evolution'" class="btn-secondary skip-button" type="button" :disabled="busy" @click="$emit('skip')">跳过</button><button class="btn-primary" type="button" :disabled="disabled || busy" :class="{ 'btn-danger': preview?.populationAfter === 0 }" @click="$emit('confirm')"><span>{{ label }}</span><GameIcon name="arrow" :size="18" /></button></div>
  </footer>
</template>
