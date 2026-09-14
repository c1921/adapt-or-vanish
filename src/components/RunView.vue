<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { content } from '../game/content'
import { cardDefinition, expressionCost } from '../game/engine'
import { resourceLabels } from '../game/presentation'
import type { GameAction, GenerationResult, RunState } from '../game/types'
import type { EffectContext } from '../game/effects'
import type { LibraryZone } from '../game/ui'
import RunHeader from './RunHeader.vue'
import EnvironmentPanel from './EnvironmentPanel.vue'
import GenerationSummary from './GenerationSummary.vue'
import HandDock from './HandDock.vue'
import ActionBar from './ActionBar.vue'
import EvolutionChoices from './EvolutionChoices.vue'
import GeneBank from './GeneBank.vue'
import HistoryPanel from './HistoryPanel.vue'
import AppSheet from './AppSheet.vue'
import TraitDetails from './TraitDetails.vue'
import EffectList from './EffectList.vue'
import HelpPanel from './HelpPanel.vue'
import GameIcon from './GameIcon.vue'
const props = defineProps<{ state: RunState; preview: GenerationResult | null; fixable: string[]; error: string; notice: string }>()
const emit = defineEmits<{ action: [action: GameAction]; home: [] }>()
type Sheet = 'menu' | 'environment' | 'library' | 'history' | 'permanent' | 'trait' | 'fixation' | 'help' | 'extinction'
const sheet = ref<Sheet | null>(null)
const previousSheet = ref<Sheet | null>(null)
const traitId = ref('')
const handCardId = ref<string | null>(null)
const libraryZone = ref<LibraryZone>('owned')
const selectedReward = ref<string | null>(null)
const busy = ref(false)
const message = ref('')
const scrollArea = ref<HTMLElement | null>(null)
const phaseHeading = ref<HTMLElement | null>(null)
let busyTimer: ReturnType<typeof setTimeout> | undefined
let messageTimer: ReturnType<typeof setTimeout> | undefined
const spent = computed(() => expressionCost(props.state, props.state.selectedCardIds, content))
const lastResult = computed(() => props.state.history.at(-1) ?? null)
const displayedResult = computed(() => props.preview ?? lastResult.value)
const inspectedTrait = computed(() => content.traits[traitId.value])
const selectedTraits = computed(() => props.state.selectedCardIds.map(id => cardDefinition(props.state, id, content)))
const expressedTraits = computed(() => [...new Set(lastResult.value?.expressedTraitIds ?? [])])
const effectContext = computed<EffectContext>(() => ({
  temperature: props.state.environment.temperature,
  tags: new Set([
    ...(props.state.phase === 'adaptation' ? selectedTraits.value : expressedTraits.value.map(id => content.traits[id]!)),
    ...props.state.permanentTraits.filter(f => props.state.phase === 'adaptation' || f.generation < props.state.generation).map(f => content.traits[f.traitId]!),
  ].flatMap(t => t.tags)),
}))
const currentTraitContext = computed(() => handCardId.value && props.state.selectedCardIds.includes(handCardId.value) ? effectContext.value : undefined)
const rewardTrait = computed(() => {
  const reward = props.state.rewards.find(r => r.id === selectedReward.value)
  if (!reward) return null
  return content.traits[reward.type === 'new-trait' ? reward.traitId : content.mutations.find(m => m.id === reward.mutationId)!.to]!
})
const title = computed(() => {
  if (sheet.value === 'trait') return inspectedTrait.value?.name ?? '性状详情'
  if (sheet.value === 'fixation') return '让适应成为本能'
  return { menu: '谱系档案', environment: '环境与结算', library: '基因库', history: '演化记录', permanent: '永久性状', help: '如何延续', extinction: '这条谱系将会终止' }[sheet.value as Exclude<Sheet, 'trait' | 'fixation'>] ?? ''
})
const actionLabel = computed(() => {
  switch (props.state.phase) {
    case 'adaptation': return props.preview?.populationAfter === 0 ? '结算本代 · 将灭绝' : props.state.selectedCardIds.length ? '确认表达' : '不表达，结算本代'
    case 'settlement': return props.state.generation % content.rules.rewardInterval === 0 ? '继续 · 演化选择' : `进入第 ${props.state.generation + 1} 代`
    case 'evolution': return rewardTrait.value ? `获得「${rewardTrait.value.name}」` : '选择一个演化方向'
    case 'ended': return '返回首页'
  }
})
const canExpressInspected = computed(() => !!handCardId.value && (props.state.selectedCardIds.includes(handCardId.value) || spent.value + (inspectedTrait.value?.cost ?? 0) <= content.rules.expressionBudget))
function openSheet(kind: Sheet) { previousSheet.value = null; handCardId.value = null; sheet.value = kind }
function closeSheet() { sheet.value = null; previousSheet.value = null; handCardId.value = null }
function backSheet() { sheet.value = previousSheet.value; previousSheet.value = null; handCardId.value = null }
function inspect(id: string, instanceId: string | null = null) {
  previousSheet.value = sheet.value
  traitId.value = id
  handCardId.value = instanceId
  sheet.value = 'trait'
}
function library(zone: LibraryZone = 'owned') { libraryZone.value = zone; openSheet('library') }
function showMessage(text: string) {
  message.value = text
  clearTimeout(messageTimer)
  messageTimer = setTimeout(() => message.value = '', 2800)
}
function act(action: GameAction) {
  if (busy.value) return
  message.value = ''
  if (action.type !== 'toggle-card') {
    busy.value = true
    clearTimeout(busyTimer)
    busyTimer = setTimeout(() => busy.value = false, 340)
  }
  emit('action', action)
}
function primaryAction() {
  if (props.state.phase === 'adaptation') {
    if (props.preview?.populationAfter === 0) openSheet('extinction')
    else act({ type: 'commit-generation' })
  } else if (props.state.phase === 'settlement') act({ type: 'continue' })
  else if (props.state.phase === 'evolution' && selectedReward.value) act({ type: 'choose-reward', rewardId: selectedReward.value })
  else if (props.state.phase === 'ended') emit('home')
}
function requestFixation(id: string) { traitId.value = id; openSheet('fixation') }
function fix() { act({ type: 'fix-trait', traitId: traitId.value }); closeSheet() }
function selectedFromDetail() { if (handCardId.value && canExpressInspected.value) act({ type: 'toggle-card', cardId: handCardId.value }) }
watch([() => props.state.generation, () => props.state.phase], async () => {
  closeSheet()
  selectedReward.value = null
  await nextTick()
  scrollArea.value?.scrollTo({ top: 0 })
  phaseHeading.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => { clearTimeout(busyTimer); clearTimeout(messageTimer) })
</script>
<template>
  <div class="game-shell" :data-biome="state.environment.environmentId" :data-phase="state.phase">
    <RunHeader :state="state" @menu="openSheet('menu')" />
    <p v-if="notice" role="status" class="storage-notice">{{ notice }}</p>
    <div ref="scrollArea" class="run-body">
      <EnvironmentPanel v-if="state.phase === 'adaptation'" :state="state" :result="displayedResult" @details="openSheet('environment')" />
      <section v-if="state.phase !== 'ended'" class="permanent-strip" aria-label="永久性状槽位"><button class="permanent-bar" type="button" aria-label="查看全部永久性状" @click="openSheet('permanent')"><span class="permanent-label"><GameIcon name="dna" :size="16" /><span>永久性状</span><b>{{ state.permanentTraits.length }}/{{ content.rules.permanentLimit }}</b></span><span class="permanent-slots"><span v-for="i in content.rules.permanentLimit" :key="i" :class="{ occupied: !!state.permanentTraits[i - 1] }"><span v-if="state.permanentTraits[i - 1]">{{ content.traits[state.permanentTraits[i - 1]!.traitId]!.permanent.name.slice(0, 2) }}</span><span v-else>—</span><i v-if="state.permanentTraits[i - 1]?.generation === state.generation && state.phase !== 'adaptation'" aria-label="下代生效"></i></span></span><GameIcon name="chevron" :size="13" /></button></section>
      <div :key="`${state.generation}-${state.phase}`" class="phase-content">
        <section v-if="state.phase === 'adaptation'" class="adaptation-stage">
          <div class="row-between"><h1 ref="phaseHeading" tabindex="-1" class="section-title">本代的适应</h1><span class="fine-print">已选 {{ state.selectedCardIds.length }} 张</span></div>
          <div v-if="selectedTraits.length" class="selected-traits" aria-label="已选择的性状"><button v-for="(trait, i) in selectedTraits" :key="state.selectedCardIds[i]" type="button" @click="act({ type: 'toggle-card', cardId: state.selectedCardIds[i]! })"><GameIcon name="check" :size="13" /><span>{{ trait.name }}</span><GameIcon name="close" :size="12" /></button></div>
          <p v-else class="adaptation-hint">搭配下方手牌，观察种群如何变化。<span v-if="state.history.length === 0">表达并存活，让性状逐渐成为本能。</span></p>
        </section>
        <section v-else-if="state.phase === 'settlement'" class="settlement-stage">
          <h1 ref="phaseHeading" tabindex="-1" class="sr-only">第 {{ state.generation }} 代 · 自然选择</h1>
          <GenerationSummary v-if="lastResult" :result="lastResult" />
          <section class="expression-results"><h2 class="section-title">适应正在留下痕迹</h2><div v-for="id in expressedTraits" :key="id" class="expression-progress-row"><span>{{ content.traits[id]!.name }}</span><span class="progress-pips" aria-hidden="true"><i v-for="n in content.rules.fixationThreshold" :key="n" :class="{ filled: (state.expressionCounts[id] ?? 0) >= n }"></i></span><strong>{{ Math.min(state.expressionCounts[id] ?? 0, content.rules.fixationThreshold) }}/{{ content.rules.fixationThreshold }}</strong><span class="benefit">+1</span></div><p v-if="!expressedTraits.length" class="fine-print">本代未表达手牌，永久性状继续发挥作用。</p></section>
          <div v-if="fixable.length" class="fixation-options"><p class="eyebrow">可以固化 · 也可留待以后</p><button v-for="id in fixable" :key="id" type="button" class="fixation-option" :disabled="busy" @click="requestFixation(id)"><GameIcon name="dna" /><span><strong>{{ content.traits[id]!.permanent.name }}</strong><small>由「{{ content.traits[id]!.name }}」固化</small></span><span class="fixation-link">查看 <GameIcon name="chevron" :size="16" /></span></button></div>
          <p v-else class="stage-note">{{ state.permanentTraits.length >= content.rules.permanentLimit ? '永久槽位已满。继续通过新牌与突变应对变化。' : `同一性状成功表达 ${content.rules.fixationThreshold} 代后，可固化为永久适应。` }}</p>
        </section>
        <section v-else-if="state.phase === 'evolution'">
          <h1 ref="phaseHeading" tabindex="-1" class="sr-only">演化选择</h1>
          <EvolutionChoices :rewards="state.rewards" :selected-id="selectedReward" @select="id => selectedReward = id" @inspect="id => inspect(id)" />
        </section>
        <section v-else class="ending-stage" aria-label="终局记录">
          <span class="end-emblem" :class="{ 'end-extinct': state.outcome === 'extinct' }"><GameIcon :name="state.outcome === 'survived' ? 'sprout' : 'leaf'" :size="36" /></span><p class="eyebrow">第 {{ state.generation }} 代 · {{ state.environment.stageName }}</p><h1 ref="phaseHeading" tabindex="-1">{{ state.outcome === 'survived' ? '生命，仍在延续。' : '这一次，止步于此。' }}</h1><p class="body-copy">{{ state.outcome === 'survived' ? '你留下的适应，让谱系穿过了干旱。' : '曾经有效的适应，也可能成为明天的负担。' }}</p>
          <div class="ending-stats"><div><strong>{{ state.population }}</strong><span>最终种群</span></div><div><strong>{{ state.history.length }}</strong><span>存活世代</span></div><div><strong>{{ state.maxPopulation }}</strong><span>种群峰值</span></div></div>
          <h2 class="section-title">留在谱系中的适应</h2><div class="ending-build"><button v-for="fixed in state.permanentTraits" :key="fixed.traitId" type="button" @click="openSheet('permanent')"><GameIcon name="dna" :size="16" />{{ content.traits[fixed.traitId]!.permanent.name }}</button><p v-if="!state.permanentTraits.length" class="fine-print">本局尚未形成永久性状。</p></div>
          <GenerationSummary v-if="lastResult" :result="lastResult" /><button class="btn-secondary full-width" type="button" @click="openSheet('history')"><GameIcon name="history" :size="17" />回看完整演化记录</button>
        </section>
      </div>
    </div>
    <p v-if="error || message" class="action-toast" role="alert">{{ error || message }}</p>
    <HandDock v-if="state.phase === 'adaptation'" :state="state" :spent="spent" :context="effectContext" @toggle="id => act({ type: 'toggle-card', cardId: id })" @inspect="id => inspect(cardDefinition(state, id, content).id, id)" @blocked="showMessage" @library="library" />
    <ActionBar :state="state" :preview="preview" :spent="spent" :label="actionLabel" :disabled="state.phase === 'evolution' && !selectedReward" :busy="busy" @confirm="primaryAction" @skip="act({ type: 'choose-reward', rewardId: null })" />

    <AppSheet v-if="sheet" :title="title" :back="!!previousSheet" eyebrow="ADAPT OR VANISH" @close="closeSheet" @back="backSheet">
      <template v-if="sheet === 'menu'"><div class="menu-profile"><GameIcon name="sprout" :size="28" /><div><h3>{{ content.ancestorName }}</h3><p>第 {{ state.generation }} 代 · 种群 {{ state.population }}</p></div></div><nav class="game-menu"><button type="button" @click="library()"><GameIcon name="cards" />基因库与图鉴<GameIcon name="chevron" /></button><button type="button" @click="openSheet('permanent')"><GameIcon name="dna" />永久性状<GameIcon name="chevron" /></button><button type="button" @click="openSheet('history')"><GameIcon name="history" />演化记录<GameIcon name="chevron" /></button><button type="button" @click="openSheet('help')"><GameIcon name="info" />玩法帮助<GameIcon name="chevron" /></button><button type="button" @click="emit('home')"><GameIcon name="back" />返回首页<GameIcon name="chevron" /></button></nav><p class="save-note" :class="{ cost: notice }" role="status">{{ notice || '进度已自动保存，可以随时回来。' }}</p><p class="seed-label">世界种子 · {{ state.seed }}</p></template>
      <template v-else-if="sheet === 'environment'"><p class="body-copy">{{ content.events[state.environment.eventId]!.description }}</p><GenerationSummary v-if="displayedResult" :result="displayedResult" :preview="state.phase === 'adaptation'" /><section class="detail-section"><h3>本代资源</h3><table class="resource-table"><thead><tr><th>资源</th><th>可用</th><th>采集</th><th>剩余</th></tr></thead><tbody><tr v-for="(label, key) in resourceLabels" :key="key"><th>{{ label }}</th><td>{{ state.environment.resources[key] }}</td><td class="benefit">{{ displayedResult?.harvestedResources[key] ?? 0 }}</td><td>{{ displayedResult?.remainingResources[key] ?? state.environment.resources[key] }}</td></tr></tbody></table><p class="fine-print">采集总量抵消食物压力；不超过可用资源，每代刷新。</p></section></template>
      <KeepAlive><GeneBank v-if="sheet === 'library'" :state="state" :initial-zone="libraryZone" @inspect="id => inspect(id)" /></KeepAlive>
      <HistoryPanel v-if="sheet === 'history'" :state="state" />
      <HelpPanel v-else-if="sheet === 'help'" />
      <template v-else-if="sheet === 'permanent'"><p class="body-copy">{{ state.permanentTraits.length }}/{{ content.rules.permanentLimit }} 个槽位 · 固化后无需抽取，每代自动生效。</p><article v-for="fixed in state.permanentTraits" :key="fixed.traitId" class="permanent-detail"><div class="row-between"><h3>{{ content.traits[fixed.traitId]!.permanent.name }}</h3><span class="fine-print">第 {{ fixed.generation }} 代</span></div><EffectList :effects="content.traits[fixed.traitId]!.permanent.effects" :context="fixed.generation === state.generation && state.phase !== 'adaptation' ? undefined : effectContext" /><p v-if="fixed.generation === state.generation && state.phase !== 'adaptation'" class="pending-label">下代生效 · 本次结算不变</p></article><p v-if="!state.permanentTraits.length" class="empty-state">尚未形成永久性状。反复表达同一种性状，积累适应。</p></template>
      <TraitDetails v-else-if="sheet === 'trait' && inspectedTrait" :trait="inspectedTrait" :progress="state.expressionCounts[traitId] ?? 0" :context="currentTraitContext" />
      <template v-else-if="sheet === 'fixation' && inspectedTrait"><p class="body-copy">将「{{ inspectedTrait.name }}」固化为</p><h3 class="fixation-title">{{ inspectedTrait.permanent.name }}</h3><EffectList :effects="inspectedTrait.permanent.effects" /><div class="fixation-consequences"><p>移除全部 <strong>{{ state.cards.filter(c => c.traitId === traitId).length }}</strong> 张同名牌。</p><p>占用第 <strong>{{ state.permanentTraits.length + 1 }}/{{ content.rules.permanentLimit }}</strong> 个永久槽位。</p><p>收益和代价从<strong>下一代</strong>起永久生效，无法撤销或替换。</p></div></template>
      <template v-else-if="sheet === 'extinction'"><GenerationSummary v-if="preview" :result="preview" preview /><p class="body-copy">你仍可以返回调整手牌。继续结算后，本局将结束并保留演化记录。</p></template>
      <template v-if="sheet === 'trait' && handCardId || sheet === 'fixation' || sheet === 'extinction'" #footer>
        <template v-if="sheet === 'trait' && handCardId"><p v-if="!canExpressInspected" class="fine-print">表达额度不足，请先取消其他卡牌。</p><button class="btn-primary full-width" type="button" :disabled="!canExpressInspected || busy" @click="selectedFromDetail">{{ state.selectedCardIds.includes(handCardId) ? '撤销表达' : `表达此性状 · ${inspectedTrait?.cost} 点` }}</button></template>
        <button v-else-if="sheet === 'fixation'" class="btn-primary full-width" type="button" :disabled="busy || !fixable.includes(traitId)" @click="fix">确认固化「{{ inspectedTrait?.permanent.name }}」</button>
        <div v-else-if="sheet === 'extinction'" class="stack-buttons"><button class="btn-secondary" type="button" @click="closeSheet">返回调整手牌</button><button class="btn-primary btn-danger" type="button" :disabled="busy" @click="act({ type: 'commit-generation' })">接受灭绝，仍然结算</button></div>
      </template>
    </AppSheet>
  </div>
</template>
