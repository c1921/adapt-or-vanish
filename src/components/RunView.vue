<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  cardImpacts,
  effectContextFor,
  previewForHover,
  projectSelection,
  threatRows,
} from '../game/analysis'
import { content } from '../game/content'
import { expressionCost, totalGenerations } from '../game/engine'
import type { GameAction, GenerationResult, RunState } from '../game/types'
import CrisisBanner from './CrisisBanner.vue'
import EnvironmentPanel from './EnvironmentPanel.vue'
import EvolutionChoices from './EvolutionChoices.vue'
import EvolutionTimeline from './EvolutionTimeline.vue'
import GeneBank from './GeneBank.vue'
import RulesPanel from './RulesPanel.vue'
import SettlementPanel from './SettlementPanel.vue'
import SpeciesIdentity from './SpeciesIdentity.vue'
import SurvivalForecast from './SurvivalForecast.vue'
import BoardDrawer from './board/BoardDrawer.vue'
import BoardHud from './board/BoardHud.vue'
import HandZone from './board/HandZone.vue'

type DrawerName = 'environment' | 'gene' | 'history' | 'rules'
const drawerTitles: Record<DrawerName, string> = {
  environment: '当前环境',
  gene: '基因库',
  history: '演化历史',
  rules: '规则与计算说明',
}

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

/** Hovering a card previews the board it would produce, without committing it. */
const hoveredCardId = ref<string | null>(null)
const hover = computed(() =>
  previewForHover(props.state, content, props.preview, hoveredCardId.value),
)
const ghost = computed(() => {
  const preview = hover.value
  if (!preview) return null
  const name = content.traits[preview.traitId]?.name ?? '性状'
  return {
    result: preview.result,
    label: `${preview.mode === 'add' ? '加入' : '移除'}「${name}」后`,
  }
})

const drawer = ref<DrawerName | null>(null)
let lastFocus: HTMLElement | null = null
function openDrawer(name: DrawerName) {
  lastFocus = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement)
  drawer.value = name
}
function closeDrawer() {
  drawer.value = null
  void nextTick(() => lastFocus?.focus())
}

const crisis = ref<InstanceType<typeof CrisisBanner> | null>(null)
watch([() => props.state.generation, () => props.state.phase], async () => {
  drawer.value = null
  hoveredCardId.value = null
  await nextTick()
  crisis.value?.heading?.focus({ preventScroll: true })
})
</script>

<template>
  <div class="board board-shell flex min-h-0 flex-col bg-board text-ink">
    <BoardHud
      :state="state"
      :threats="threats"
      :total="total"
      :adapting="isAdaptation"
      @home="emit('home')"
      @drawer="openDrawer"
    />

    <!-- 舞台：事件、物种、生存预测 -->
    <main class="min-h-0 flex-1 overflow-y-auto">
      <p
        v-if="error"
        role="alert"
        class="m-3 rounded-xl border border-amber-300/50 bg-amber-400/15 p-3 text-sm text-amber-100"
      >
        {{ error }}
      </p>

      <div class="grid gap-3 p-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
        <CrisisBanner
          ref="crisis"
          :state="state"
          :threats="threats"
          :total="total"
          @drawer="openDrawer"
        />
        <SpeciesIdentity
          :state="state"
          :weak-points="weakPoints"
          :ghost-population="hover?.result.populationAfter ?? null"
        />
        <SurvivalForecast
          v-if="displayed"
          :result="displayed"
          :baseline="baseline"
          :preview="isAdaptation"
          :temperature="state.environment.temperature"
          :ghost="ghost"
        />
      </div>

      <section
        v-if="state.phase === 'ended'"
        class="board-panel m-3 p-6"
        :class="state.outcome === 'extinct' ? 'border-amber-300/50' : 'border-emerald-400/40'"
        aria-label="终局记录"
      >
        <h2 class="text-xl font-semibold text-ink">
          {{ state.outcome === 'survived' ? '穿过干旱，演化仍在继续。' : '这条谱系，停在了这里。' }}
        </h2>
        <p class="mt-2 text-sm text-ink-muted">
          {{
            state.outcome === 'survived'
              ? '你的选择已经成为物种的稳定特征，下面保存着这段演化历史。'
              : '曾经有效的适应也可能成为负担。演化记录保留了本局的每一次选择。'
          }}
        </p>
        <dl class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt class="text-xs text-ink-dim">完成世代</dt>
            <dd class="text-2xl font-semibold tabular-nums text-ink">{{ state.history.length }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-dim">最大种群</dt>
            <dd class="text-2xl font-semibold tabular-nums text-ink">{{ state.maxPopulation }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-dim">经历环境</dt>
            <dd class="text-2xl font-semibold tabular-nums text-ink">
              {{ new Set(state.history.map((entry) => entry.environmentId)).size }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-ink-dim">永久性状</dt>
            <dd class="text-2xl font-semibold tabular-nums text-ink">
              {{ state.permanentTraits.length }}
            </dd>
          </div>
        </dl>
        <button class="btn-board mt-4" type="button" @click="emit('home')">
          返回首页，开始新谱系
        </button>
      </section>

      <p class="flex flex-wrap gap-x-3 px-3 pb-2 text-[11px] text-ink-dim">
        <span class="break-all">本局种子：{{ state.seed }}</span>
        <span v-if="!notice" role="status">进度已自动保存到浏览器</span>
      </p>
    </main>

    <!-- 手牌区：随阶段切换 -->
    <HandZone
      v-if="isAdaptation"
      :state="state"
      :context="context"
      :impacts="impacts"
      :preview="preview"
      :baseline="baseline"
      :spent="spent"
      @select="emit('action', { type: 'toggle-card', cardId: $event })"
      @commit="emit('action', { type: 'commit-generation' })"
      @hover="hoveredCardId = $event"
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

    <BoardDrawer v-if="drawer" :title="drawerTitles[drawer]" @close="closeDrawer">
      <EnvironmentPanel
        v-if="drawer === 'environment' && displayed"
        :state="state"
        :result="displayed"
        :baseline="baseline"
      />
      <GeneBank v-else-if="drawer === 'gene'" :state="state" />
      <EvolutionTimeline v-else-if="drawer === 'history'" :state="state" />
      <RulesPanel v-else variant="dark" />
    </BoardDrawer>
  </div>
</template>
