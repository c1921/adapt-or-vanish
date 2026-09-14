<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import { environmentIcon } from '../game/presentation'
import type { RunState } from '../game/types'

const props = defineProps<{ state: RunState; total: number }>()

/** The journey, not a tab bar: every environment is a leg with its own generations. */
const stages = computed(() => {
  let cursor = 1
  return content.environments.map((definition) => {
    const start = cursor
    cursor += definition.duration
    const current = props.state.environment.environmentId === definition.id
    return {
      definition,
      start,
      completed: Math.max(
        0,
        Math.min(definition.duration, props.state.history.length - (start - 1)),
      ),
      currentGeneration: current ? props.state.generation - start : -1,
      current,
    }
  })
})
function dotClass(stage: (typeof stages.value)[number], index: number) {
  if (stage.start + index <= props.state.history.length) return 'border-emerald-400 bg-emerald-400'
  if (stage.current && index === stage.currentGeneration)
    return 'border-emerald-300 bg-slate-900 ring-2 ring-emerald-400/60'
  return 'border-white/25 bg-transparent'
}
</script>

<template>
  <nav aria-label="生态旅程">
    <ol class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <li
        v-for="(stage, index) in stages"
        :key="stage.definition.id"
        class="flex min-w-0 items-center gap-3 sm:flex-1"
        :aria-current="stage.current ? 'step' : undefined"
      >
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span aria-hidden="true">{{ environmentIcon(stage.definition.id) }}</span>
            <span :class="stage.current ? 'font-semibold text-white' : 'text-slate-300'">{{
              stage.definition.name
            }}</span>
            <span class="tabular-nums text-slate-400"
              >{{ stage.completed }} / {{ stage.definition.duration }}</span
            >
            <span
              v-if="stage.current"
              class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-100"
              >当前</span
            >
            <span v-else-if="stage.start > state.generation" class="text-[10px] text-slate-500"
              >尚未到达</span
            >
          </p>
          <div
            class="mt-1.5 flex gap-1"
            role="img"
            :aria-label="`${stage.definition.name}已完成 ${stage.completed} / ${stage.definition.duration} 代`"
          >
            <span
              v-for="dot in stage.definition.duration"
              :key="dot"
              class="dot"
              :class="dotClass(stage, dot - 1)"
            />
          </div>
        </div>
        <span
          v-if="index < stages.length - 1"
          aria-hidden="true"
          class="hidden text-slate-600 sm:block"
          >━━</span
        >
      </li>
    </ol>
    <p class="sr-only">共 {{ total }} 代，穿越 {{ stages.length }} 种生态环境。</p>
  </nav>
</template>
