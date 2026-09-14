<script setup lang="ts">
import type { Effect } from '../game/types'
import { describeEffect, isBenefit } from '../game/presentation'
defineProps<{ effects: Effect[] }>()
</script>
<template>
  <ul class="space-y-1 text-sm leading-relaxed">
    <li
      v-for="(effect, index) in effects"
      :key="index"
      :class="isBenefit(effect) ? 'text-emerald-800' : 'text-amber-800'"
    >
      {{ describeEffect(effect) }}
    </li>
  </ul>
</template>
