<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CardImpact } from '../../game/analysis'
import { fixationStatus } from '../../game/analysis'
import type { EffectChip, EffectContext } from '../../game/presentation'
import {
  categoryIcons,
  categoryLabels,
  effectChips,
  signed,
  tagLabels,
} from '../../game/presentation'
import { categoryTheme, traitGlyph } from '../../game/theme'
import type { TraitDefinition } from '../../game/types'
import EffectList from '../EffectList.vue'

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
    size?: 'hand' | 'grid' | 'reward'
    /** 'strip' hands details to the hand zone, 'fold' keeps them on the card. */
    detail?: 'strip' | 'fold' | 'none'
    detailsOpen?: boolean
    tabIndex?: number
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
    size: 'hand',
    detail: 'none',
    detailsOpen: false,
    tabIndex: undefined,
  },
)
const emit = defineEmits<{ select: []; 'toggle-details': [] }>()
const folded = ref(false)
/** HandZone drives roving focus through this handle. */
const button = ref<HTMLElement | null>(null)
defineExpose({ focus: () => button.value?.focus() })

const theme = computed(() => categoryTheme[props.trait.category])
const glyph = computed(() => traitGlyph(props.trait.id, categoryIcons[props.trait.category]))
const chips = computed(() => effectChips(props.trait.effects, props.context))
const benefits = computed(() => chips.value.filter((chip) => chip.polarity === 'benefit'))
const costs = computed(() => chips.value.filter((chip) => chip.polarity === 'cost'))
const inactive = computed(() => chips.value.filter((chip) => chip.polarity === 'inactive'))
const fixation = computed(() => fixationStatus(props.progress, props.threshold))
const typeLine = computed(
  () =>
    `${categoryLabels[props.trait.category]} · ${props.trait.tags
      .map((tag) => tagLabels[tag] ?? tag)
      .join(' ')}`,
)

/** The card answers one question first: what does this trait do for my species now? */
const impactView = computed(() => {
  const impact = props.impact
  if (!impact) return null
  const magnitude = Math.abs(impact.delta)
  if (impact.selected)
    return impact.delta > 0
      ? { tone: 'growth', label: '本方案中保住', value: `+${magnitude} 个体` }
      : impact.delta === 0
        ? { tone: 'neutral', label: '已加入方案 · 无净影响', value: '' }
        : { tone: 'cost', label: '已加入方案 · 损失', value: `−${magnitude} 个体` }
  return impact.delta > 0
    ? { tone: 'growth', label: '预计多存活', value: `+${magnitude} 个体` }
    : impact.delta === 0
      ? { tone: 'neutral', label: '对种群影响有限', value: '' }
      : { tone: 'cost', label: '预计减少', value: `−${magnitude} 个体` }
})
const impactClass = computed(() =>
  impactView.value?.tone === 'growth'
    ? 'border-emerald-300/60 bg-emerald-400/20 text-emerald-50'
    : impactView.value?.tone === 'cost'
      ? 'border-rose-300/60 bg-rose-500/20 text-rose-50'
      : 'border-white/15 bg-white/5 text-ink-muted',
)
const chipClass = (chip: EffectChip) =>
  chip.polarity === 'benefit'
    ? 'text-emerald-200'
    : chip.polarity === 'cost'
      ? 'text-orange-200'
      : 'text-ink-dim'
const rowClass = computed(() =>
  props.size === 'hand' ? 'card-lift' : 'transition hover:-translate-y-1',
)
const frameClass = computed(() => {
  if (props.selected) return `${theme.value.frame} ring-2 ${theme.value.ring}`
  if (props.disabled) return 'border-white/10 saturate-50'
  return theme.value.frame
})
</script>

