<script setup lang="ts">
import { computed } from 'vue'
import { effectContextFor } from '../game/analysis'
import { content } from '../game/content'
import type { RunState } from '../game/types'
import TraitCard from './board/TraitCard.vue'

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
  <section aria-label="基因库">
    <p class="text-xs leading-relaxed text-ink-muted">
      相同性状的卡牌共享固化进度，每代最多累计一次。固化时会移除全部同名牌。
    </p>
    <dl class="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
      <div class="rounded-lg border border-frame-line bg-black/20 py-2.5">
        <dt class="text-[11px] text-ink-dim">拥有的牌</dt>
        <dd class="text-xl font-semibold tabular-nums text-ink">{{ state.cards.length }}</dd>
      </div>
      <div class="rounded-lg border border-frame-line bg-black/20 py-2.5">
        <dt class="text-[11px] text-ink-dim">发现性状</dt>
        <dd class="text-xl font-semibold tabular-nums text-ink">{{ discovered }}</dd>
      </div>
      <div class="rounded-lg border border-violet-400/40 bg-violet-400/10 py-2.5">
        <dt class="text-[11px] text-violet-200">永久性状</dt>
        <dd class="text-xl font-semibold tabular-nums text-violet-100">
          {{ state.permanentTraits.length }}
        </dd>
      </div>
      <div class="rounded-lg border border-frame-line bg-black/20 py-2.5">
        <dt class="text-[11px] text-ink-dim">尚未发现</dt>
        <dd class="text-xl font-semibold tabular-nums text-ink">{{ total - discovered }}</dd>
      </div>
    </dl>
    <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="entry in genes" :key="entry.trait.id" class="flex flex-col">
        <p class="mb-1 text-[11px] text-ink-dim">
          {{ entry.count }} 张 · 已表达 {{ state.expressionCounts[entry.trait.id] ?? 0 }} 代
        </p>
        <TraitCard
          class="flex-1"
          :trait="entry.trait"
          :context="context"
          size="grid"
          detail="fold"
          :progress="state.expressionCounts[entry.trait.id] ?? 0"
          :threshold="content.rules.fixationThreshold"
        />
      </div>
    </div>
    <p v-if="!genes.length" class="mt-3 text-xs text-ink-dim">基因库暂时为空。</p>
  </section>
</template>
