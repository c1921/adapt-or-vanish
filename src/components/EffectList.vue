<script setup lang="ts">
import type { Effect } from '../game/types'
import { describeCompactEffect, describeEffect, isBenefit } from '../game/presentation'
import { conditionMatches, type EffectContext } from '../game/effects'
defineProps<{ effects: Effect[]; context?: EffectContext; compact?: boolean }>()
</script>
<template>
  <ul class="effect-list" :class="{ 'effect-list--compact': compact }">
    <li v-for="(effect, index) in effects" :key="index" :class="[isBenefit(effect) ? 'benefit' : 'cost', { 'effect-dormant': context && !conditionMatches(effect.when, context) }]">
      <span class="effect-sign" aria-hidden="true">{{ isBenefit(effect) ? '+' : '−' }}</span>
      <span>{{ compact ? describeCompactEffect(effect) : describeEffect(effect) }}<small v-if="effect.when && context" class="condition-status">{{ conditionMatches(effect.when, context) ? '条件成立' : '条件未满足' }}</small></span>
    </li>
  </ul>
</template>
