<script setup lang="ts">
import type { GenerationResult } from '../game/types'
import { signed } from '../game/presentation'
defineProps<{ result: GenerationResult; preview?: boolean }>()
</script>
<template>
  <section class="panel p-5" :aria-label="preview ? '种群预览' : '世代结算'">
    <h2 class="section-title">{{ preview ? '种群变化预览' : `第 ${result.generation} 代结算` }}</h2>
    <div class="my-4 flex flex-wrap items-baseline gap-3 tabular-nums">
      <span class="text-2xl text-slate-500">{{ result.populationBefore }}</span
      ><span aria-hidden="true" class="text-slate-400">→</span
      ><span
        class="text-3xl font-semibold"
        :class="result.populationAfter === 0 ? 'text-red-700' : 'text-slate-900'"
        >{{ result.populationAfter }}</span
      ><span
        class="rounded px-2 py-1 text-sm font-medium"
        :class="
          result.populationAfter >= result.populationBefore
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-amber-50 text-amber-900'
        "
        >{{ signed(result.populationAfter - result.populationBefore) }}</span
      >
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular-nums">
      <dt class="text-slate-500">出生</dt>
      <dd class="text-right font-medium text-emerald-800">+{{ result.births }}</dd>
      <dt class="text-slate-500">食物不足</dt>
      <dd class="text-right text-amber-800">−{{ result.deaths.food }}</dd>
      <dt class="text-slate-500">温度影响</dt>
      <dd class="text-right text-amber-800">−{{ result.deaths.temperature }}</dd>
      <dt class="text-slate-500">捕食损失</dt>
      <dd class="text-right text-amber-800">−{{ result.deaths.predation }}</dd>
    </dl>
    <p
      v-if="result.populationAfter === 0"
      class="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
    >
      {{ preview ? '当前选择将导致物种灭绝。可以调整手牌。' : '种群归零，这条谱系已经终止。' }}
    </p>
    <p
      v-else-if="preview"
      class="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500"
    >
      确认后将按此结果结算。未选用的手牌也会进入弃牌堆。
    </p>
  </section>
</template>
