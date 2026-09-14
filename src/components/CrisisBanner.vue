<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ThreatRow } from '../game/analysis'
import { content } from '../game/content'
import { environmentIcon, severityChipsOnDark, severityIcons } from '../game/presentation'
import type { RunState } from '../game/types'

const props = defineProps<{
  state: RunState
  threats: ThreatRow[]
  total: number
}>()
const emit = defineEmits<{ drawer: [name: 'environment'] }>()

/** Exposed so the run view can move focus here on every generation change. */
const heading = ref<HTMLElement | null>(null)
defineExpose({ heading })

const environment = computed(() =>
  content.environments.find((entry) => entry.id === props.state.environment.environmentId)!,
)
const event = computed(() => content.events[props.state.environment.eventId])
const eventName = computed(() => event.value?.name ?? '环境变化')
const eventProse = computed(() =>
  event.value ? (event.value.flavor ?? event.value.description) : '',
)
/** The single worst threat gets the headline: that is the crisis of this generation. */
const worst = computed(() => {
  const order: ThreatRow['level'][] = ['none', 'mild', 'tense', 'danger', 'critical']
  return (
    [...props.threats].sort((a, b) => order.indexOf(b.level) - order.indexOf(a.level))[0] ?? null
  )
})
</script>

<template>
  <section class="board-panel p-4" aria-label="本代事件">
    <p class="board-eyebrow">第 {{ state.generation }} / {{ total }} 代 · 本代事件</p>
    <h1
      ref="heading"
      tabindex="-1"
      class="mt-1.5 flex flex-wrap items-center gap-2 text-xl leading-tight font-semibold text-ink outline-none"
    >
      <span aria-hidden="true">{{ environmentIcon(state.environment.environmentId) }}</span>
      <span>{{ eventName }}</span>
      <span
        class="board-chip"
        :class="
          state.environment.temperature === 'cold'
            ? 'border-sky-400/40 bg-sky-400/15 text-sky-100'
            : 'border-orange-400/40 bg-orange-400/15 text-orange-100'
        "
      >
        <span aria-hidden="true">{{ state.environment.temperature === 'cold' ? '❄' : '🔥' }}</span>
        {{ environment.name }}
      </span>
    </h1>
    <p class="mt-2 text-sm leading-relaxed text-ink-muted">{{ eventProse }}</p>
    <p class="mt-1.5 text-[11px] text-ink-dim">规则影响：{{ event?.description }}</p>

    <div
      v-if="worst"
      class="mt-3 rounded-lg border p-2.5"
      :class="severityChipsOnDark[worst.level]"
    >
      <p class="flex items-center gap-1.5 text-[11px] font-semibold">
        <span aria-hidden="true">{{ severityIcons[worst.level] }}</span>
        <span>最大威胁 · {{ worst.label }}（{{ worst.levelLabel }}）</span>
      </p>
      <p class="mt-1 text-xs leading-relaxed text-ink">{{ worst.headline }}</p>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span
        v-for="threat in threats"
        :key="threat.key"
        class="board-chip"
        :class="severityChipsOnDark[threat.level]"
        :title="threat.headline"
      >
        <span aria-hidden="true">{{ threat.icon }}</span
        >{{ threat.label }}
        <span class="opacity-90">{{ threat.levelLabel }}</span>
      </span>
      <button type="button" class="btn-board-quiet ml-auto" @click="emit('drawer', 'environment')">
        查看环境详情 <span aria-hidden="true">→</span>
      </button>
    </div>
  </section>
</template>
