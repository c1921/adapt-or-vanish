<script setup lang="ts">
import { computed } from 'vue'
import { effectContextFor } from '../game/analysis'
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
    .filter((entry) => entry.count > 0),
)
const context = computed(() => effectContextFor(props.state, content))
/** Everything the lineage has met so far: owned, fixed, or ever expressed. */
const discovered = computed(
  () =>
    new Set([
      ...props.state.cards.map((card) => card.traitId),
      ...props.state.permanentTraits.map((entry) => entry.traitId),
      ...Object.keys(props.state.expressionCounts),
    ]).size,
)
const total = Object.keys(content.traits).length
</script>

<template>
  <details class="panel p-5">
    <summary class="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold">
      <span aria-hidden="true">🃏</span>
      <span>基因库 · {{ state.cards.length }} 张</span>
      <span class="text-xs font-normal text-slate-500">{{ genes.length }} 种性状</span>
    </summary>
    <p class="mt-2 text-xs leading-relaxed text-slate-500">
      相同性状的卡牌共享固化进度，每代最多累计一次。固化时会移除全部同名牌。
    </p>
    <dl class="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
      <div class="rounded-lg bg-slate-50 py-3">
        <dt class="stat-label">拥有的牌</dt>
        <dd class="stat-value text-xl">{{ state.cards.length }}</dd>
      </div>
      <div class="rounded-lg bg-slate-50 py-3">
        <dt class="stat-label">发现性状</dt>
        <dd class="stat-value text-xl">{{ discovered }}</dd>
      </div>
      <div class="rounded-lg bg-violet-50 py-3">
        <dt class="stat-label">永久性状</dt>
        <dd class="stat-value text-xl text-violet-900">{{ state.permanentTraits.length }}</dd>
      </div>
      <div class="rounded-lg bg-slate-50 py-3">
        <dt class="stat-label">尚未发现</dt>
        <dd class="stat-value text-xl">{{ total - discovered }}</dd>
      </div>
    </dl>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div v-for="entry in genes" :key="entry.trait.id" class="flex flex-col">
        <p class="mb-2 text-xs text-slate-500">
          {{ entry.count }} 张 · 已表达 {{ state.expressionCounts[entry.trait.id] ?? 0 }} 代
        </p>
        <TraitCard
          class="flex-1"
          :trait="entry.trait"
          :context="context"
          :progress="state.expressionCounts[entry.trait.id] ?? 0"
          :threshold="content.rules.fixationThreshold"
        />
      </div>
    </div>
  </details>
</template>
