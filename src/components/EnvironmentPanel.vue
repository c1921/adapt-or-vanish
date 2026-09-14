<script setup lang="ts">
import { computed } from 'vue'
import type { ThreatRow } from '../game/analysis'
import { threatRows } from '../game/analysis'
import { content } from '../game/content'
import {
  pressureDisplay,
  resourceLabels,
  severityChips,
  severityIcons,
  toneChip,
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
  <section class="panel p-5" aria-label="当前环境">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="section-title flex items-center gap-1.5">
          <span aria-hidden="true">🌍</span>当前环境
        </h2>
        <p class="mt-1 text-sm text-slate-500">{{ environment.description }}</p>
      </div>
      <span :class="toneChip[state.environment.temperature === 'cold' ? 'warmth' : 'cost']">
        <span aria-hidden="true">{{ state.environment.temperature === 'cold' ? '❄' : '🔥' }}</span>
        {{ state.environment.temperature === 'cold' ? '寒冷气候' : '高温气候' }}
      </span>
    </div>

    <p v-if="event" class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span class="font-medium">本代事件：{{ event.name }}</span>
      <span class="ml-2 text-slate-500">{{ event.description }}</span>
    </p>

    <div class="mt-4 grid gap-3 md:grid-cols-3">
      <article
        v-for="row in threats"
        :key="row.key"
        class="flex min-w-0 flex-col rounded-xl border border-slate-200 p-3.5"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span :class="toneChip[row.tone]">
            <span aria-hidden="true">{{ row.icon }}</span
            >{{ row.label }}
          </span>
          <span :class="severityChips[row.level]">
            <span aria-hidden="true">{{ severityIcons[row.level] }}</span
            >{{ row.levelLabel }}
          </span>
        </div>
        <p class="mt-2.5 text-sm leading-relaxed text-slate-700">{{ row.headline }}</p>
        <p class="mt-2 text-sm">
          <span class="text-slate-500">当前损失 </span>
          <span
            class="font-semibold tabular-nums"
            :class="row.deaths > 0 ? 'text-rose-700' : 'text-emerald-700'"
            >{{ row.deaths > 0 ? `−${row.deaths}` : '0' }}</span
          >
          <span class="text-slate-500"> 个体</span>
          <span
            v-if="saved(row) !== 0"
            class="chip ml-2"
            :class="
              saved(row) > 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            "
            title="与不做新的适应相比"
          >
            <span aria-hidden="true">{{ saved(row) > 0 ? '↑' : '↓' }}</span>
            {{ saved(row) > 0 ? '少损失' : '多损失' }} {{ Math.abs(saved(row)) }} 个体
          </span>
        </p>
        <p v-if="row.adaptNote" class="mt-1.5 text-xs text-emerald-700">{{ row.adaptNote }}</p>
        <details class="mt-3 border-t border-slate-100 pt-2 text-xs">
          <summary class="cursor-pointer text-slate-500">详细环境参数</summary>
          <ul class="mt-1.5 space-y-1 tabular-nums text-slate-500">
            <li v-for="line in rawLines(row)" :key="line">{{ line }}</li>
          </ul>
        </details>
      </article>
    </div>

    <details class="mt-4 border-t border-slate-100 pt-3 text-xs">
      <summary class="cursor-pointer text-slate-600">全部压力与资源数值</summary>
      <div class="mt-3 grid gap-4 sm:grid-cols-2">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            环境压力及适应后的剩余压力
          </caption>
          <thead>
            <tr class="text-xs text-slate-500">
              <th class="pb-2 font-normal">压力</th>
              <th class="pb-2 text-right font-normal">环境</th>
              <th class="pb-2 text-right font-normal">适应后剩余</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in pressures" :key="key" class="border-t border-slate-100">
              <th class="py-2 font-medium">
                {{ pressureDisplay(key, state.environment.temperature) }}
              </th>
              <td class="py-2 text-right tabular-nums text-slate-500">
                {{ state.environment.pressures[key] }}
              </td>
              <td
                class="py-2 text-right font-semibold tabular-nums"
                :class="result.remainingPressures[key] ? 'text-amber-800' : 'text-emerald-800'"
              >
                {{ result.remainingPressures[key] }}
              </td>
            </tr>
          </tbody>
        </table>
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            本代资源及采集数量
          </caption>
          <thead>
            <tr class="text-xs text-slate-500">
              <th class="pb-2 font-normal">资源</th>
              <th class="pb-2 text-right font-normal">可用</th>
              <th class="pb-2 text-right font-normal">采集</th>
              <th class="pb-2 text-right font-normal">剩余</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in resources" :key="key" class="border-t border-slate-100">
              <th class="py-2 font-medium">{{ resourceLabels[key] }}</th>
              <td class="py-2 text-right tabular-nums text-slate-500">
                {{ state.environment.resources[key] }}
              </td>
              <td class="py-2 text-right font-medium tabular-nums text-emerald-800">
                {{ result.harvestedResources[key] }}
              </td>
              <td class="py-2 text-right tabular-nums text-slate-500">
                {{ result.remainingResources[key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-2 leading-relaxed text-slate-500">
        采集总量抵消食物压力（本代共采集 {{ harvestTotal }} 份）；资源每代重新生成，不跨代储存。
        永久性状与本次表达的性状效果相加。
      </p>
    </details>
  </section>
</template>
