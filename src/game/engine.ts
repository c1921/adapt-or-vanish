import { sumEffects } from './effects'
import { hashSeed, random, shuffled } from './random'
import type {
  CardInstance,
  EnvironmentDefinition,
  EvolutionReward,
  GameAction,
  GameContent,
  GenerationResult,
  Pressures,
  ResourceId,
  RunState,
  TransitionResult,
} from './types'

const pressureKeys = ['food', 'temperature', 'predation'] as const
const resourceKeys: ResourceId[] = ['plants', 'insects', 'animals']
const clamp = (value: number, maximum: number) => Math.max(0, Math.min(maximum, value))

export function totalGenerations(content: GameContent): number {
  return content.environments.reduce((sum, environment) => sum + environment.duration, 0)
}

export function environmentAt(
  generation: number,
  content: GameContent,
): { definition: EnvironmentDefinition; localGeneration: number } {
  let localGeneration = generation
  for (const definition of content.environments) {
    if (localGeneration <= definition.duration) return { definition, localGeneration }
    localGeneration -= definition.duration
  }
  throw new Error('世代超出环境配置范围。')
}

export function cardDefinition(state: RunState, cardId: string, content: GameContent) {
  const card = state.cards.find((entry) => entry.id === cardId)
  if (!card || !content.traits[card.traitId]) throw new Error('基因卡牌不存在。')
  return content.traits[card.traitId]!
}

export function expressionCost(
  state: RunState,
  selected: readonly string[],
  content: GameContent,
): number {
  return selected.reduce((sum, id) => sum + cardDefinition(state, id, content).cost, 0)
}

function selectionError(
  state: RunState,
  selected: readonly string[],
  content: GameContent,
): string | null {
  if (new Set(selected).size !== selected.length) return '同一张牌不能重复选择。'
  if (selected.some((id) => !state.hand.includes(id))) return '只能表达当前手牌中的性状。'
  if (expressionCost(state, selected, content) > content.rules.expressionBudget)
    return '表达额度不足，请先取消其他卡牌。'
  return null
}

/** Cap extinction losses at the available population, apportioned by pressure. */
function calculateDeaths(raw: Pressures, available: number): Pressures {
  const sum = raw.food + raw.temperature + raw.predation
  if (sum <= available) return raw
  const deaths = { food: 0, temperature: 0, predation: 0 }
  const fractions = pressureKeys
    .map((key) => {
      const value = (raw[key] * available) / sum
      deaths[key] = Math.floor(value)
      return { key, fraction: value - deaths[key] }
    })
    .sort((a, b) => b.fraction - a.fraction)
  const remainder = available - deaths.food - deaths.temperature - deaths.predation
  for (let i = 0; i < remainder; i++) deaths[fractions[i]!.key]++
  return deaths
}

export function previewGeneration(
  state: RunState,
  content: GameContent,
  selected: readonly string[] = state.selectedCardIds,
): GenerationResult {
  if (state.phase !== 'adaptation') throw new Error('当前不在性状表达阶段。')
  const error = selectionError(state, selected, content)
  if (error) throw new Error(error)
  const expressed = selected.map((id) => cardDefinition(state, id, content))
  const permanent = state.permanentTraits.map((fixed) => content.traits[fixed.traitId]!)
  const tags = new Set([...expressed, ...permanent].flatMap((trait) => trait.tags))
  const effects = [
    ...expressed.flatMap((trait) => trait.effects),
    ...permanent.flatMap((trait) => trait.permanent.effects),
  ]
  const modifiers = sumEffects(effects, state.environment.temperature, tags)
  const availableResources = { ...state.environment.resources }
  const harvestedResources = { plants: 0, insects: 0, animals: 0 }
  const remainingResources = { ...availableResources }
  for (const resource of resourceKeys) {
    harvestedResources[resource] = clamp(modifiers.harvest[resource], availableResources[resource])
    remainingResources[resource] -= harvestedResources[resource]
  }
  const totalFood =
    harvestedResources.plants + harvestedResources.insects + harvestedResources.animals
  const remainingPressures: Pressures = {
    food: Math.max(0, state.environment.pressures.food + modifiers.pressures.food - totalFood),
    temperature: Math.max(
      0,
      state.environment.pressures.temperature + modifiers.pressures.temperature,
    ),
    predation: Math.max(0, state.environment.pressures.predation + modifiers.pressures.predation),
  }
  const births = Math.max(
    0,
    content.rules.baseBirths +
      modifiers.births -
      remainingPressures.food * content.rules.foodBirthPenalty,
  )
  const deaths = calculateDeaths(
    {
      food: remainingPressures.food * content.rules.deathRates.food,
      temperature: remainingPressures.temperature * content.rules.deathRates.temperature,
      predation: remainingPressures.predation * content.rules.deathRates.predation,
    },
    state.population + births,
  )
  const totalDeaths = deaths.food + deaths.temperature + deaths.predation
  return {
    generation: state.generation,
    environmentId: state.environment.environmentId,
    eventId: state.environment.eventId,
    populationBefore: state.population,
    populationAfter: Math.max(0, state.population + births - totalDeaths),
    births,
    birthModifier: modifiers.births,
    deaths,
    totalDeaths,
    remainingPressures,
    availableResources,
    harvestedResources,
    remainingResources,
    expressedTraitIds: expressed.map((trait) => trait.id),
    spent: expressionCost(state, selected, content),
  }
}

