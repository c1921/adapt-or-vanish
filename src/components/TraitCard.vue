<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CardImpact } from '../game/analysis'
import { fixationStatus } from '../game/analysis'
import type { EffectContext } from '../game/presentation'
import { categoryIcons, categoryLabels, effectChips, signed, tagLabels } from '../game/presentation'
import type { TraitDefinition } from '../game/types'
import EffectList from './EffectList.vue'

const props = withDefaults(
  defineProps<{
    trait: TraitDefinition
    /** Climate and tags used to judge whether each effect is live right now. */
    context: EffectContext
    selectable?: boolean
    selected?: boolean
    disabled?: boolean
    disabledReason?: string
    /** Result of this card in the current environment, when a forecast exists. */
    impact?: CardImpact | null
    progress?: number
    threshold?: number
    /** Small label above the name, for example in the evolution reward list. */
    caption?: string
  }>(),
  {
    selectable: false,
    selected: false,
    disabled: false,
    disabledReason: '',
    impact: null,
    progress: 0,
    threshold: 5,
    caption: '',
  },
)
defineEmits<{ select: [] }>()
const expanded = ref(false)

const chips = computed(() => effectChips(props.trait.effects, props.context))
const benefits = computed(() => chips.value.filter((chip) => chip.polarity === 'benefit'))
const costs = computed(() => chips.value.filter((chip) => chip.polarity === 'cost'))
const inactive = computed(() => chips.value.filter((chip) => chip.polarity === 'inactive'))
const fixation = computed(() => fixationStatus(props.progress, props.threshold))

/** The card answers one question first: what does this trait do for my species now? */
const impactView = computed(() => {
  const impact = props.impact
  if (!impact) return null
  const magnitude = Math.abs(impact.delta)
  if (impact.selected)
    return impact.delta > 0
      ? { tone: 'growth', label: '本方案中保住', value: `+${magnitude}`, unit: '个体' }
      : impact.delta === 0
        ? { tone: 'neutral', label: '已加入方案 · 对种群无净影响', value: '', unit: '' }
        : { tone: 'cost', label: '已加入方案 · 预计损失', value: `−${magnitude}`, unit: '个体' }
  return impact.delta > 0
    ? { tone: 'growth', label: '选择后预计多存活', value: `+${magnitude}`, unit: '个体' }
    : impact.delta === 0
      ? { tone: 'neutral', label: '对当前种群影响有限', value: '', unit: '' }
      : { tone: 'cost', label: '选择后预计减少', value: `−${magnitude}`, unit: '个体' }
})
const impactClass = computed(() => {
  switch (impactView.value?.tone) {
    case 'growth':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'cost':
      return 'border-rose-200 bg-rose-50 text-rose-900'
    case 'neutral':
      return 'border-slate-200 bg-slate-50 text-slate-600'
    default:
      return ''
  }
})
const chipClass = (polarity: 'benefit' | 'cost' | 'inactive') =>
  polarity === 'benefit'
    ? 'chip border-emerald-200 bg-emerald-50 text-emerald-800'
    : polarity === 'cost'
      ? 'chip border-orange-200 bg-orange-50 text-orange-900'
      : 'chip border-slate-200 bg-white text-slate-500'
</script>

