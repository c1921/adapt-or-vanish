<script setup lang="ts">
import type { TraitDefinition } from '../game/types'
import { categoryLabels, tagLabels } from '../game/presentation'
import EffectList from './EffectList.vue'
withDefaults(
  defineProps<{
    trait: TraitDefinition
    selectable?: boolean
    selected?: boolean
    disabled?: boolean
    progress?: number
    threshold?: number
  }>(),
  { selectable: false, selected: false, disabled: false, progress: 0, threshold: 5 },
)
defineEmits<{ select: [] }>()
</script>
<template>
  <article
    class="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-white"
    :class="selected ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-slate-200'"
  >
    <component
      :is="selectable ? 'button' : 'div'"
      :type="selectable ? 'button' : undefined"
      :aria-label="selectable ? `表达：${trait.name}` : undefined"
      :aria-pressed="selectable ? selected : undefined"
      :disabled="selectable && disabled"
      :title="disabled ? '表达额度不足，请先取消其他卡牌' : undefined"
      class="flex h-full w-full flex-1 flex-col p-4 text-left"
      :class="[
        selectable
          ? 'cursor-pointer hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-55'
          : '',
        selected ? 'bg-emerald-50/60' : '',
      ]"
      @click="selectable && $emit('select')"
    >
      <span class="mb-2 flex w-full items-center justify-between gap-2 text-xs text-slate-500"
        ><span>{{ categoryLabels[trait.category] }}性状</span
        ><span
          class="rounded border px-2 py-0.5 font-semibold tabular-nums"
          :class="
            selected
              ? 'border-emerald-300 bg-white text-emerald-800'
              : 'border-slate-200 text-slate-700'
          "
          >{{ trait.cost }} 点</span
        ></span
      >
      <span class="text-base font-semibold text-slate-900"
        >{{ trait.name
        }}<span v-if="selected" class="ml-2 text-xs font-medium text-emerald-700"
          >已选择</span
        ></span
      >
      <span class="mt-1 mb-3 text-xs leading-relaxed text-slate-500">{{ trait.description }}</span>
      <EffectList :effects="trait.effects" />
      <span class="mt-auto flex w-full flex-wrap gap-1 pt-3"
        ><span
          v-for="tag in trait.tags"
          :key="tag"
          class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500"
          >{{ tagLabels[tag] ?? tag }}</span
        ></span
      >
    </component>
    <details class="border-t border-slate-100 px-4 py-2.5 text-xs">
      <summary class="cursor-pointer text-slate-600">
        固化 {{ Math.min(progress, threshold) }}/{{ threshold }} · {{ trait.permanent.name }}
      </summary>
      <div class="mt-3 space-y-2">
        <p class="text-slate-500">达标后可主动固化，下代起永久生效。</p>
        <EffectList :effects="trait.permanent.effects" />
      </div>
    </details>
  </article>
</template>
