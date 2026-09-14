<script setup lang="ts">
import type { Effect } from '../game/types'
import { describeEffect, isBenefit } from '../game/presentation'
withDefaults(defineProps<{ effects: Effect[]; variant?: 'light' | 'dark' }>(), { variant: 'light' })
const toneClass = (effect: Effect, variant: 'light' | 'dark') =>
  variant === 'dark'
    ? isBenefit(effect)
      ? 'text-emerald-200'
      : 'text-orange-200'
    : isBenefit(effect)
      ? 'text-emerald-800'
      : 'text-amber-800'
</script>
<template>
  <ul class="space-y-1 text-sm leading-relaxed">
    <li v-for="(effect, index) in effects" :key="index" :class="toneClass(effect, variant)">
      {{ describeEffect(effect) }}
    </li>
  </ul>
</template>
