<script setup lang="ts">
import type { ThreatRow } from '../../game/analysis'
import { severityChipsOnDark, severityIcons } from '../../game/presentation'

defineProps<{ threats: ThreatRow[] }>()
</script>

<template>
  <ul class="flex flex-wrap items-center gap-1.5" aria-label="本代威胁">
    <li
      v-for="row in threats"
      :key="row.key"
      class="intent-token"
      :class="severityChipsOnDark[row.level]"
      :title="`${row.headline}${row.adaptNote ? `（${row.adaptNote}）` : ''}`"
    >
      <span class="flex items-center gap-1 text-xs font-semibold">
        <span aria-hidden="true" class="text-base leading-none">{{ row.icon }}</span>
        <span>{{ row.label }}</span>
      </span>
      <span class="flex items-center gap-1 text-[11px] tabular-nums">
        <span aria-hidden="true">{{ severityIcons[row.level] }}</span>
        <span :class="row.deaths > 0 ? '' : 'text-ink-dim'">{{
          row.deaths > 0 ? `−${row.deaths}` : '0'
        }}</span>
      </span>
      <span class="text-[10px] opacity-90">{{ row.levelLabel }}</span>
    </li>
  </ul>
</template>
