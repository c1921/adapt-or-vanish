<script setup lang="ts">
import { ref } from 'vue'
import { useGame } from './composables/useGame'
import { content } from './game/content'
import { totalGenerations } from './game/engine'
import RunView from './components/RunView.vue'
const { state, playing, actionError, notice, preview, fixable, start, dispatch, resume, home } =
  useGame()
const seed = ref('')
const confirmNew = ref(false)
const total = totalGenerations(content)
function requestStart() {
  if (state.value && !confirmNew.value) {
    confirmNew.value = true
    return
  }
  start(seed.value.trim())
  confirmNew.value = false
}
function goHome() {
  confirmNew.value = false
  home()
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-360 flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"
      >
        <div class="flex items-center gap-3">
          <span
            aria-hidden="true"
            class="flex size-9 items-center justify-center rounded-md bg-emerald-800 text-lg font-semibold text-white"
            >A</span
          >
          <div>
            <p class="text-sm font-semibold tracking-wide">适者延续</p>
            <p class="text-[10px] tracking-widest text-slate-500">ADAPT OR VANISH</p>
          </div>
        </div>
        <span class="text-xs text-slate-500">物种演化 · 卡牌构筑原型</span>
      </div>
    </header>
    <main class="mx-auto max-w-360 px-4 py-6 sm:px-6">
      <p
        v-if="notice"
        role="alert"
        class="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        {{ notice }}
      </p>
      <RunView
        v-if="playing && state"
        :state="state"
        :preview="preview"
        :fixable="fixable"
        :error="actionError"
        :notice="notice"
        @action="dispatch"
        @home="goHome"
      />
      <div v-else class="mx-auto max-w-4xl py-6 sm:py-12">
        <p class="text-sm font-medium text-emerald-800">压力 → 适应 → 固化</p>
        <h1
          class="mt-3 text-3xl leading-tight font-semibold tracking-tight text-slate-900 sm:text-4xl"
        >
          让你的物种，延续下去。
        </h1>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
          经营一条物种谱系，用性状卡应对环境压力。让反复表达的适应成为永久特征，穿过森林、草原与最后的干旱。
        </p>
        <div class="mt-8 grid gap-5 md:grid-cols-2">
          <section class="panel p-6">
            <h2 class="section-title">开始一条谱系</h2>
            <p class="mt-2 text-sm text-slate-500">
              {{ content.ancestorName }} · 初始种群 {{ content.rules.initialPopulation }}
            </p>
            <form class="mt-6" @submit.prevent="requestStart">
              <label for="seed" class="block text-sm font-medium text-slate-700"
                >世界种子 <span class="font-normal text-slate-400">选填</span></label
              ><input
                id="seed"
                v-model="seed"
                name="seed"
                maxlength="80"
                autocomplete="off"
                class="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="留空随机生成"
              />
              <p class="mt-2 text-xs text-slate-500">相同种子与相同选择，会重现相同的演化过程。</p>
              <div
                v-if="confirmNew"
                role="alert"
                class="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <p>开始新谱系会覆盖此浏览器中的现有记录。</p>
                <button
                  type="button"
                  class="mt-2 underline underline-offset-4"
                  @click="confirmNew = false"
                >
                  保留现有记录
                </button>
              </div>
              <button class="btn-primary mt-5 w-full" type="submit">
                {{ confirmNew ? '确认开始新谱系' : '开始新的谱系' }}
              </button>
            </form>
            <div v-if="state" class="mt-4 border-t border-slate-100 pt-4">
              <button class="btn-secondary w-full" type="button" @click="resume">
                {{
                  state.phase === 'ended' ? '查看上局记录' : `继续谱系 · 第 ${state.generation} 代`
                }}
              </button>
              <p class="mt-2 break-all text-xs text-slate-500">
                种子 {{ state.seed }} · 种群 {{ state.population }} ·
                {{ state.permanentTraits.length }} 个永久性状
              </p>
            </div>
          </section>
          <section class="panel p-6">
            <h2 class="section-title">如何延续</h2>
            <ol class="mt-5 space-y-5 text-sm">
              <li class="flex gap-3">
                <span class="step-number">1</span>
                <div>
                  <h3 class="font-medium">观察压力</h3>
                  <p class="mt-1 leading-relaxed text-slate-500">
                    食物、温度、捕食决定本代的生存难题。随机事件会提前公开。
                  </p>
                </div>
              </li>
              <li class="flex gap-3">
                <span class="step-number">2</span>
                <div>
                  <h3 class="font-medium">表达性状</h3>
                  <p class="mt-1 leading-relaxed text-slate-500">
                    每代抽 {{ content.rules.handSize }} 张牌，用
                    {{ content.rules.expressionBudget }}
                    点额度搭配。可以反复选牌，查看种群变化再确认。
                  </p>
                </div>
              </li>
              <li class="flex gap-3">
                <span class="step-number">3</span>
                <div>
                  <h3 class="font-medium">留下适应</h3>
                  <p class="mt-1 leading-relaxed text-slate-500">
                    表达且存活累计
                    {{ content.rules.fixationThreshold }}
                    次后，可主动固化。同名牌移出基因库，收益和代价永久保留。
                  </p>
                </div>
              </li>
              <li class="flex gap-3">
                <span class="step-number">4</span>
                <div>
                  <h3 class="font-medium">穿过干旱</h3>
                  <p class="mt-1 leading-relaxed text-slate-500">
                    每 {{ content.rules.rewardInterval }} 代选择新卡或分支突变。完成
                    {{ total }} 代且种群仍存活，即可延续谱系。
                  </p>
                </div>
              </li>
            </ol>
          </section>
        </div>
        <div class="mt-5 grid grid-cols-3 gap-3 text-center">
          <div class="panel py-4">
            <p class="stat-value">{{ total }}</p>
            <p class="stat-label mt-1">世代挑战</p>
          </div>
          <div class="panel py-4">
            <p class="stat-value">{{ Object.keys(content.traits).length }}</p>
            <p class="stat-label mt-1">性状卡牌</p>
          </div>
          <div class="panel py-4">
            <p class="stat-value">{{ content.rules.permanentLimit }}</p>
            <p class="stat-label mt-1">永久性状槽位</p>
          </div>
        </div>
        <p class="mt-5 text-xs leading-relaxed text-slate-500">
          单局设计目标 15～25 分钟。进度自动保存在当前浏览器中，可随时离开后继续。
        </p>
      </div>
      <details class="mx-auto mt-8 max-w-4xl border-t border-slate-200 pt-4 text-sm">
        <summary class="cursor-pointer text-slate-600">规则与结算说明</summary>
        <div class="mt-3 space-y-2 text-xs leading-relaxed text-slate-500">
          <p>
            出生 = max(0, {{ content.rules.baseBirths }} + 繁殖修正 − 剩余食物压力 ×
            {{ content.rules.foodBirthPenalty }})。 每点食物、温度、捕食压力分别造成
            {{ content.rules.deathRates.food }}、{{ content.rules.deathRates.temperature }}、{{
              content.rules.deathRates.predation
            }}
            个个体损失。灭绝时死亡总数不超过现有种群加本代出生。
          </p>
          <p>
            资源每代刷新，采集不超过环境可用量。临时性状和永久性状的效果相加；同一组牌的结算与点击顺序无关。固化进度按性状类型共享，同一代最多增加一次，种群下降但存活也会增加。
          </p>
          <p>
            永久性状最多
            {{ content.rules.permanentLimit }}
            个，首版不提供替换。新卡加入弃牌堆；突变替换一张原牌，目标性状进度归零。首版所有数值使用抽象游戏单位。
          </p>
        </div>
      </details>
    </main>
  </div>
</template>
