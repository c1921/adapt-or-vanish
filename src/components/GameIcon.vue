<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
  leaf: 'M20 4C10 2 3 6 4 13c1 7 10 8 14 1 2-3 2-6 2-10ZM4 20 15 9M7 15l-1-5m5 1 5 1',
  temperature: 'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0ZM12 8v9m6-10h3m-3 4h2',
  shield: 'm12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Zm-4 9 3 3 5-6',
  population: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a7 7 0 0 1 14 0v2m1-16a3 3 0 0 1 0 6m2 4c2 1 3 3 3 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  close: 'm6 6 12 12M6 18 18 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14M5 12h14',
  cards: 'm7 3 13 2-2 16-13-2L7 3ZM4 6 2 19l13 3M10 8h6m-7 4h6',
  history: 'M3 10a9 9 0 1 1 1 7M3 3v7h7m2-4v6l4 2',
  dna: 'M7 2c0 8 10 12 10 20M17 2C17 10 7 14 7 22M8 5h8m-6 4h4m-4 6h4m-6 4h8',
  sprout: 'M12 21v-9M12 16C3 16 3 11 3 7c7 0 9 3 9 9Zm0-4c0-6 3-9 9-9 0 6-3 9-9 9Z',
  chevron: 'm9 5 7 7-7 7',
  down: 'm5 9 7 7 7-7',
  search: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 6 6',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
}
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="game-icon">
    <path :d="paths[name] ?? paths.info" />
  </svg>
</template>
