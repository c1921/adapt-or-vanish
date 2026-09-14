<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../../game/content'
import { environmentIcon } from '../../game/presentation'
import type { RunState } from '../../game/types'

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
    return 'border-emerald-300 bg-board ring-1 ring-emerald-400/70'
  return 'border-white/20 bg-transparent'
}
</script>

<template>
  <nav aria-label="生态旅程" class="min-w-0">
    <ol class="flex items-center gap-2 overflow-x-auto">
      <li
        v-for="(stage, index) in stages"
        :key="stage.definition.id"
        class="flex shrink-0 items-center gap-1.5"
        :aria-current="stage.current ? 'step' : undefined"
      >
        <span
          class="flex items-center gap-1"
          role="img"
          :aria-label="`${stage.definition.name}已完成 ${stage.completed} / ${stage.definition.duration} 代`"
        >
          <span aria-hidden="true" class="text-sm">{{ environmentIcon(stage.definition.id) }}</span>
          <span
            class="text-xs whitespace-nowrap"
            :class="stage.current ? 'font-semibold text-ink' : 'text-ink-dim'"
            >{{ stage.definition.name }}</span
          >
          <span class="flex gap-0.5">
            <span
              v-for="dot in stage.definition.duration"
              :key="dot"
              class="dot"
              :class="dotClass(stage, dot - 1)"
            />
          </span>
          <span class="text-[10px] tabular-nums text-ink-dim"
            >{{ stage.completed }}/{{ stage.definition.duration }}</span
          >
          <span
            v-if="stage.current"
            class="rounded bg-emerald-400/20 px-1 text-[10px] font-medium text-emerald-100"
            >当前</span
          >
        </span>
        <span v-if="index < stages.length - 1" aria-hidden="true" class="text-frame-line">━</span>
      </li>
    </ol>
    <p class="sr-only">共 {{ total }} 代，穿越 {{ stages.length }} 种生态环境。</p>
  </nav>
</template>