function addCard(state: RunState, traitId: string): CardInstance {
  const card = { id: `gene-${state.nextCardNumber++}`, traitId }
  state.cards.push(card)
  state.discardPile.push(card.id)
  return card
}

/** Only receives an engine-owned clone; no input state is mutated. */
function startGeneration(state: RunState, content: GameContent) {
  const { definition, localGeneration } = environmentAt(state.generation, content)
  const stage = [...definition.stages]
    .reverse()
    .find((entry) => entry.fromGeneration <= localGeneration)!
  const roll = random(state.rngState)
  state.rngState = roll.state
  const event =
    content.events[definition.eventIds[Math.floor(roll.value * definition.eventIds.length)]!]!
  const pressures = { ...stage.pressures }
  const resources = { ...stage.resources }
  for (const key of pressureKeys)
    pressures[key] = clamp(
      pressures[key] + (event.pressures?.[key] ?? 0),
      content.rules.maxPressure,
    )
  for (const key of resourceKeys)
    resources[key] = clamp(
      resources[key] + (event.resources?.[key] ?? 0),
      content.rules.maxResource,
    )
  state.environment = {
    environmentId: definition.id,
    localGeneration,
    stageName: stage.name,
    temperature: definition.temperature,
    pressures,
    resources,
    eventId: event.id,
  }
  state.phase = 'adaptation'
  state.rewards = []
  state.selectedCardIds = []
  state.hand = []
  while (state.hand.length < content.rules.handSize) {
    if (!state.drawPile.length) {
      if (!state.discardPile.length) break
      const shuffle = shuffled(state.discardPile, state.rngState)
      state.rngState = shuffle.state
      state.drawPile = shuffle.items
      state.discardPile = []
    }
    state.hand.push(state.drawPile.pop()!)
  }
  if (localGeneration === 1)
    state.timeline.push({
      generation: state.generation,
      kind: 'environment',
      title: `进入${definition.name}`,
      detail: definition.description,
    })
}

export function createRun(seed: string, content: GameContent): RunState {
  const normalizedSeed = seed.trim().slice(0, 80) || 'adapt-or-vanish'
  const state: RunState = {
    seed: normalizedSeed,
    rngState: hashSeed(normalizedSeed),
    phase: 'adaptation',
    outcome: null,
    generation: 1,
    population: content.rules.initialPopulation,
    maxPopulation: content.rules.initialPopulation,
    cards: [],
    drawPile: [],
    discardPile: [],
    hand: [],
    selectedCardIds: [],
    nextCardNumber: 1,
    expressionCounts: {},
    permanentTraits: [],
    environment: {
      environmentId: '',
      localGeneration: 1,
      stageName: '',
      temperature: 'cold',
      pressures: { food: 0, temperature: 0, predation: 0 },
      resources: { plants: 0, insects: 0, animals: 0 },
      eventId: '',
    },
    rewards: [],
    history: [],
    timeline: [],
  }
  for (const traitId of content.startingDeck) addCard(state, traitId)
  startGeneration(state, content)
  return state
}

export function fixableTraits(state: RunState, content: GameContent): string[] {
  if (state.phase !== 'settlement' || state.permanentTraits.length >= content.rules.permanentLimit)
    return []
  const permanent = new Set(state.permanentTraits.map((entry) => entry.traitId))
  return [...new Set(state.cards.map((card) => card.traitId))].filter(
    (id) =>
      !permanent.has(id) && (state.expressionCounts[id] ?? 0) >= content.rules.fixationThreshold,
  )
}

export function legalMutations(state: RunState, content: GameContent) {
  const unavailable = new Set([
    ...state.cards.map((card) => card.traitId),
    ...state.permanentTraits.map((fixed) => fixed.traitId),
  ])
  return state.cards.flatMap((card) =>
    content.mutations
      .filter((mutation) => mutation.from === card.traitId && !unavailable.has(mutation.to))
      .map((mutation) => ({ card, mutation })),
  )
}

