<script setup lang="ts">
import { computed } from 'vue'
import { fixationStatus } from '../../game/analysis'
import { content } from '../../game/content'
import { categoryLabels, tagLabels } from '../../game/presentation'
import { categoryTheme } from '../../game/theme'
import type { TraitDefinition } from '../../game/types'
import EffectList from '../EffectList.vue'

const props = defineProps<{ trait: TraitDefinition; progress: number }>()
defineEmits<{ close: [] }>()
const theme = computed(() => categoryTheme[props.trait.category])
const fixation = computed(() => fixationStatus(props.progress, content.rules.fixationThreshold))
</script>

<template>
  <section
    class="max-h-56 overflow-y-auto border-t border-frame-line bg-frame/70 px-3 py-3"
    :class="theme.soft"
    aria-label="卡牌详细数值"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
          <span>{{ trait.name }}</span>
          <span class="board-chip border-white/15 bg-black/30 text-ink-muted"
            >{{ categoryLabels[trait.category] }} ·
            {{ trait.tags.map((tag) => tagLabels[tag] ?? tag).join(' ') }}</span
          >
          <span class="board-chip border-amber-300/40 bg-amber-400/15 text-amber-100"
            >占用 {{ trait.cost }} 点表达额度</span
          >
        </p>
        <p class="mt-1 text-xs leading-relaxed text-ink-muted">{{ trait.description }}</p>
      </div>
      <button type="button" class="btn-board-quiet" @click="$emit('close')">收起详细数值</button>
    </div>

    <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-lg border border-white/10 bg-black/25 p-2.5">
        <p class="mb-1 text-[11px] text-ink-dim">本次表达时</p>
        <EffectList :effects="trait.effects" variant="dark" />
      </div>
      <div class="rounded-lg border border-violet-300/25 bg-violet-400/10 p-2.5">
        <p class="mb-1 text-[11px] text-violet-200">{{ trait.permanent.name }}（固化后永久生效）</p>
        <EffectList :effects="trait.permanent.effects" variant="dark" />
      </div>
      <div class="rounded-lg border border-white/10 bg-black/25 p-2.5">
        <p class="mb-1 text-[11px] text-ink-dim">🧬 固化进度</p>
        <p class="text-xs text-ink">
          连续表达 {{ fixation.threshold }} 代即可永久获得
          <span class="font-semibold tabular-nums"
            >（当前 {{ fixation.count }} / {{ fixation.threshold }}）</span
          >
        </p>
        <p class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <span
            class="block h-full rounded-full bg-violet-400"
            :style="{ width: `${fixation.ratio * 100}%` }"
          />
        </p>
        <p class="mt-1 text-[11px] text-violet-200">{{ fixation.text }}</p>
        <p v-if="fixation.ready" class="mt-1 text-[11px] font-medium text-violet-100">
          本代结算后即可固化为永久性状。
        </p>
      </div>
    </div>
  </section>
</template>
