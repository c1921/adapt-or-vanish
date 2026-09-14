import { z } from 'zod'
import { environmentAt, expressionCost, legalMutations, totalGenerations } from '../game/engine'
import type { GameContent, RunState } from '../game/types'

export const SAVE_KEY = 'adapt-or-vanish.run'
export const SAVE_VERSION = 1
export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
const natural = z.number().int().nonnegative()
const positive = z.number().int().positive()
const pressures = z.object({ food: natural, temperature: natural, predation: natural })
const resources = z.object({ plants: natural, insects: natural, animals: natural })
const resultSchema = z.object({
  generation: positive,
  environmentId: z.string(),
  eventId: z.string(),
  populationBefore: natural,
  populationAfter: natural,
  births: natural,
  birthModifier: z.number().int(),
  deaths: pressures,
  totalDeaths: natural,
  remainingPressures: pressures,
  availableResources: resources,
  harvestedResources: resources,
  remainingResources: resources,
  expressedTraitIds: z.array(z.string()),
  spent: natural,
})
const runSchema: z.ZodType<RunState> = z.object({
  seed: z.string().min(1).max(80),
  rngState: natural.max(0xffffffff),
  phase: z.enum(['adaptation', 'settlement', 'evolution', 'ended']),
  outcome: z.enum(['survived', 'extinct']).nullable(),
  generation: positive,
  population: natural,
  maxPopulation: natural,
  cards: z.array(z.object({ id: z.string().regex(/^gene-[1-9]\d*$/), traitId: z.string() })),
  drawPile: z.array(z.string()),
  discardPile: z.array(z.string()),
  hand: z.array(z.string()),
  selectedCardIds: z.array(z.string()),
  nextCardNumber: positive,
  expressionCounts: z.record(z.string(), natural),
  permanentTraits: z.array(z.object({ traitId: z.string(), generation: positive })),
  environment: z.object({
    environmentId: z.string(),
    localGeneration: positive,
    stageName: z.string(),
    temperature: z.enum(['cold', 'hot']),
    pressures,
    resources,
    eventId: z.string(),
  }),
  rewards: z.array(
    z.discriminatedUnion('type', [
      z.object({ id: z.string(), type: z.literal('new-trait'), traitId: z.string() }),
      z.object({
        id: z.string(),
        type: z.literal('mutation'),
        mutationId: z.string(),
        cardId: z.string(),
      }),
    ]),
  ),
  history: z.array(resultSchema),
  timeline: z.array(
    z.object({
      generation: positive,
      kind: z.enum(['environment', 'fixation', 'mutation', 'acquisition', 'ending']),
      title: z.string(),
      detail: z.string(),
    }),
  ),
})

