<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import type { RunState } from '../game/types'
import TraitCard from './TraitCard.vue'
const props = defineProps<{ state: RunState }>()
const genes = computed(() =>
  Object.values(content.traits)
    .map((trait) => ({
      trait,
      count: props.state.cards.filter((card) => card.traitId === trait.id).length,
    }))
    .filter((entry) => entry.count),
)
</script>
<template>
  <details class="panel p-5">
    <summary class="cursor-pointer text-sm font-semibold">
      查看基因库 · {{ state.cards.length }} 张 / {{ genes.length }} 种性状
    </summary>
    <p class="mt-2 text-xs text-slate-500">
      同名牌共享表达进度，每代最多累计一次。固化时会移除全部同名牌。
    </p>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div v-for="entry in genes" :key="entry.trait.id" class="flex flex-col">
        <p class="mb-2 text-xs text-slate-500">
          {{ entry.count }} 张 · 已表达 {{ state.expressionCounts[entry.trait.id] ?? 0 }} 次
        </p>
        <TraitCard
          class="flex-1"
          :trait="entry.trait"
          :progress="state.expressionCounts[entry.trait.id] ?? 0"
          :threshold="content.rules.fixationThreshold"
        />
      </div>
    </div>
  </details>
</template>
