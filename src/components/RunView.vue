<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { content } from '../game/content'
import { cardDefinition, expressionCost, totalGenerations } from '../game/engine'
import type { GameAction, GenerationResult, RunState } from '../game/types'
import EffectList from './EffectList.vue'
import EnvironmentPanel from './EnvironmentPanel.vue'
import EvolutionChoices from './EvolutionChoices.vue'
import GeneBank from './GeneBank.vue'
import GenerationSummary from './GenerationSummary.vue'
import HistoryPanel from './HistoryPanel.vue'
import TraitCard from './TraitCard.vue'

const props = defineProps<{
  state: RunState
  preview: GenerationResult | null
  fixable: string[]
  error: string
  notice: string
}>()
const emit = defineEmits<{ action: [action: GameAction]; home: [] }>()
const total = totalGenerations(content)
const spent = computed(() => expressionCost(props.state, props.state.selectedCardIds, content))
const lastResult = computed(() => props.state.history.at(-1) ?? null)
const displayedResult = computed(() => props.preview ?? lastResult.value)
const phaseTitle = computed(
  () =>
    ({
      adaptation: '表达性状',
      settlement: '自然选择',
      evolution: '演化选择',
      ended: props.state.outcome === 'survived' ? '谱系延续' : '谱系灭绝',
    })[props.state.phase],
)
const phaseHeading = ref<HTMLElement | null>(null)
watch([() => props.state.generation, () => props.state.phase], async () => {
  await nextTick()
  phaseHeading.value?.focus({ preventScroll: true })
})
function stageProgress(index: number) {
  const start = content.environments.slice(0, index).reduce((sum, entry) => sum + entry.duration, 0)
  return Math.max(
    0,
    Math.min(content.environments[index]!.duration, props.state.history.length - start),
  )
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs text-slate-500">
          {{ content.ancestorName
          }}<span v-if="state.permanentTraits.length">
            ·
            {{
              state.permanentTraits
                .map((entry) => content.traits[entry.traitId]!.permanent.name)
                .join(' / ')
            }}</span
          >
        </p>
        <h1 ref="phaseHeading" tabindex="-1" class="mt-1 text-xl font-semibold outline-none">
          第 {{ state.generation }} 代 · {{ phaseTitle }}
        </h1>
      </div>
      <button class="btn-secondary" type="button" @click="emit('home')">返回首页</button>
    </div>
    <ol class="grid grid-cols-3 gap-2" aria-label="环境进程">
      <li
        v-for="(stage, index) in content.environments"
        :key="stage.id"
        class="rounded-lg border px-3 py-3"
        :class="
          stage.id === state.environment.environmentId
            ? 'border-emerald-600 bg-emerald-50'
            : 'border-slate-200 bg-white'
        "
        :aria-current="stage.id === state.environment.environmentId ? 'step' : undefined"
      >
        <div class="flex flex-wrap items-center justify-between gap-1 text-sm">
          <span class="font-medium">{{ index + 1 }}. {{ stage.name }}</span
          ><span class="text-xs tabular-nums text-slate-500"
            >{{ stageProgress(index) }}/{{ stage.duration }}</span
          >
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded bg-slate-200">
          <div
            class="h-full rounded bg-emerald-600"
            :style="{ width: `${(stageProgress(index) / stage.duration) * 100}%` }"
          />
        </div>
      </li>
    </ol>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="panel px-4 py-3">
        <p class="stat-label">当前种群</p>
        <p class="stat-value" data-testid="population">
          {{ state.population }}<span class="ml-1 text-xs font-normal text-slate-500">个体</span>
        </p>
      </div>
      <div class="panel px-4 py-3">
        <p class="stat-label">世代进度</p>
        <p class="stat-value">
          {{ state.history.length
          }}<span class="text-sm font-normal text-slate-500"> / {{ total }}</span>
        </p>
      </div>
      <div class="panel px-4 py-3">
        <p class="stat-label">基因库</p>
        <p class="stat-value">
          {{ state.cards.length }}<span class="ml-1 text-xs font-normal text-slate-500">张牌</span>
        </p>
      </div>
      <div class="panel px-4 py-3">
        <p class="stat-label">永久性状</p>
        <p class="stat-value">
          {{ state.permanentTraits.length
          }}<span class="text-sm font-normal text-slate-500">
            / {{ content.rules.permanentLimit }}</span
          >
        </p>
      </div>
    </div>

    <section
      v-if="state.phase === 'ended'"
      class="panel p-6"
      :class="
        state.outcome === 'extinct'
          ? 'border-amber-200 bg-amber-50/40'
          : 'border-emerald-200 bg-emerald-50/50'
      "
      aria-label="终局记录"
    >
      <h2 class="text-xl font-semibold">
        {{ state.outcome === 'survived' ? '穿过干旱，演化仍在继续。' : '这条谱系，停在了这里。' }}
      </h2>
      <p class="mt-2 text-sm text-slate-600">
        {{
          state.outcome === 'survived'
            ? '你的选择已经成为物种的稳定特征。下面保存着这段演化历史。'
            : '曾经有效的适应也可能成为负担。演化记录保留了本局的选择。'
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
          <dt class="stat-label">分支突变</dt>
          <dd class="stat-value">
            {{ state.timeline.filter((entry) => entry.kind === 'mutation').length }}
          </dd>
        </div>
      </dl>
      <button class="btn-primary mt-5" type="button" @click="emit('home')">
        返回首页，开始新谱系
      </button>
    </section>

    <div class="grid items-start gap-4 lg:grid-cols-3">
      <EnvironmentPanel
        class="lg:col-span-2"
        :state="state"
        :result="displayedResult"
      /><GenerationSummary
        v-if="displayedResult"
        :result="displayedResult"
        :preview="state.phase === 'adaptation'"
      />
    </div>
    <p
      v-if="error"
      role="alert"
      class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      {{ error }}
    </p>

    <section v-if="state.phase === 'adaptation'" class="panel p-4 sm:p-5" aria-label="性状表达">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="section-title">本代手牌 · {{ state.hand.length }} 张</h2>
          <p class="mt-1 text-xs text-slate-500">
            选择性状表达，再确认结算。表达且存活就会累计固化进度。
          </p>
        </div>
        <p class="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          表达额度：{{ spent }} / {{ content.rules.expressionBudget }}
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <TraitCard
          v-for="cardId in state.hand"
          :key="cardId"
          :trait="cardDefinition(state, cardId, content)"
          selectable
          :selected="state.selectedCardIds.includes(cardId)"
          :disabled="
            !state.selectedCardIds.includes(cardId) &&
            spent + cardDefinition(state, cardId, content).cost > content.rules.expressionBudget
          "
          :progress="state.expressionCounts[cardDefinition(state, cardId, content).id] ?? 0"
          :threshold="content.rules.fixationThreshold"
          @select="emit('action', { type: 'toggle-card', cardId })"
        />
      </div>
      <p v-if="!state.hand.length" class="rounded-md bg-slate-50 p-5 text-sm text-slate-500">
        基因库暂时为空。永久性状仍然有效，可以直接结算并等待演化机会。
      </p>
      <div
        class="sticky bottom-2 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm"
      >
        <p class="text-xs text-slate-500">
          已选 {{ state.selectedCardIds.length }} 张 · 抽牌堆 {{ state.drawPile.length }} · 弃牌堆
          {{ state.discardPile.length
          }}<span v-if="!state.selectedCardIds.length" class="mt-1 block"
            >当前将不表达手牌，仅依靠已有永久性状。</span
          >
          <span
            v-if="preview"
            class="mt-2 block text-sm font-medium text-slate-800"
            aria-live="polite"
            >种群预览：{{ preview.populationBefore }} → {{ preview.populationAfter }} · 额度
            {{ spent }}/{{ content.rules.expressionBudget }}</span
          >
        </p>
        <button
          class="btn-primary w-full sm:w-auto"
          type="button"
          @click="emit('action', { type: 'commit-generation' })"
        >
          确认表达并结算
        </button>
      </div>
    </section>

    <section v-else-if="state.phase === 'settlement'" class="panel p-5" aria-label="自然选择与固化">
      <h2 class="section-title">自然选择 · 让适应成为本能</h2>
      <p class="mt-2 text-sm text-slate-500">
        本代已记录表达进度。达到
        {{ content.rules.fixationThreshold }}
        次的性状可以固化，也可以留待以后；永久收益和代价从下一代生效。
      </p>
      <p v-if="lastResult?.expressedTraitIds.length" class="mt-2 text-sm text-slate-700">
        本代成功表达：{{
          [...new Set(lastResult.expressedTraitIds)]
            .map(
              (id) =>
                `${content.traits[id]!.name} ${state.expressionCounts[id]}/${content.rules.fixationThreshold}`,
            )
            .join('、')
        }}
      </p>
      <div v-if="fixable.length" class="mt-4 grid gap-3 md:grid-cols-3">
        <article
          v-for="traitId in fixable"
          :key="traitId"
          class="rounded-lg border border-emerald-200 p-4"
        >
          <h3 class="font-medium">
            {{ content.traits[traitId]!.name }} → {{ content.traits[traitId]!.permanent.name }}
          </h3>
          <p class="mt-1 mb-3 text-xs text-slate-500">
            移除全部
            {{ state.cards.filter((card) => card.traitId === traitId).length }}
            张同名牌，占用一个永久槽位。
          </p>
          <EffectList :effects="content.traits[traitId]!.permanent.effects" /><button
            class="btn-secondary mt-4 w-full"
            type="button"
            @click="emit('action', { type: 'fix-trait', traitId })"
          >
            固化「{{ content.traits[traitId]!.permanent.name }}」
          </button>
        </article>
      </div>
      <p v-else class="mt-4 rounded bg-slate-50 p-3 text-sm text-slate-500">
        {{
          state.permanentTraits.length >= content.rules.permanentLimit
            ? '永久性状已满。仍可通过新牌和突变应对环境变化。'
            : '目前没有可固化性状。继续表达同一种性状，积累适应。'
        }}
      </p>
      <div class="mt-5 flex justify-end">
        <button
          class="btn-primary w-full sm:w-auto"
          type="button"
          @click="emit('action', { type: 'continue' })"
        >
          {{
            state.generation % content.rules.rewardInterval === 0
              ? '继续：演化选择'
              : `进入第 ${state.generation + 1} 代`
          }}
        </button>
      </div>
    </section>
    <EvolutionChoices
      v-else-if="state.phase === 'evolution'"
      :rewards="state.rewards"
      @choose="(rewardId) => emit('action', { type: 'choose-reward', rewardId })"
    />

    <div class="grid items-start gap-4 lg:grid-cols-2">
      <section class="panel p-5" aria-label="永久性状">
        <h2 class="section-title">
          已固化性状
          <span class="text-sm font-normal text-slate-500"
            >{{ state.permanentTraits.length }} / {{ content.rules.permanentLimit }}</span
          >
        </h2>
        <p class="mt-1 text-xs text-slate-500">这些特征不再需要抽到，每代自动生效。</p>
        <div v-if="state.permanentTraits.length" class="mt-4 grid gap-3 sm:grid-cols-2">
          <article
            v-for="fixed in state.permanentTraits"
            :key="fixed.traitId"
            class="rounded-md border border-slate-200 p-3"
          >
            <h3 class="mb-2 text-sm font-semibold">
              {{ content.traits[fixed.traitId]!.permanent.name
              }}<span class="ml-2 text-xs font-normal text-slate-400"
                >第 {{ fixed.generation }} 代</span
              >
            </h3>
            <EffectList :effects="content.traits[fixed.traitId]!.permanent.effects" />
            <p
              v-if="fixed.generation === state.generation && state.phase !== 'adaptation'"
              class="mt-2 text-xs text-amber-800"
            >
              下代起生效
            </p>
          </article>
        </div>
        <p
          v-else
          class="mt-4 rounded-md border border-dashed border-slate-200 p-5 text-sm text-slate-500"
        >
          谱系尚未形成永久性状。表达同一种性状
          {{ content.rules.fixationThreshold }} 代后，可在结算时固化。
        </p>
      </section>
      <HistoryPanel :state="state" />
    </div>
    <GeneBank :state="state" />
    <div class="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
      <p class="break-all">本局种子：{{ state.seed }}</p>
      <p v-if="!notice" role="status">进度已自动保存到此浏览器</p>
    </div>
  </div>
</template>
