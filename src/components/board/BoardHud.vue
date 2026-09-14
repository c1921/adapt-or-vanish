<script setup lang="ts">
import type { ThreatRow } from '../../game/analysis'
import type { RunState } from '../../game/types'
import EnvironmentRoute from './EnvironmentRoute.vue'
import ThreatIntents from './ThreatIntents.vue'

defineProps<{
  state: RunState
  threats: ThreatRow[]
  total: number
  /** True while the hand is available, so the hover hint only shows when it applies. */
  adapting: boolean
}>()
const emit = defineEmits<{
  home: []
  drawer: [name: 'environment' | 'gene' | 'history' | 'rules']
}>()
</script>

<template>
  <header class="shrink-0 border-b border-frame-line bg-frame/90">
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5">
      <div class="flex min-w-0 items-center gap-3">
        <p class="board-eyebrow whitespace-nowrap">
          第 {{ state.generation }} / {{ total }} 代 · {{ state.environment.stageName }}
        </p>
        <EnvironmentRoute :state="state" :total="total" />
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <button type="button" class="pile-button" @click="emit('drawer', 'gene')">
          <span aria-hidden="true">🃏</span>基因库 · {{ state.cards.length }}
        </button>
        <button type="button" class="pile-button" @click="emit('drawer', 'history')">
          <span aria-hidden="true">📜</span>演化历史
        </button>
        <button type="button" class="pile-button" @click="emit('drawer', 'environment')">
          <span aria-hidden="true">🌍</span>环境详情
        </button>
        <button type="button" class="pile-button" @click="emit('drawer', 'rules')">
          <span aria-hidden="true">📖</span>规则与计算说明
        </button>
        <button type="button" class="pile-button" @click="emit('home')">← 返回首页</button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 border-t border-frame-line/70 px-3 py-1.5">
      <span class="board-eyebrow whitespace-nowrap">主要威胁</span>
      <ThreatIntents :threats="threats" />
      <p v-if="adapting" class="ml-auto hidden text-[11px] text-ink-dim lg:block">
        悬停卡牌即可预览结果，点击加入本代方案
      </p>
    </div>
  </header>
</template>
