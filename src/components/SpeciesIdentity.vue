<script setup lang="ts">
import { computed } from 'vue'
import { effectContextFor } from '../game/analysis'
import { content } from '../game/content'
import { speciesIdentity } from '../game/species'
import type { RunState } from '../game/types'
import EffectList from './EffectList.vue'
import PopulationOrb from './board/PopulationOrb.vue'

const props = withDefaults(
  defineProps<{
    state: RunState
    /** Environment threats that are currently hurting the species most. */
    weakPoints: string[]
    /** Population the hovered card would produce, when a preview is active. */
    ghostPopulation?: number | null
  }>(),
  { ghostPopulation: null },
)

const context = computed(() => effectContextFor(props.state, content))
const identity = computed(() => speciesIdentity(props.state, content, context.value))
const tokens = computed(() =>
  props.state.permanentTraits
    .filter((entry) => content.traits[entry.traitId])
    .map((entry) => {
      const trait = content.traits[entry.traitId]!
      return {
        traitId: entry.traitId,
        name: trait.permanent.name,
        generation: entry.generation,
      }
    }),
)
</script>

<template>
  <section class="board-panel p-4" aria-label="当前物种">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="board-eyebrow">🐾 当前物种</p>
      <span class="board-chip border-violet-400/40 bg-violet-400/15 text-violet-100">
        永久性状 {{ state.permanentTraits.length }} / {{ content.rules.permanentLimit }}
      </span>
    </div>

    <div class="mt-3">
      <PopulationOrb :population="state.population" :ghost="ghostPopulation" />
    </div>

    <p class="mt-3 text-base font-semibold text-ink">{{ identity.name }}</p>
    <p class="text-xs leading-relaxed text-ink-muted">{{ identity.sentence }}</p>

    <ul v-if="tokens.length" class="mt-2.5 flex flex-wrap gap-1.5" aria-label="永久性状">
      <li
        v-for="token in tokens"
        :key="token.traitId"
        class="board-chip border-violet-400/40 bg-violet-500/15 text-violet-50"
        :title="`第 ${token.generation} 代固化`"
      >
        <span aria-hidden="true">🧬</span>{{ token.name }}
      </li>
    </ul>
    <p
      v-else
      class="mt-2.5 rounded-lg border border-dashed border-white/15 p-2.5 text-xs leading-relaxed text-ink-dim"
    >
      尚未形成稳定特征。连续表达同一个性状
      {{ content.rules.fixationThreshold }} 代并存活，就能让适应成为本能。
    </p>

    <div v-if="weakPoints.length" class="mt-2.5">
      <p class="board-eyebrow">当前弱点</p>
      <div class="mt-1 flex flex-wrap gap-1">
        <span
          v-for="point in weakPoints"
          :key="point"
          class="board-chip border-rose-400/40 bg-rose-500/15 text-rose-100"
        >
          <span aria-hidden="true">◆</span>{{ point }}
        </span>
      </div>
    </div>

    <p v-if="identity.expressing.length" class="mt-2 text-xs text-ink-dim">
      本代表达中：<span class="font-medium text-ink">{{ identity.expressing.join(' · ') }}</span>
    </p>

    <details v-if="identity.features.length" class="mt-3 border-t border-frame-line pt-2 text-xs">
      <summary class="cursor-pointer text-ink-dim">永久性状的详细数值</summary>
      <div class="mt-2 space-y-2.5">
        <div v-for="feature in identity.features" :key="feature.traitId">
          <p class="mb-1 font-medium text-ink">
            {{ feature.name }}
            <span class="font-normal text-ink-dim">第 {{ feature.generation }} 代固化</span>
          </p>
          <EffectList
            :effects="content.traits[feature.traitId]!.permanent.effects"
            variant="dark"
          />
        </div>
      </div>
    </details>
  </section>
</template>
