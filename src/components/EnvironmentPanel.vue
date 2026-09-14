<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import type { RunState, GenerationResult, PressureId } from '../game/types'
import GameIcon from './GameIcon.vue'
const props = defineProps<{ state: RunState; result: GenerationResult | null }>()
defineEmits<{ details: [] }>()
const environment = computed(() => content.environments.find(e => e.id === props.state.environment.environmentId)!)
const event = computed(() => content.events[props.state.environment.eventId]!)
const pressures: { key: PressureId; name: string; icon: string }[] = [
  { key: 'food', name: '食物', icon: 'leaf' }, { key: 'temperature', name: '温度', icon: 'temperature' }, { key: 'predation', name: '捕食', icon: 'shield' },
]
</script>
<template>
  <section class="environment-panel" aria-label="环境压力与资源">
    <div class="environment-heading"><div><p class="eyebrow">第 {{ String(state.environment.localGeneration).padStart(2, '0') }} / {{ environment.duration }} 世代</p><h2>{{ environment.name }}<span class="environment-divider">/</span><span class="environment-stage">{{ state.environment.stageName }}</span></h2></div><span class="climate-tag"><GameIcon :name="state.environment.temperature === 'cold' ? 'temperature' : 'sun'" :size="15" />{{ state.environment.temperature === 'cold' ? '寒冷' : '高温' }}</span></div>
    <button class="pressure-grid" type="button" aria-label="查看压力、资源与结算明细" @click="$emit('details')">
      <span v-for="p in pressures" :key="p.key" class="pressure-stat"><span class="pressure-label"><GameIcon :name="p.icon" :size="15" />{{ p.key === 'temperature' ? (state.environment.temperature === 'cold' ? '寒冷' : '高温') : p.name }}</span><span class="pressure-values"><span>{{ state.environment.pressures[p.key] }}</span><span class="pressure-arrow">→</span><strong :class="result?.remainingPressures[p.key] === 0 ? 'benefit' : ''">{{ result?.remainingPressures[p.key] ?? '—' }}</strong></span><span class="pressure-track"><i :style="{ width: `${Math.min(100, (result?.remainingPressures[p.key] ?? 0) / content.rules.maxPressure * 100)}%` }"></i></span></span>
    </button>
    <div class="event-line"><GameIcon name="spark" :size="14" /><span><strong>{{ event.name }}</strong><span>{{ event.description }}</span></span></div>
    <p class="environment-caption">环境压力 → {{ state.phase === 'adaptation' ? '适应后剩余' : '本代剩余' }}<span>点按压力查看明细</span></p>
  </section>
</template>
