<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { cardImpacts, effectContextFor, projectSelection, threatRows } from '../game/analysis'
import { content } from '../game/content'
import { expressionCost, totalGenerations } from '../game/engine'
import type { GameAction, GenerationResult, RunState } from '../game/types'
import CrisisBanner from './CrisisBanner.vue'
import EnvironmentPanel from './EnvironmentPanel.vue'
import EvolutionChoices from './EvolutionChoices.vue'
import EvolutionDecision from './EvolutionDecision.vue'
import EvolutionTimeline from './EvolutionTimeline.vue'
import GeneBank from './GeneBank.vue'
import RulesPanel from './RulesPanel.vue'
import SettlementPanel from './SettlementPanel.vue'
import SpeciesIdentity from './SpeciesIdentity.vue'
import SurvivalForecast from './SurvivalForecast.vue'

const props = defineProps<{
  state: RunState
  preview: GenerationResult | null
  fixable: string[]
  error: string
  notice: string
}>()
const emit = defineEmits<{ action: [action: GameAction]; home: [] }>()

const total = totalGenerations(content)
const isAdaptation = computed(() => props.state.phase === 'adaptation')
const lastResult = computed(() => props.state.history.at(-1) ?? null)
/** While choosing, the panel shows the prediction; afterwards it shows what happened. */
const displayed = computed(() => (isAdaptation.value ? props.preview : lastResult.value))
/** What would happen if the species expressed nothing new this generation. */
const baseline = computed(() =>
  isAdaptation.value ? projectSelection(props.state, content, []) : null,
)
const projected = computed(() => displayed.value?.populationAfter ?? props.state.population)
const spent = computed(() => expressionCost(props.state, props.state.selectedCardIds, content))
const context = computed(() => effectContextFor(props.state, content))
const impacts = computed(() =>
  isAdaptation.value ? cardImpacts(props.state, content, props.preview) : {},
)
const threats = computed(() => (displayed.value ? threatRows(props.state, displayed.value) : []))
const weakPoints = computed(() =>
  threats.value
    .filter((threat) => threat.level === 'danger' || threat.level === 'critical')
    .map((threat) => threat.label)
    .slice(0, 3),
)

const crisis = ref<InstanceType<typeof CrisisBanner> | null>(null)
watch([() => props.state.generation, () => props.state.phase], async () => {
  await nextTick()
  crisis.value?.heading?.focus({ preventScroll: true })
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <button class="btn-ghost" type="button" @click="emit('home')">← 返回首页</button>
      <p v-if="!notice" role="status">进度已自动保存到浏览器</p>
    </div>

    <!-- 1. 当前危机：这一代发生了什么 -->
    <CrisisBanner
      ref="crisis"
      :state="state"
      :before="displayed?.populationBefore ?? state.population"
      :after="projected"
      :baseline="baseline?.populationAfter ?? null"
      :threats="threats"
      :total="total"
      :pending="isAdaptation"
    />

    <p
      v-if="error"
      role="alert"
      class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      {{ error }}
    </p>

    <!-- 2. 物种身份与 3. 生存预测 -->
    <div class="grid items-start gap-4 lg:grid-cols-3">
      <SurvivalForecast
        v-if="displayed"
        class="lg:col-span-2"
        :result="displayed"
        :baseline="baseline"
        :preview="isAdaptation"
        :temperature="state.environment.temperature"
      />
      <SpeciesIdentity :state="state" :weak-points="weakPoints" />
    </div>

    <!-- 环境语言化的威胁说明 -->
    <EnvironmentPanel v-if="displayed" :state="state" :result="displayed" :baseline="baseline" />

    <!-- 演化决策 -->
    <EvolutionDecision
      v-if="isAdaptation"
      :state="state"
      :context="context"
      :impacts="impacts"
      :preview="preview"
      :baseline="baseline"
      :spent="spent"
      @action="emit('action', $event)"
    />
    <SettlementPanel
      v-else-if="state.phase === 'settlement'"
      :state="state"
      :result="lastResult"
      :fixable="fixable"
      :context="context"
      @action="emit('action', $event)"
    />
    <EvolutionChoices
      v-else-if="state.phase === 'evolution'"
      :state="state"
      :rewards="state.rewards"
      :context="context"
      @action="emit('action', $event)"
    />

    <section
      v-else-if="state.phase === 'ended'"
      class="panel p-6"
      :class="
        state.outcome === 'extinct'
          ? 'border-amber-300 bg-amber-50/50'
          : 'border-emerald-300 bg-emerald-50/50'
      "
      aria-label="终局记录"
    >
      <h2 class="text-xl font-semibold">
        {{ state.outcome === 'survived' ? '穿过干旱，演化仍在继续。' : '这条谱系，停在了这里。' }}
      </h2>
      <p class="mt-2 text-sm text-slate-600">
        {{
          state.outcome === 'survived'
            ? '你的选择已经成为物种的稳定特征，下面保存着这段演化历史。'
            : '曾经有效的适应也可能成为负担。演化记录保留了本局的每一次选择。'
        }}
      </p>
      <dl class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt class="stat-label">完成世代</dt>
          <dd class="stat-value">{{ state.history.length }}</dd>
        </div>
        <div>
          <dt class="stat-label">最大种群</dt>
          <dd class="stat-value">{{ state.maxPopulation }}</dd>
        </div>
        <div>
          <dt class="stat-label">经历环境</dt>
          <dd class="stat-value">
            {{ new Set(state.history.map((entry) => entry.environmentId)).size }}
          </dd>
        </div>
        <div>
          <dt class="stat-label">永久性状</dt>
          <dd class="stat-value">{{ state.permanentTraits.length }}</dd>
        </div>
      </dl>
      <button class="btn-primary mt-5" type="button" @click="emit('home')">
        返回首页，开始新谱系
      </button>
    </section>

    <!-- 长期系统：默认折叠 -->
    <div class="space-y-3">
      <EvolutionTimeline :state="state" />
      <GeneBank :state="state" />
      <RulesPanel />
    </div>

    <p class="break-all text-xs text-slate-500">本局种子：{{ state.seed }}</p>
  </div>
</template>
