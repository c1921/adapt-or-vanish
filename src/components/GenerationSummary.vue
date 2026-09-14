<script setup lang="ts">
import type { GenerationResult } from '../game/types'
import { signed } from '../game/presentation'
defineProps<{ result: GenerationResult; preview?: boolean }>()
</script>
<template>
  <section class="generation-summary" :aria-label="preview ? '种群预览' : '世代结算'">
    <p class="eyebrow">{{ preview ? '本代预期' : '自然选择 · 结算结果' }}</p>
    <div class="result-numbers"><span>{{ result.populationBefore }}</span><span class="result-arrow">→</span><strong :class="{ cost: result.populationAfter === 0 }">{{ result.populationAfter }}</strong><span class="delta-badge" :class="result.populationAfter >= result.populationBefore ? 'benefit' : 'cost'">{{ signed(result.populationAfter - result.populationBefore) }}</span></div>
    <dl class="result-breakdown"><div><dt>出生</dt><dd class="benefit">+{{ result.births }}</dd></div><div><dt>食物损失</dt><dd class="cost">−{{ result.deaths.food }}</dd></div><div><dt>温度损失</dt><dd class="cost">−{{ result.deaths.temperature }}</dd></div><div><dt>捕食损失</dt><dd class="cost">−{{ result.deaths.predation }}</dd></div></dl>
    <p v-if="result.populationAfter === 0" class="inline-warning">{{ preview ? '当前搭配将导致灭绝，可返回调整手牌。' : '种群归零，这条谱系就此终止。' }}</p>
  </section>
</template>