function createRewards(state: RunState, content: GameContent): EvolutionReward[] {
  const rewards: EvolutionReward[] = []
  const mutations = legalMutations(state, content)
  if (mutations.length) {
    const roll = random(state.rngState)
    state.rngState = roll.state
    const selected = mutations[Math.floor(roll.value * mutations.length)]!
    rewards.push({
      id: `mutation-${selected.card.id}-${selected.mutation.id}`,
      type: 'mutation',
      cardId: selected.card.id,
      mutationId: selected.mutation.id,
    })
  }
  const permanent = new Set(state.permanentTraits.map((fixed) => fixed.traitId))
  const pool = Object.values(content.traits).filter(
    (trait) => trait.rewardPool && !permanent.has(trait.id),
  )
  const shuffle = shuffled(pool, state.rngState)
  state.rngState = shuffle.state
  for (const trait of shuffle.items.slice(0, 3 - rewards.length))
    rewards.push({ id: `new-${trait.id}`, type: 'new-trait', traitId: trait.id })
  return rewards
}

export function reduceGame(
  state: RunState,
  action: GameAction,
  content: GameContent,
): TransitionResult {
  const fail = (error: string): TransitionResult => ({ state, error })
  if (state.phase === 'ended') return fail('本局已经结束，请开始新的谱系。')
  if (action.type === 'toggle-card') {
    if (state.phase !== 'adaptation') return fail('当前不能选择手牌。')
    const selected = state.selectedCardIds.includes(action.cardId)
      ? state.selectedCardIds.filter((id) => id !== action.cardId)
      : [...state.selectedCardIds, action.cardId]
    const error = selectionError(state, selected, content)
    return error ? fail(error) : { state: { ...state, selectedCardIds: selected }, error: null }
  }
  // Reject invalid commands before copying state or consuming randomness.
  if (action.type === 'commit-generation' && state.phase !== 'adaptation')
    return fail('请先完成本代结算。')
  if (action.type === 'fix-trait' && !fixableTraits(state, content).includes(action.traitId))
    return fail('该性状尚不能固化，或永久性状已满。')
  if (action.type === 'continue' && state.phase !== 'settlement') return fail('当前不能推进世代。')
  if (action.type === 'choose-reward') {
    if (state.phase !== 'evolution') return fail('当前不在演化选择阶段。')
    if (action.rewardId !== null && !state.rewards.some((reward) => reward.id === action.rewardId))
      return fail('该演化选项不存在。')
  }
  const next = structuredClone(state)
  switch (action.type) {
    case 'commit-generation': {
      const error = selectionError(state, state.selectedCardIds, content)
      if (error) return fail(error)
      const result = previewGeneration(state, content)
      next.population = result.populationAfter
      next.maxPopulation = Math.max(next.maxPopulation, next.population)
      next.history.push(result)
      next.discardPile.push(...next.hand)
      next.hand = []
      next.selectedCardIds = []
      if (next.population > 0)
        for (const id of new Set(result.expressedTraitIds))
          next.expressionCounts[id] = (next.expressionCounts[id] ?? 0) + 1
      if (next.population === 0 || next.generation === totalGenerations(content)) {
        next.phase = 'ended'
        next.outcome = next.population > 0 ? 'survived' : 'extinct'
        next.timeline.push({
          generation: next.generation,
          kind: 'ending',
          title: next.outcome === 'survived' ? '谱系穿过干旱' : '谱系终止',
          detail: `最终种群 ${next.population}，完成 ${next.history.length} 个世代。`,
        })
      } else next.phase = 'settlement'
      break
    }
    case 'fix-trait': {
      const removed = new Set(
        next.cards.filter((card) => card.traitId === action.traitId).map((card) => card.id),
      )
      next.cards = next.cards.filter((card) => !removed.has(card.id))
      next.drawPile = next.drawPile.filter((id) => !removed.has(id))
      next.discardPile = next.discardPile.filter((id) => !removed.has(id))
      next.hand = next.hand.filter((id) => !removed.has(id))
      next.selectedCardIds = next.selectedCardIds.filter((id) => !removed.has(id))
      next.permanentTraits.push({ traitId: action.traitId, generation: next.generation })
      const trait = content.traits[action.traitId]!
      next.timeline.push({
        generation: next.generation,
        kind: 'fixation',
        title: `固化：${trait.permanent.name}`,
        detail: `${trait.name}移出基因库（${removed.size} 张），永久效果从下代生效。`,
      })
      break
    }
    case 'continue':
      if (next.generation % content.rules.rewardInterval === 0) {
        next.rewards = createRewards(next, content)
        next.phase = 'evolution'
      } else {
        next.generation++
        startGeneration(next, content)
      }
      break
    case 'choose-reward': {
      const reward = next.rewards.find((entry) => entry.id === action.rewardId)
      if (reward?.type === 'new-trait') {
        addCard(next, reward.traitId)
        next.timeline.push({
          generation: next.generation,
          kind: 'acquisition',
          title: `获得：${content.traits[reward.traitId]!.name}`,
          detail: '新性状加入弃牌堆，后续洗牌时可被表达。',
        })
      } else if (reward?.type === 'mutation') {
        const mutation = content.mutations.find((entry) => entry.id === reward.mutationId)!
        const card = next.cards.find((entry) => entry.id === reward.cardId)!
        card.traitId = mutation.to
        next.expressionCounts[mutation.to] = 0
        next.timeline.push({
          generation: next.generation,
          kind: 'mutation',
          title: `${content.traits[mutation.from]!.name} → ${content.traits[mutation.to]!.name}`,
          detail: mutation.description,
        })
      }
      next.generation++
      startGeneration(next, content)
      break
    }
  }
  return { state: next, error: null }
}

