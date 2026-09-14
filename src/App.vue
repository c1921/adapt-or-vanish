<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame } from './composables/useGame'
import { content } from './game/content'
import { totalGenerations } from './game/engine'
import RunView from './components/RunView.vue'
import AppSheet from './components/AppSheet.vue'
import GameIcon from './components/GameIcon.vue'
import HelpPanel from './components/HelpPanel.vue'
import GeneBank from './components/GeneBank.vue'
import TraitDetails from './components/TraitDetails.vue'
const { state, playing, actionError, notice, preview, fixable, start, dispatch, resume, home } = useGame()
const seed = ref('')
const sheet = ref<'new' | 'help' | 'library' | 'trait' | null>(null)
const selectedTrait = ref('')
const title = computed(() => sheet.value === 'new' ? '开始一条新的谱系' : sheet.value === 'help' ? '如何延续' : sheet.value === 'trait' ? content.traits[selectedTrait.value]!.name : '性状图鉴')
function startRun() { start(seed.value.trim()); sheet.value = null }
function continueRun() { sheet.value = null; resume() }
</script>
<template>
  <RunView v-if="playing && state" :state="state" :preview="preview" :fixable="fixable" :error="actionError" :notice="notice" @action="dispatch" @home="home" />
  <main v-else class="home-shell">
    <header class="home-header"><span class="home-wordmark"><GameIcon name="sprout" :size="21" />适者延续</span><button class="icon-button" type="button" aria-label="玩法帮助" @click="sheet = 'help'"><GameIcon name="info" /></button></header>
    <p v-if="notice" class="storage-notice" role="status">{{ notice }}</p>
    <div class="home-content">
      <section class="home-hero"><p class="eyebrow">演化 · 生存 · 卡牌构筑</p><h1>适应变化。<br /><span>延续生命。</span></h1><p class="home-english">ADAPT OR VANISH</p><p class="home-description">用一手性状，回应环境的选择。<br />让短暂的适应，成为物种的本能。</p></section>
      <div class="home-card-composition" aria-hidden="true"><div class="home-display-card"><span class="display-cost">1</span><span class="display-card-name">灵活前肢</span><span class="display-card-type">形态</span><span class="display-card-line"></span></div><div class="home-display-card"><span class="display-cost">1</span><span class="display-card-name">体毛</span><span class="display-card-type">生理</span><span class="display-card-line"></span></div><div class="home-display-card"><span class="display-cost">1</span><span class="display-card-name">杂食</span><span class="display-card-type">食性</span><span class="display-card-line"></span></div></div>
      <div class="home-journey"><span><i></i>森林</span><b></b><span><i></i>草原</span><b></b><span><i></i>干旱</span></div>
      <section class="home-actions">
        <template v-if="state"><button class="btn-primary full-width" type="button" @click="continueRun"><span>{{ state.phase === 'ended' ? '回看上局谱系' : '继续谱系' }}<small>第 {{ state.generation }} 代 · 种群 {{ state.population }}</small></span><GameIcon name="arrow" /></button><button class="btn-secondary full-width" type="button" @click="sheet = 'new'">开始新的谱系</button></template>
        <button v-else class="btn-primary full-width" type="button" @click="sheet = 'new'">开始新的谱系<GameIcon name="arrow" /></button>
        <button class="text-button full-width" type="button" @click="sheet = 'library'"><GameIcon name="cards" :size="16" />探索性状图鉴</button>
      </section>
      <div class="home-facts"><span><strong>{{ totalGenerations(content) }}</strong> 世代旅程</span><span><strong>{{ Object.keys(content.traits).length }}</strong> 种性状</span><span><strong>{{ content.rules.permanentLimit }}</strong> 个永久槽位</span></div>
      <p class="home-footer">每一个选择，都留下痕迹。<span>进度自动保存于当前浏览器</span></p>
    </div>
    <AppSheet v-if="sheet" :title="title" eyebrow="一条谱系，无数种可能" :back="sheet === 'trait'" @close="sheet = null" @back="sheet = 'library'">
      <form v-if="sheet === 'new'" id="new-run" class="new-run-form" @submit.prevent="startRun"><span class="new-run-symbol"><GameIcon name="sprout" :size="36" /></span><h3>{{ content.ancestorName }}</h3><p class="body-copy">从 {{ content.rules.initialPopulation }} 个体出发，穿过 {{ totalGenerations(content) }} 个世代。</p><details class="rule-details"><summary>高级选项 · 世界种子</summary><label for="seed">世界种子 <span class="muted">选填</span></label><input id="seed" v-model="seed" maxlength="80" autocomplete="off" placeholder="留空随机生成" /><p class="fine-print">相同种子与选择，会重现相同的演化过程。</p></details><p v-if="state" class="inline-warning">开始后会替换当前第 {{ state.generation }} 代的谱系与记录。若想保留，请关闭此面板并继续游戏。</p></form>
      <HelpPanel v-else-if="sheet === 'help'" />
      <KeepAlive><GeneBank v-if="sheet === 'library'" :state="state" initial-zone="all" @inspect="id => { selectedTrait = id; sheet = 'trait' }" /></KeepAlive>
      <TraitDetails v-if="sheet === 'trait'" :trait="content.traits[selectedTrait]!" :progress="state?.expressionCounts[selectedTrait] ?? 0" />
      <template v-if="sheet === 'new'" #footer><button class="btn-primary full-width" type="submit" form="new-run">{{ state ? '替换现有谱系并开始' : '让演化开始' }}<GameIcon name="arrow" /></button></template>
    </AppSheet>
  </main>
</template>