/** Validate cross-references and phase invariants after validating the wire shape. */
function isCoherent(state: RunState, content: GameContent): boolean {
  if (state.generation > totalGenerations(content)) return false
  const cardIds = state.cards.map((card) => card.id)
  const zones = [...state.hand, ...state.drawPile, ...state.discardPile]
  const knownTrait = (id: string) => Boolean(content.traits[id])
  if (
    new Set(cardIds).size !== cardIds.length ||
    state.cards.some(
      (card) => !knownTrait(card.traitId) || Number(card.id.slice(5)) >= state.nextCardNumber,
    )
  )
    return false
  if (
    zones.length !== cardIds.length ||
    new Set(zones).size !== zones.length ||
    zones.some((id) => !cardIds.includes(id))
  )
    return false
  if (
    state.hand.length > content.rules.handSize ||
    new Set(state.selectedCardIds).size !== state.selectedCardIds.length ||
    state.selectedCardIds.some((id) => !state.hand.includes(id))
  )
    return false
  if (expressionCost(state, state.selectedCardIds, content) > content.rules.expressionBudget)
    return false
  if (Object.keys(state.expressionCounts).some((id) => !knownTrait(id))) return false
  const fixed = state.permanentTraits.map((entry) => entry.traitId)
  if (
    fixed.length > content.rules.permanentLimit ||
    new Set(fixed).size !== fixed.length ||
    fixed.some((id) => !knownTrait(id) || state.cards.some((card) => card.traitId === id))
  )
    return false
  if (
    state.permanentTraits.some(
      (entry) =>
        entry.generation > state.generation ||
        (state.expressionCounts[entry.traitId] ?? 0) < content.rules.fixationThreshold,
    )
  )
    return false
  const { definition, localGeneration } = environmentAt(state.generation, content)
  const stage = [...definition.stages]
    .reverse()
    .find((entry) => entry.fromGeneration <= localGeneration)!
  const environment = state.environment
  if (
    environment.environmentId !== definition.id ||
    environment.localGeneration !== localGeneration ||
    environment.temperature !== definition.temperature ||
    environment.stageName !== stage.name ||
    !definition.eventIds.includes(environment.eventId)
  )
    return false
  const event = content.events[environment.eventId]!
  for (const key of ['food', 'temperature', 'predation'] as const) {
    if (
      environment.pressures[key] !==
      Math.max(
        0,
        Math.min(content.rules.maxPressure, stage.pressures[key] + (event.pressures?.[key] ?? 0)),
      )
    )
      return false
  }
  for (const key of ['plants', 'insects', 'animals'] as const) {
    if (
      environment.resources[key] !==
      Math.max(
        0,
        Math.min(content.rules.maxResource, stage.resources[key] + (event.resources?.[key] ?? 0)),
      )
    )
      return false
  }
  const expectedHistory = state.phase === 'adaptation' ? state.generation - 1 : state.generation
  if (state.history.length !== expectedHistory) return false
  let lastPopulation = content.rules.initialPopulation
  let maximum = lastPopulation
  for (const [index, result] of state.history.entries()) {
    const environmentDefinition = environmentAt(index + 1, content).definition
    if (
      result.generation !== index + 1 ||
      result.environmentId !== environmentDefinition.id ||
      !environmentDefinition.eventIds.includes(result.eventId)
    )
      return false
    if (
      result.populationBefore !== lastPopulation ||
      result.totalDeaths !==
        result.deaths.food + result.deaths.temperature + result.deaths.predation ||
      result.populationAfter !== result.populationBefore + result.births - result.totalDeaths
    )
      return false
    if (
      result.expressedTraitIds.some((id) => !knownTrait(id)) ||
      result.spent > content.rules.expressionBudget
    )
      return false
    for (const key of ['plants', 'insects', 'animals'] as const)
      if (
        result.harvestedResources[key] + result.remainingResources[key] !==
        result.availableResources[key]
      )
        return false
    lastPopulation = result.populationAfter
    maximum = Math.max(maximum, lastPopulation)
  }
  if (state.population !== lastPopulation || state.maxPopulation !== maximum) return false
  if (state.phase !== 'adaptation' && (state.hand.length || state.selectedCardIds.length))
    return false
  if (state.phase === 'ended') {
    if (
      state.outcome !== (state.population === 0 ? 'extinct' : 'survived') ||
      (state.population > 0 && state.generation !== totalGenerations(content))
    )
      return false
  } else if (
    state.outcome !== null ||
    state.population === 0 ||
    (state.phase !== 'adaptation' && state.generation === totalGenerations(content))
  )
    return false
  if (state.phase !== 'evolution' && state.rewards.length) return false
  if (state.phase === 'evolution' && state.generation % content.rules.rewardInterval !== 0)
    return false
  if (
    state.rewards.length > 3 ||
    new Set(state.rewards.map((reward) => reward.id)).size !== state.rewards.length
  )
    return false
  const mutations = legalMutations(state, content)
  for (const reward of state.rewards) {
    if (reward.type === 'new-trait') {
      if (!content.traits[reward.traitId]?.rewardPool || fixed.includes(reward.traitId))
        return false
    } else if (
      !mutations.some(
        (entry) => entry.card.id === reward.cardId && entry.mutation.id === reward.mutationId,
      )
    )
      return false
  }
  return state.timeline.every((entry) => entry.generation <= state.generation)
}

export function encodeRun(state: RunState, content: GameContent): string {
  return JSON.stringify({ version: SAVE_VERSION, contentVersion: content.version, state })
}

export function decodeRun(raw: string, content: GameContent): RunState | null {
  try {
    const envelope = z
      .object({
        version: z.literal(SAVE_VERSION),
        contentVersion: z.literal(content.version),
        state: runSchema,
      })
      .safeParse(JSON.parse(raw))
    if (!envelope.success || !isCoherent(envelope.data.state, content)) return null
    return envelope.data.state
  } catch {
    return null
  }
}

export function loadRun(
  storage: StoragePort,
  content: GameContent,
): { state: RunState | null; notice: string } {
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return { state: null, notice: '' }
    const state = decodeRun(raw, content)
    return {
      state,
      notice: state ? '' : '本地存档损坏或与当前版本不兼容。可以开始新的谱系，覆盖旧存档。',
    }
  } catch {
    return { state: null, notice: '无法读取本地存档。仍可开始游戏，但刷新可能丢失进度。' }
  }
}

export function saveRun(storage: StoragePort, state: RunState, content: GameContent): string {
  try {
    storage.setItem(SAVE_KEY, encodeRun(state, content))
    return ''
  } catch {
    return '自动保存失败。本局仍可继续，关闭或刷新页面可能丢失进度。'
  }
}