/** Validate authoring mistakes once at application startup and in content tests. */
export function validateContent(content: GameContent): string[] {
  const errors: string[] = []
  const isNatural = (value: number) => Number.isSafeInteger(value) && value >= 0
  const positiveRules = [
    'initialPopulation',
    'handSize',
    'expressionBudget',
    'fixationThreshold',
    'permanentLimit',
    'rewardInterval',
    'maxPressure',
    'maxResource',
  ] as const
  if (
    positiveRules.some((key) => !isNatural(content.rules[key]) || content.rules[key] === 0) ||
    !isNatural(content.rules.baseBirths) ||
    !isNatural(content.rules.foodBirthPenalty) ||
    Object.values(content.rules.deathRates).some((value) => !isNatural(value))
  )
    errors.push('规则系数必须是有效整数，循环与槽位参数必须大于零。')
  const hasTrait = (id: string) => Boolean(content.traits[id])
  for (const id of content.startingDeck)
    if (!hasTrait(id)) errors.push(`初始牌组引用未知性状：${id}`)
  for (const [id, trait] of Object.entries(content.traits)) {
    if (id !== trait.id) errors.push(`性状 ID 不一致：${id}`)
    if (
      !Number.isInteger(trait.cost) ||
      trait.cost < 1 ||
      trait.cost > content.rules.expressionBudget
    )
      errors.push(`性状费用无效：${id}`)
    if (
      [...trait.effects, ...trait.permanent.effects].some(
        (effect) =>
          !Number.isSafeInteger(effect.amount) || (effect.type === 'harvest' && effect.amount < 0),
      )
    )
      errors.push(`性状效果必须使用整数，采集量不得为负：${id}`)
  }
  for (const mutation of content.mutations) {
    if (!hasTrait(mutation.from) || !hasTrait(mutation.to) || mutation.from === mutation.to)
      errors.push(`突变引用无效：${mutation.id}`)
  }
  if (new Set(content.mutations.map((mutation) => mutation.id)).size !== content.mutations.length)
    errors.push('突变 ID 重复。')
  if (!content.environments.length) errors.push('至少需要一个环境。')
  if (
    new Set(content.environments.map((environment) => environment.id)).size !==
    content.environments.length
  )
    errors.push('环境 ID 重复。')
  for (const environment of content.environments) {
    if (
      environment.stages.some(
        (stage) =>
          !Number.isSafeInteger(stage.fromGeneration) ||
          Object.values(stage.pressures).some(
            (value) => !isNatural(value) || value > content.rules.maxPressure,
          ) ||
          Object.values(stage.resources).some(
            (value) => !isNatural(value) || value > content.rules.maxResource,
          ),
      )
    )
      errors.push(`环境压力与资源配置无效：${environment.id}`)
    if (
      !Number.isInteger(environment.duration) ||
      environment.duration < 1 ||
      environment.stages[0]?.fromGeneration !== 1
    )
      errors.push(`环境世代配置无效：${environment.id}`)
    if (!environment.eventIds.length || environment.eventIds.some((id) => !content.events[id]))
      errors.push(`环境事件引用无效：${environment.id}`)
    if (
      environment.stages.some(
        (stage, index) =>
          stage.fromGeneration > environment.duration ||
          (index > 0 && stage.fromGeneration <= environment.stages[index - 1]!.fromGeneration),
      )
    )
      errors.push(`环境阶段顺序无效：${environment.id}`)
  }
  for (const [id, event] of Object.entries(content.events)) {
    if (
      id !== event.id ||
      [...Object.values(event.pressures ?? {}), ...Object.values(event.resources ?? {})].some(
        (value) => !Number.isSafeInteger(value),
      )
    )
      errors.push(`事件 ID 或数值无效：${id}`)
  }
  return errors
}
