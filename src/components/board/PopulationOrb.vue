<script setup lang="ts">
import NumberTween from './NumberTween.vue'

const props = withDefaults(
  defineProps<{
    population: number
    /** Population the hovered card would produce, when a preview is active. */
    ghost?: number | null
    label?: string
  }>(),
  { ghost: null, label: '当前种群' },
)
const delta = () => (props.ghost === null ? 0 : props.ghost - props.population)
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      class="orb"
      role="img"
      :aria-label="`${label} ${population} 个体`"
      data-testid="population"
    >
      <span class="text-center leading-none">
        <span class="block text-3xl font-bold text-emerald-50">
          <NumberTween :value="population" />
        </span>
        <span class="mt-0.5 block text-[10px] tracking-widest text-emerald-200/80">个体</span>
      </span>
    </div>
    <div class="min-w-0">
      <p class="board-eyebrow">{{ label }}</p>
      <p v-if="ghost !== null" class="mt-0.5 text-sm text-ink-muted">
        <span
          class="board-chip border-dashed border-emerald-300/60 bg-emerald-400/10 text-emerald-100"
          >预览 {{ ghost }}</span
        >
        <span
          class="ml-1 font-semibold tabular-nums"
          :class="delta() >= 0 ? 'text-emerald-300' : 'text-orange-300'"
          >{{ delta() > 0 ? `+${delta()}` : delta() === 0 ? '±0' : delta() }}</span
        >
      </p>
      <p v-else class="mt-0.5 text-xs text-ink-dim">存活至今的个体总数</p>
    </div>
  </div>
</template>
