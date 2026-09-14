<script setup lang="ts">
import { computed } from 'vue'
import { effectContextFor } from '../game/analysis'
import { content } from '../game/content'
import { speciesIdentity } from '../game/species'
import type { RunState } from '../game/types'
import EffectList from './EffectList.vue'

const props = defineProps<{
  state: RunState
  /** Environment threats that are currently hurting the species most. */
  weakPoints: string[]
}>()

const identity = computed(() =>
  speciesIdentity(props.state, content, effectContextFor(props.state, content)),
)
</script>

<template>
  <section class="panel p-5" aria-label="当前物种">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="section-title flex items-center gap-1.5">
        <span aria-hidden="true">🐾</span>当前物种
      </h2>
      <span class="chip border-violet-200 bg-violet-50 text-violet-800">
        永久性状 {{ state.permanentTraits.length }} / {{ content.rules.permanentLimit }}
      </span>
    </div>

    <p class="mt-3 text-lg font-semibold text-slate-900">{{ identity.name }}</p>
    <p class="mt-1 text-sm leading-relaxed text-slate-600">{{ identity.sentence }}</p>

    <ul v-if="identity.features.length" class="mt-3 space-y-2">
      <li
        v-for="feature in identity.features"
        :key="feature.traitId"
        class="rounded-lg border border-violet-100 bg-violet-50/40 p-2.5"
      >
        <p class="flex flex-wrap items-center gap-2 text-sm font-medium text-violet-900">
          <span aria-hidden="true">🧬</span>{{ feature.name }}
          <span class="text-[11px] font-normal text-violet-700"
            >第 {{ feature.generation }} 代固化</span
          >
        </p>
        <div class="mt-1.5 flex flex-wrap gap-1">
          <span
            v-for="chip in feature.benefits"
            :key="chip.text"
            class="chip border-emerald-200 bg-white text-emerald-800"
            ><span aria-hidden="true">🟢</span>{{ chip.text }}</span
          >
          <span
            v-for="chip in feature.costs"
            :key="chip.text"
            class="chip border-orange-200 bg-white text-orange-900"
            ><span aria-hidden="true">🔴</span>{{ chip.text }}</span
          >
        </div>
      </li>
    </ul>
    <p
      v-else
      class="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-xs leading-relaxed text-slate-500"
    >
      还没有任何特征被固定下来。连续表达同一个性状
      {{ content.rules.fixationThreshold }} 代并存活，就能让适应成为本能。
    </p>

    <div v-if="weakPoints.length" class="mt-3">
      <p class="text-[11px] font-semibold tracking-widest text-slate-500">当前弱点</p>
      <div class="mt-1.5 flex flex-wrap gap-1">
        <span
          v-for="point in weakPoints"
          :key="point"
          class="chip border-rose-200 bg-rose-50 text-rose-800"
        >
          <span aria-hidden="true">◆</span>{{ point }}
        </span>
      </div>
    </div>

    <p v-if="identity.expressing.length" class="mt-3 text-xs text-slate-500">
      本代表达中：<span class="font-medium text-slate-700">{{
        identity.expressing.join(' · ')
      }}</span>
    </p>

    <details v-if="identity.features.length" class="mt-3 border-t border-slate-100 pt-3 text-xs">
      <summary class="cursor-pointer text-slate-600">永久性状的详细数值</summary>
      <div class="mt-2 space-y-2.5">
        <div v-for="feature in identity.features" :key="feature.traitId">
          <p class="mb-1 font-medium text-slate-700">
            {{ feature.name }}
            <span class="font-normal text-slate-400">第 {{ feature.generation }} 代固化</span>
          </p>
          <EffectList :effects="content.traits[feature.traitId]!.permanent.effects" />
        </div>
      </div>
    </details>
  </section>
</template>
