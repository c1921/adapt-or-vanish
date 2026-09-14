<script setup lang="ts">
import { computed } from 'vue'
import { content } from '../game/content'
import { pressureLabels, resourceLabels } from '../game/presentation'
import type { GenerationResult, PressureId, ResourceId, RunState } from '../game/types'
const props = defineProps<{ state: RunState; result: GenerationResult | null }>()
const environment = computed(() =>
  content.environments.find((entry) => entry.id === props.state.environment.environmentId)!,
)
const event = computed(() => content.events[props.state.environment.eventId]!)
const pressures: PressureId[] = ['food', 'temperature', 'predation']
const resources: ResourceId[] = ['plants', 'insects', 'animals']
</script>
<template>
  <section class="panel p-5" aria-label="环境压力与资源">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 class="section-title">{{ environment.name }} · {{ state.environment.stageName }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ environment.description }}</p>
      </div>
      <span class="badge">{{
        state.environment.temperature === 'cold' ? '寒冷环境' : '高温环境'
      }}</span>
    </div>
    <div class="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span class="font-medium">本代事件：{{ event.name }}</span
      ><span class="ml-2 text-slate-500">{{ event.description }}</span>
    </div>
    <div class="mt-4 grid gap-5 sm:grid-cols-2">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          环境压力及适应后的剩余压力
        </caption>
        <thead>
          <tr class="text-xs text-slate-500">
            <th class="pb-2 font-normal">压力</th>
            <th class="pb-2 text-right font-normal">环境</th>
            <th class="pb-2 text-right font-normal">
              {{ state.phase === 'adaptation' ? '适应后' : '本代剩余' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in pressures" :key="key" class="border-t border-slate-100">
            <th class="py-2 font-medium">
              {{
                key === 'temperature'
                  ? state.environment.temperature === 'cold'
                    ? '寒冷'
                    : '高温'
                  : pressureLabels[key]
              }}
            </th>
            <td class="py-2 text-right tabular-nums text-slate-500">
              {{ state.environment.pressures[key] }}
            </td>
            <td
              class="py-2 text-right font-semibold tabular-nums"
              :class="result?.remainingPressures[key] ? 'text-amber-800' : 'text-emerald-800'"
            >
              {{ result?.remainingPressures[key] ?? '—' }}
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
              {{ result?.harvestedResources[key] ?? 0 }}
            </td>
            <td class="py-2 text-right tabular-nums text-slate-500">
              {{ result?.remainingResources[key] ?? state.environment.resources[key] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-3 text-xs text-slate-500">采集总量抵消食物压力；每代资源重新生成，不跨代储存。</p>
  </section>
</template>