<template>
  <article
    class="flex min-w-0 flex-col"
    :class="size === 'hand' ? 'w-[clamp(9.5rem,13vw,12.5rem)]' : 'w-full'"
  >
    <component
      :is="selectable ? 'button' : 'div'"
      ref="button"
      :type="selectable ? 'button' : undefined"
      :disabled="selectable && disabled"
      :tabindex="selectable ? tabIndex : undefined"
      :aria-pressed="selectable ? selected : undefined"
      :aria-label="selectable ? `表达性状：${trait.name}` : undefined"
      :title="disabled && disabledReason ? disabledReason : undefined"
      class="card-face"
      :class="[
        frameClass,
        rowClass,
        selected ? 'card-raised' : '',
        selectable && !disabled ? 'cursor-pointer' : '',
        selectable && disabled ? 'cursor-not-allowed opacity-70' : '',
      ]"
      @click="selectable && emit('select')"
    >
      <span
        class="cost-gem"
        :class="disabled ? 'cost-gem-off' : ''"
        :title="`占用 ${trait.cost} 点表达额度`"
        >{{ trait.cost }}</span
      >
      <span
        v-if="selected"
        class="absolute top-1.5 right-1.5 z-20 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950"
        >已选择</span
      >
      <span
        v-else-if="caption"
        class="absolute top-1.5 right-1.5 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-ink"
        >{{ caption }}</span
      >

      <span class="card-art" :class="theme.art">
        <slot name="art">
          <span class="card-glyph" aria-hidden="true">{{ glyph }}</span>
        </slot>
      </span>

      <span class="name-plate" :class="theme.plate">{{ trait.name }}</span>
      <span class="type-line">{{ typeLine }}</span>

      <span class="rules-box">
        <span v-for="chip in benefits" :key="chip.text" :class="chipClass(chip)">
          <span aria-hidden="true">🟢</span>{{ chip.text }}
          <span class="font-semibold tabular-nums">{{ signed(chip.amount) }}</span>
        </span>
        <span v-for="chip in costs" :key="chip.text" :class="chipClass(chip)">
          <span aria-hidden="true">🔴</span>{{ chip.text }}
          <span class="font-semibold tabular-nums">{{ signed(chip.amount) }}</span>
        </span>
        <span
          v-for="chip in inactive"
          :key="`${chip.text}-${chip.inactiveReason}`"
          :class="chipClass(chip)"
          :title="chip.inactiveReason"
        >
          <span aria-hidden="true">⚪</span>{{ chip.text }}
          <span class="text-ink-dim">{{ chip.inactiveReason }}</span>
        </span>
      </span>

      <span v-if="size !== 'hand'" class="mx-2 mt-1 text-[10px] leading-4 text-ink-muted">{{
        trait.description
      }}</span>

      <span v-if="impactView" class="result-strip" :class="impactClass">
        {{ impactView.label }}
        <span v-if="impactView.value" class="ml-1 text-sm">{{ impactView.value }}</span>
      </span>

      <span class="fixation-line" :title="fixation.text">
        <span class="flex items-center gap-1">
          <span aria-hidden="true">🧬</span>
          <span v-if="fixation.ready" class="font-semibold">已满足固化条件</span>
          <span v-else class="truncate"
            >固化进度 {{ fixation.count }} / {{ fixation.threshold }} · 再表达
            {{ fixation.remaining }} 代</span
          >
        </span>
        <span v-if="!fixation.ready" class="card-meter" role="img" :aria-label="fixation.text">
          <span
            class="block h-full rounded-full bg-violet-400"
            :style="{ width: `${fixation.ratio * 100}%` }"
          />
        </span>
      </span>
    </component>

    <p v-if="disabled && disabledReason" class="mt-1 px-1 text-[10px] text-orange-300">
      {{ disabledReason }}
    </p>

    <button
      v-if="detail === 'strip'"
      type="button"
      class="mt-1 cursor-pointer rounded px-1 py-0.5 text-[10px] text-ink-dim transition hover:text-ink"
      :aria-expanded="detailsOpen"
      @click="emit('toggle-details')"
    >
      {{ detailsOpen ? '收起详细数值' : '详细数值' }}
    </button>

    <div v-if="detail === 'fold'" class="mt-1">
      <button
        type="button"
        class="w-full cursor-pointer rounded px-1 py-0.5 text-left text-[10px] text-ink-dim transition hover:text-ink"
        :aria-expanded="folded"
        @click="folded = !folded"
      >
        {{ folded ? '收起详细数值' : '详细数值' }}
      </button>
      <div v-if="folded" class="mt-1 space-y-2 px-1 text-[11px]">
        <div>
          <p class="text-ink-dim">本次表达时</p>
          <EffectList :effects="trait.effects" variant="dark" />
        </div>
        <div>
          <p class="text-ink-dim">{{ trait.permanent.name }}（永久后）</p>
          <EffectList :effects="trait.permanent.effects" variant="dark" />
        </div>
      </div>
    </div>
  </article>
</template>
