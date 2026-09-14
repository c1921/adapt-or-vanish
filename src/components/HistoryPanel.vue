<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import { signed } from '../game/presentation'
import type { RunState } from '../game/types'
const props = defineProps<{ state: RunState }>()
const environmentNames = Object.fromEntries(content.environments.map(e => [e.id, e.name]))
const populations = computed(() => [content.rules.initialPopulation, ...props.state.history.map(r => r.populationAfter)])
const max = computed(() => Math.max(...populations.value, 1))
const points = computed(() => populations.value.map((p, i) => `${12 + i / Math.max(1, populations.value.length - 1) * 296},${100 - p / max.value * 80}`).join(' '))
</script>
<template>
  <section class="history-panel">
    <div class="history-chart"><div class="row-between"><span class="eyebrow">种群轨迹</span><span class="fine-print">峰值 {{ state.maxPopulation }}</span></div><svg viewBox="0 0 320 120" role="img" :aria-label="`种群从 ${populations[0]} 变化到 ${state.population}，最高 ${state.maxPopulation}。逐代数据见下方记录。`"><path d="M12 100H308M12 60H308M12 20H308" class="chart-grid" /><polyline :points="points" fill="none" class="chart-line" /><circle v-if="populations.length === 1" cx="12" :cy="100 - populations[0]! / max * 80" r="3" fill="currentColor" /></svg><div class="row-between fine-print"><span>祖先 · {{ content.rules.initialPopulation }}</span><span>第 {{ state.history.length }} 代 · {{ state.population }}</span></div></div>
    <h3 class="section-title">谱系记忆</h3>
    <ol class="timeline"><li v-for="(entry, index) in [...state.timeline].reverse()" :key="index"><span class="timeline-generation">{{ String(entry.generation).padStart(2, '0') }}</span><div><h4>{{ entry.title }}</h4><p>{{ entry.detail }}</p></div></li></ol>
    <h3 class="section-title">逐代结算</h3>
    <details v-for="result in [...state.history].reverse()" :key="result.generation" class="history-result"><summary><span>第 {{ result.generation }} 代 <small>{{ environmentNames[result.environmentId] }}</small></span><span>{{ result.populationAfter }} <b :class="result.populationAfter >= result.populationBefore ? 'benefit' : 'cost'">{{ signed(result.populationAfter - result.populationBefore) }}</b></span></summary><div class="body-copy"><p>{{ result.expressedTraitIds.map(id => content.traits[id]!.name).join('、') || '未表达手牌' }}</p><p>出生 +{{ result.births }} · 食物 −{{ result.deaths.food }} · 温度 −{{ result.deaths.temperature }} · 捕食 −{{ result.deaths.predation }}</p></div></details>
    <p v-if="!state.history.length" class="empty-state">第一个世代结束后，记录将从这里开始。</p>
  </section>
</template>
