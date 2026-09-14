<script setup lang="ts">
import { computed, ref } from 'vue'
import { content } from '../game/content'
import type { ThreatRow } from '../game/analysis'
import { environmentIcon, percent, severityChipsOnDark } from '../game/presentation'
import type { RunState } from '../game/types'
import EnvironmentRoute from './EnvironmentRoute.vue'

const props = defineProps<{
  state: RunState
  /** Population at the start of this generation. */
  before: number
  /** Projection of the current plan while choosing, or the settled result afterwards. */
  after: number
  /** The projection when nothing new is expressed; only meaningful while choosing. */
  baseline: number | null
  threats: ThreatRow[]
  total: number
  /** True while this generation is still a prediction. */
  pending: boolean
}>()

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
const delta = computed(() => props.after - props.before)
const deltaText = computed(() => {
  if (props.after === 0) return '这一代会灭绝'
  if (delta.value > 0) return `种群增加 ${delta.value} 个体`
  if (delta.value === 0) return '种群规模不变'
  const loss = `损失 ${Math.abs(delta.value)} 个体`
  return props.pending
    ? loss
    : `${loss} · 存活率 ${percent(props.before > 0 ? props.after / props.before : 1)}`
})
const deltaClass = computed(() =>
  props.after === 0
    ? 'text-red-300'
    : delta.value > 0
      ? 'text-emerald-300'
      : delta.value === 0
        ? 'text-slate-300'
        : 'text-amber-200',
)
const savings = computed(() => (props.baseline === null ? null : props.after - props.baseline))
</script>

<template>
  <section class="panel-crisis" aria-label="当前危机">
    <div class="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold tracking-widest text-slate-400">
          第 {{ state.generation }} / {{ total }} 代 · {{ state.environment.stageName }}
        </p>
        <h1
          ref="heading"
          tabindex="-1"
          class="mt-2 flex flex-wrap items-center gap-2 text-2xl font-semibold outline-none"
        >
          <span aria-hidden="true">{{ environmentIcon(state.environment.environmentId) }}</span>
          <span>{{ eventName }}</span>
          <span
            class="rounded border px-2 py-0.5 text-xs font-medium"
            :class="
              state.environment.temperature === 'cold'
                ? 'border-sky-400/40 bg-sky-400/15 text-sky-100'
                : 'border-orange-400/40 bg-orange-400/15 text-orange-100'
            "
            >{{ environment.name }}</span
          >
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{{ eventProse }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-semibold tracking-widest text-slate-400">主要威胁</span>
          <span
            v-for="threat in threats"
            :key="threat.key"
            :class="severityChipsOnDark[threat.level]"
            :title="threat.headline"
          >
            <span aria-hidden="true">{{ threat.icon }}</span>
            <span>{{ threat.label }}</span>
            <span class="opacity-90">{{ threat.levelLabel }}</span>
          </span>
        </div>
      </div>

      <div
        class="shrink-0 rounded-xl border border-white/10 bg-white/5 px-5 py-4 lg:min-w-60"
        aria-label="种群预测"
      >
        <div class="flex items-end justify-between gap-6">
          <div>
            <p class="text-[11px] font-semibold tracking-widest text-slate-400">
              {{ pending ? '当前种群' : '本代开始' }}
            </p>
            <p class="text-3xl leading-none font-semibold tabular-nums" data-testid="population">
              {{ before }}
            </p>
          </div>
          <span aria-hidden="true" class="pb-1 text-xl text-slate-500">→</span>
          <div class="text-right">
            <p class="text-[11px] font-semibold tracking-widest text-slate-400">
              {{ pending ? '预计下一代' : '本代结果' }}
            </p>
            <p
              class="text-3xl leading-none font-semibold tabular-nums"
              :class="after === 0 ? 'text-red-300' : 'text-white'"
            >
              {{ after }}
            </p>
          </div>
        </div>
        <p class="mt-2 text-right text-xs font-medium" :class="deltaClass" aria-live="polite">
          {{ deltaText }}
        </p>
        <p
          v-if="baseline !== null && savings !== null"
          class="mt-2 border-t border-white/10 pt-2 text-[11px] leading-4 text-slate-400"
        >
          不做新的适应：{{ baseline }} 个体活下来<template v-if="savings > 0">
            · 本代选择多保住 {{ savings }} 个体</template
          >
        </p>
      </div>
    </div>

    <div class="border-t border-white/10 px-5 py-3 sm:px-6">
      <EnvironmentRoute :state="state" :total="total" />
    </div>
  </section>
</template>