<template>
  <article
    class="trait-card"
    :class="
      selected
        ? 'border-emerald-600 ring-2 ring-emerald-500/30'
        : disabled
          ? 'border-slate-200 opacity-60'
          : 'border-slate-300'
    "
  >
    <component
      :is="selectable ? 'button' : 'div'"
      :type="selectable ? 'button' : undefined"
      :disabled="selectable && disabled"
      :aria-pressed="selectable ? selected : undefined"
      :aria-label="selectable ? `表达性状：${trait.name}` : undefined"
      :title="disabled && disabledReason ? disabledReason : undefined"
      class="flex w-full flex-1 flex-col p-3.5 text-left"
      :class="[
        selectable && !disabled
          ? 'cursor-pointer hover:bg-slate-50 focus-visible:-outline-offset-2'
          : '',
        selectable && disabled ? 'cursor-not-allowed' : '',
        selected ? 'bg-emerald-50/60' : '',
      ]"
      @click="selectable && $emit('select')"
    >
      <span class="flex w-full items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wide text-slate-500">
          <span aria-hidden="true">{{ categoryIcons[trait.category] }}</span>
          {{ caption || `${categoryLabels[trait.category]}性状` }}
        </span>
        <span
          class="rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
          :class="
            selected
              ? 'border-emerald-300 bg-white text-emerald-800'
              : 'border-slate-200 text-slate-600'
          "
          :title="`占用 ${trait.cost} 点表达额度`"
          >{{ trait.cost }} 点</span
        >
      </span>

      <span class="mt-1.5 flex items-center gap-2">
        <span class="text-base font-semibold text-slate-900">{{ trait.name }}</span>
        <span
          v-if="selected"
          class="rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] font-medium text-white"
          >已选择</span
        >
      </span>

      <span
        v-if="impactView"
        class="mt-2 flex flex-wrap items-baseline gap-x-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
        :class="impactClass"
      >
        {{ impactView.label }}
        <span v-if="impactView.value" class="text-base font-semibold tabular-nums">{{
          impactView.value
        }}</span>
        <span v-if="impactView.unit">{{ impactView.unit }}</span>
      </span>

      <span class="mt-2.5 flex flex-col items-start gap-1">
        <span v-for="chip in benefits" :key="chip.text" :class="chipClass('benefit')">
          <span aria-hidden="true">🟢</span>{{ chip.text }}
          <span class="tabular-nums">{{ signed(chip.amount) }}</span>
        </span>
        <span v-for="chip in costs" :key="chip.text" :class="chipClass('cost')">
          <span aria-hidden="true">🔴</span>{{ chip.text }}
          <span class="tabular-nums">{{ signed(chip.amount) }}</span>
        </span>
        <span
          v-for="chip in inactive"
          :key="`${chip.text}-${chip.inactiveReason}`"
          :class="chipClass('inactive')"
        >
          <span aria-hidden="true">⚪</span>{{ chip.text }}
          <span class="text-slate-400">{{ chip.inactiveReason }}</span>
        </span>
      </span>

      <span class="mt-2.5 text-xs leading-relaxed text-slate-500">{{ trait.description }}</span>

      <span class="mt-3 flex flex-wrap gap-1">
        <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{{
          categoryLabels[trait.category]
        }}</span>
        <span
          v-for="tag in trait.tags"
          :key="tag"
          class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500"
          >{{ tagLabels[tag] ?? tag }}</span
        >
      </span>

      <span class="mt-auto block w-full pt-3">
        <span class="flex items-center gap-2 text-[11px] font-medium text-violet-800">
          <span aria-hidden="true">🧬</span>
          <span v-if="fixation.ready">已满足固化条件</span>
          <span v-else>固化进度 {{ fixation.count }} / {{ fixation.threshold }}</span>
        </span>
        <span
          v-if="!fixation.ready"
          class="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
          role="img"
          :aria-label="`固化进度 ${fixation.count} / ${fixation.threshold}`"
        >
          <span
            class="block h-full rounded-full bg-violet-500 transition-all duration-300"
            :style="{ width: `${fixation.ratio * 100}%` }"
          />
        </span>
        <span class="mt-1 block text-[11px] leading-4 text-slate-500">{{ fixation.text }}</span>
      </span>
    </component>

    <div
      v-if="disabled && disabledReason"
      class="border-t border-slate-100 px-3.5 py-2 text-[11px] text-orange-800"
    >
      {{ disabledReason }}
    </div>

    <div class="border-t border-slate-100 px-2 py-1.5">
      <button
        type="button"
        class="btn-ghost w-full justify-between"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <span>{{ expanded ? '收起详细数值' : '详细数值' }}</span>
        <span aria-hidden="true">{{ expanded ? '▴' : '▾' }}</span>
      </button>
      <div v-if="expanded" class="mt-1 space-y-3 px-1.5 pb-1.5">
        <div>
          <p class="mb-1 text-[11px] text-slate-500">本次表达时</p>
          <EffectList :effects="trait.effects" />
        </div>
        <div>
          <p class="mb-1 text-[11px] text-slate-500">
            {{ trait.permanent.name }}（成为永久性状后）
          </p>
          <EffectList :effects="trait.permanent.effects" />
        </div>
      </div>
    </div>
  </article>
</template>
