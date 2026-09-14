<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import type { TraitDefinition } from '../game/types'
import type { EffectContext } from '../game/effects'
import { categoryLabels } from '../game/presentation'
import EffectList from './EffectList.vue'
import GameIcon from './GameIcon.vue'
const props = withDefaults(defineProps<{
  trait: TraitDefinition
  variant?: 'hand' | 'reward' | 'library' | 'detail'
  selected?: boolean
  disabledReason?: string
  progress?: number
  threshold?: number
  context?: EffectContext
}>(), { variant: 'detail', selected: false, disabledReason: '', progress: 0, threshold: 5 })
const emit = defineEmits<{ select: []; inspect: []; blocked: [reason: string] }>()
const interactive = computed(() => props.variant !== 'detail')
let timer: ReturnType<typeof setTimeout> | undefined
let held = false
let origin = { x: 0, y: 0 }
function cancelHold() { clearTimeout(timer) }
function hold(event: PointerEvent) {
  held = false
  origin = { x: event.clientX, y: event.clientY }
  if (props.variant === 'hand' && event.button === 0) timer = setTimeout(() => { held = true; emit('inspect') }, 500)
}
function move(event: PointerEvent) {
  if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) cancelHold()
}
function activate() {
  if (held) { held = false; return }
  if (props.variant === 'library') emit('inspect')
  else if (props.disabledReason) emit('blocked', props.disabledReason)
  else emit('select')
}
onBeforeUnmount(cancelHold)
</script>
<template>
  <article class="trait-card" :class="[`trait-card--${variant}`, { 'is-selected': selected, 'is-unavailable': !!disabledReason }]" :data-category="trait.category">
    <component :is="interactive ? 'button' : 'div'" :type="interactive ? 'button' : undefined" class="card-face" :aria-label="interactive ? `${variant === 'library' ? '查看' : '表达'}：${trait.name}` : undefined" :aria-pressed="interactive && variant !== 'library' ? selected : undefined" :aria-disabled="disabledReason ? true : undefined" @click="interactive && activate()" @pointerdown="interactive && hold($event)" @pointermove="move" @pointerup="cancelHold" @pointerleave="cancelHold" @pointercancel="cancelHold" @contextmenu="variant === 'hand' && $event.preventDefault()">
      <span class="card-topline"><span class="card-cost" :aria-label="`费用 ${trait.cost}`">{{ trait.cost }}</span><span class="card-category">{{ categoryLabels[trait.category] }}</span></span>
      <span class="card-name">{{ trait.name }}</span>
      <span class="card-art" aria-hidden="true"></span>
      <EffectList :effects="trait.effects" :context="context" :compact="variant === 'hand'" />
      <span class="card-progress"><span class="progress-pips" aria-hidden="true"><i v-for="n in threshold" :key="n" :class="{ filled: progress >= n }"></i></span><span>{{ Math.min(progress, threshold) }}/{{ threshold }}</span></span>
      <span v-if="selected" class="card-selected-mark" aria-label="已选择"><GameIcon name="check" :size="12" /></span>
      <span v-if="disabledReason" class="card-blocked-label">额度不足</span>
    </component>
    <button v-if="variant === 'hand' || variant === 'reward'" class="card-inspect" type="button" :aria-label="`查看${trait.name}详情`" @click.stop="emit('inspect')"><GameIcon name="info" :size="17" /></button>
  </article>
</template>
