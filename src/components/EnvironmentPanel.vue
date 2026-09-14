<script setup lang="ts">
import { computed } from 'vue'
import type { ThreatRow } from '../game/analysis'
import { threatRows } from '../game/analysis'
import { content } from '../game/content'
import {
  pressureDisplay,
  resourceLabels,
  severityChipsOnDark,
  severityIcons,
  toneChipOnDark,
} from '../game/presentation'
import type { GenerationResult, PressureId, ResourceId, RunState } from '../game/types'

const props = defineProps<{
  state: RunState
  /** Forecast of the current plan, or the settled result of this generation. */
  result: GenerationResult
  /** Same generation without new adaptations, used to explain what changed. */
  baseline?: GenerationResult | null
}>()

const environment = computed(() =>
  content.environments.find((entry) => entry.id === props.state.environment.environmentId)!,
)
const event = computed(() => content.events[props.state.environment.eventId])
const threats = computed(() => threatRows(props.state, props.result))
const pressures: PressureId[] = ['food', 'temperature', 'predation']
const resources: ResourceId[] = ['plants', 'insects', 'animals']
const availableTotal = computed(
  () =>
    props.state.environment.resources.plants +
    props.state.environment.resources.insects +
    props.state.environment.resources.animals,
)
const harvestTotal = computed(
  () =>
    props.result.harvestedResources.plants +
    props.result.harvestedResources.insects +
    props.result.harvestedResources.animals,
)
/** Positive means the current plan saves individuals compared with doing nothing. */
const saved = (row: ThreatRow) => (props.baseline ? props.baseline.deaths[row.key] - row.deaths : 0)
const rawLines = (row: ThreatRow) =>
  row.key === 'food'
    ? [
        `食物压力：${row.rawPressure}`,
        `环境可用资源：植物 ${props.state.environment.resources.plants} · 昆虫 ${props.state.environment.resources.insects} · 小型动物 ${props.state.environment.resources.animals}`,
        `实际采集：${row.harvest}（共 ${availableTotal.value} 份）`,
        `适应后食物压力：${row.remaining} → 损失 ${row.deaths} 个体`,
      ]
    : [
        `${row.label}压力：${row.rawPressure}`,
        `适应后剩余：${row.remaining}`,
        `损失：${row.deaths} 个体`,
      ]
</script>

<template>
  <section aria-label="当前环境">
    <h2 class="board-title flex items-center gap-1.5">
      <span aria-hidden="true">🌍</span>当前环境
    </h2>
    <p class="mt-1 text-xs leading-relaxed text-ink-muted">{{ environment.description }}</p>

    <p class="mt-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs">
      <span class="font-medium text-ink">本代事件：{{ event?.name }}</span>
      <span class="ml-2 text-ink-muted">{{ event?.description }}</span>
    </p>

    <div class="mt-3 space-y-2.5">
      <article
        v-for="row in threats"
        :key="row.key"
        class="rounded-xl border border-frame-line bg-black/20 p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span :class="toneChipOnDark[row.tone]">
            <span aria-hidden="true">{{ row.icon }}</span
            >{{ row.label }}
          </span>
          <span :class="severityChipsOnDark[row.level]">
            <span aria-hidden="true">{{ severityIcons[row.level] }}</span
            >{{ row.levelLabel }}
          </span>
          <span class="ml-auto text-xs text-ink-muted">
            当前损失
            <span
              class="font-semibold tabular-nums"
              :class="row.deaths > 0 ? 'text-rose-300' : 'text-emerald-300'"
              >{{ row.deaths > 0 ? `−${row.deaths}` : '0' }}</span
            >
            个体
          </span>
        </div>
        <p class="mt-2 text-sm leading-relaxed text-ink">{{ row.headline }}</p>
        <p class="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span
            v-if="saved(row) !== 0"
            class="board-chip"
            :class="
              saved(row) > 0
                ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100'
                : 'border-rose-400/40 bg-rose-400/15 text-rose-100'
            "
            title="与不做新的适应相比"
          >
            <span aria-hidden="true">{{ saved(row) > 0 ? '↑' : '↓' }}</span>
            {{ saved(row) > 0 ? '少损失' : '多损失' }} {{ Math.abs(saved(row)) }} 个体
          </span>
          <span v-if="row.adaptNote" class="text-emerald-300">{{ row.adaptNote }}</span>
        </p>
        <ul class="mt-2 space-y-0.5 text-[11px] tabular-nums text-ink-dim">
          <li v-for="line in rawLines(row)" :key="line">{{ line }}</li>
        </ul>
      </article>
    </div>

    <details class="mt-3 border-t border-frame-line pt-2 text-xs">
      <summary class="cursor-pointer text-ink-dim">全部压力与资源数值</summary>
      <div class="mt-2 space-y-3">
        <table class="w-full text-left text-xs">
          <caption class="sr-only">
            环境压力及适应后的剩余压力
          </caption>
          <thead>
            <tr class="text-ink-dim">
              <th class="pb-1 font-normal">压力</th>
              <th class="pb-1 text-right font-normal">环境</th>
              <th class="pb-1 text-right font-normal">适应后剩余</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in pressures" :key="key" class="border-t border-frame-line">
              <th class="py-1.5 font-medium text-ink">
                {{ pressureDisplay(key, state.environment.temperature) }}
              </th>
              <td class="py-1.5 text-right tabular-nums text-ink-muted">
                {{ state.environment.pressures[key] }}
              </td>
              <td
                class="py-1.5 text-right font-semibold tabular-nums"
                :class="result.remainingPressures[key] ? 'text-orange-200' : 'text-emerald-300'"
              >
                {{ result.remainingPressures[key] }}
              </td>
            </tr>
          </tbody>
        </table>
        <table class="w-full text-left text-xs">
          <caption class="sr-only">
            本代资源及采集数量
          </caption>
          <thead>
            <tr class="text-ink-dim">
              <th class="pb-1 font-normal">资源</th>
              <th class="pb-1 text-right font-normal">可用</th>
              <th class="pb-1 text-right font-normal">采集</th>
              <th class="pb-1 text-right font-normal">剩余</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in resources" :key="key" class="border-t border-frame-line">
              <th class="py-1.5 font-medium text-ink">{{ resourceLabels[key] }}</th>
              <td class="py-1.5 text-right tabular-nums text-ink-muted">
                {{ state.environment.resources[key] }}
              </td>
              <td class="py-1.5 text-right font-medium tabular-nums text-emerald-300">
                {{ result.harvestedResources[key] }}
              </td>
              <td class="py-1.5 text-right tabular-nums text-ink-muted">
                {{ result.remainingResources[key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-2 leading-relaxed text-ink-dim">
        采集总量抵消食物压力（本代共采集 {{ harvestTotal }} 份）；资源每代重新生成，不跨代储存。
        永久性状与本次表达的性状效果相加。
      </p>
    </details>
  </section>
</template>
