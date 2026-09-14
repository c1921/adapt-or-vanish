<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * Counts a population number to its new value so a change is felt, not just read.
 * Server rendering and reduced-motion users get the final value immediately.
 */
const props = withDefaults(defineProps<{ value: number; duration?: number }>(), { duration: 260 })
const display = ref(props.value)
let frame = 0

function animate(from: number, to: number) {
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
    display.value = to
    return
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    display.value = to
    return
  }
  const start = performance.now()
  cancelAnimationFrame(frame)
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / props.duration)
    const eased = 1 - (1 - t) ** 3
    display.value = Math.round(from + (to - from) * eased)
    if (t < 1) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}

watch(
  () => props.value,
  (to, from) => {
    if (from === undefined || from === to) {
      display.value = to
      return
    }
    animate(from, to)
  },
)
onBeforeUnmount(() => {
  if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
})
</script>

<template>
  <span class="tabular-nums">{{ display }}</span>
</template>
