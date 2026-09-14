import { expressionCost, previewGeneration } from './engine'
import type { EffectContext, SeverityLevel, Tone } from './presentation'
import {
  environmentIcon,
  percent,
  pressureDisplay,
  pressureIcon,
  pressureTone,
  severityLabels,
  severityOf,
  temperatureIcon,
} from './presentation'
import type {
  EventDefinition,
  GameContent,
  GenerationResult,
  PressureId,
  RunState,
  TimelineEntry,
} from './types'

const pressureKeys: PressureId[] = ['food', 'temperature', 'predation']

/**
 * Projection for any *hypothetical* board, including one that overspends the
 * expression budget, so the UI can show what a single card is worth.
 */
export function projectSelection(
  state: RunState,
  content: GameContent,
  selected: readonly string[],
): GenerationResult | null {
  try {
    return previewGeneration(state, content, selected, { enforceBudget: false })
  } catch {
    return null
  }
}

/** Tags that will actually be active this generation: expressed traits plus permanent ones. */
export function effectContextFor(
  state: RunState,
  content: GameContent,
  selected: readonly string[] = state.selectedCardIds,
): EffectContext {
  const expressed = selected
    .map((cardId) => state.cards.find((card) => card.id === cardId)?.traitId)
    .filter((traitId): traitId is string => Boolean(traitId && content.traits[traitId]))
  const permanent = state.permanentTraits.map((entry) => entry.traitId)
  const tags = new Set(
    [...expressed, ...permanent].flatMap((traitId) => content.traits[traitId]?.tags ?? []),
  )
  return { temperature: state.environment.temperature, tags }
}

export interface CardImpact {
  cardId: string
  traitId: string
  /** Already part of the current plan. */
  selected: boolean
  /**
   * Individuals this card is responsible for: the gain from adding it, or the
   * contribution it makes to the plan it is already part of.
   */
  delta: number
  affordable: boolean
}

export function cardImpacts(
  state: RunState,
  content: GameContent,
  current: GenerationResult | null,
): Record<string, CardImpact> {
  const impacts: Record<string, CardImpact> = {}
  if (!current) return impacts
  for (const cardId of state.hand) {
    const card = state.cards.find((entry) => entry.id === cardId)
    if (!card || !content.traits[card.traitId]) continue
    const selected = state.selectedCardIds.includes(cardId)
    const others = state.selectedCardIds.filter((id) => id !== cardId)
    const probe = projectSelection(state, content, selected ? others : [...others, cardId])
    if (!probe) continue
    impacts[cardId] = {
      cardId,
      traitId: card.traitId,
      selected,
      delta: selected
        ? current.populationAfter - probe.populationAfter
        : probe.populationAfter - current.populationAfter,
      affordable:
        expressionCost(state, [...others, cardId], content) <= content.rules.expressionBudget,
    }
  }
  return impacts
}

/** What a not-yet-owned trait would be worth in the environment the species faces now. */
export function probeTraitImpact(
  state: RunState,
  content: GameContent,
  traitId: string,
): number | null {
  if (!content.traits[traitId]) return null
  const probe = structuredClone(state)
  probe.phase = 'adaptation'
  probe.hand = ['probe']
  probe.selectedCardIds = []
  probe.cards = [...probe.cards, { id: 'probe', traitId }]
  const withTrait = projectSelection(probe, content, ['probe'])
  const without = projectSelection(probe, content, [])
  if (!withTrait || !without) return null
  return withTrait.populationAfter - without.populationAfter
}

export type CauseKey = 'births' | PressureId

export interface CauseRow {
  key: CauseKey
  label: string
  icon: string
  /** Always a positive number; gains and losses are distinguished by polarity. */
  value: number
  /** The same cause when nothing new is expressed. */
  baseline: number
  polarity: 'gain' | 'loss'
  changed: boolean
}

export function causeRows(
  result: GenerationResult,
  baseline: GenerationResult | null,
  temperature: RunState['environment']['temperature'],
): CauseRow[] {
  const source: { key: CauseKey; label: string; icon: string; polarity: 'gain' | 'loss' }[] = [
    { key: 'births', label: '出生', icon: '🐣', polarity: 'gain' },
    { key: 'food', label: '食物不足', icon: '🍃', polarity: 'loss' },
    {
      key: 'temperature',
      label: temperature === 'cold' ? '寒冷损失' : '高温损失',
      icon: temperatureIcon(temperature),
      polarity: 'loss',
    },
    { key: 'predation', label: '捕食损失', icon: '🐺', polarity: 'loss' },
  ]
  return source.map((entry) => {
    const value = entry.key === 'births' ? result.births : result.deaths[entry.key as PressureId]
    const base =
      baseline === null
        ? value
        : entry.key === 'births'
          ? baseline.births
          : baseline.deaths[entry.key as PressureId]
    return { ...entry, value, baseline: base, changed: base !== value }
  })
}

export interface ForecastSummary {
  before: number
  after: number
  /** Negative means the generation costs individuals. */
  delta: number
  births: number
  losses: number
  /** Share of the current population that survives, clamped to 1. */
  survivalRate: number
  extinct: boolean
  endangered: boolean
  /** Individuals saved compared with expressing nothing new. */
  deltaVsBaseline: number | null
}

export function forecastSummary(
  result: GenerationResult,
  baseline: GenerationResult | null = null,
): ForecastSummary {
  const delta = result.populationAfter - result.populationBefore
  return {
    before: result.populationBefore,
    after: result.populationAfter,
    delta,
    births: result.births,
    losses: result.totalDeaths,
    survivalRate:
      result.populationBefore > 0 ? result.populationAfter / result.populationBefore : 1,
    extinct: result.populationAfter === 0,
    endangered:
      result.populationAfter > 0 &&
      (result.populationAfter <= 20 || result.populationAfter <= result.populationBefore * 0.3),
    deltaVsBaseline: baseline ? result.populationAfter - baseline.populationAfter : null,
  }
}

export interface ThreatRow {
  key: PressureId
  label: string
  icon: string
  tone: Tone
  level: SeverityLevel
  levelLabel: string
  deaths: number
  /** Pressure left after the current adaptations. */
  remaining: number
  /** Pressure the environment creates before any adaptation. */
  rawPressure: number
  /** Harvested food this generation (food threat only). */
  harvest: number
  /** Player-language explanation of what is happening. */
  headline: string
  /** Present when adaptations already softened this threat. */
  adaptNote: string
}

function foodHeadline(state: RunState, result: GenerationResult, deaths: number): string {
  const available =
    state.environment.resources.plants +
    state.environment.resources.insects +
    state.environment.resources.animals
  const harvest =
    result.harvestedResources.plants +
    result.harvestedResources.insects +
    result.harvestedResources.animals
  if (deaths === 0)
    return harvest > 0
      ? `采集到 ${harvest} 份食物，本代没有个体饿死。`
      : '本代食物压力没有造成损失。'
  if (harvest === 0)
    return available > 0
      ? `环境中有 ${available} 份食物资源，但你的物种几乎没有采集能力。`
      : '环境中几乎没有可采集的食物。'
  return `采集到 ${harvest} 份食物，仍有 ${result.remainingPressures.food} 点缺口，${deaths} 个个体死于饥饿。`
}

function climateHeadline(state: RunState, deaths: number): string {
  const cold = state.environment.temperature === 'cold'
  if (deaths === 0) return cold ? '本代寒冷没有造成损失。' : '本代高温没有造成损失。'
  return cold
    ? `气温低于适应范围，${deaths} 个缺乏御寒能力的个体死亡。`
    : `持续高温让 ${deaths} 个缺乏散热能力的个体死亡。`
}

export function threatRows(state: RunState, result: GenerationResult): ThreatRow[] {
  const harvest =
    result.harvestedResources.plants +
    result.harvestedResources.insects +
    result.harvestedResources.animals
  return pressureKeys.map((key) => {
    const deaths = result.deaths[key]
    const rawPressure = state.environment.pressures[key]
    const remaining = result.remainingPressures[key]
    const level = severityOf(deaths)
    const label = pressureDisplay(key, state.environment.temperature)
    const headline =
      key === 'food'
        ? foodHeadline(state, result, deaths)
        : key === 'temperature'
          ? climateHeadline(state, deaths)
          : deaths === 0
            ? '本代没有个体被捕食。'
            : `捕食者活动频繁，${deaths} 个个体被捕食。`
    return {
      key,
      label,
      icon: pressureIcon(key, state.environment.temperature),
      tone: pressureTone[key],
      level,
      levelLabel: severityLabels[level],
      deaths,
      remaining,
      rawPressure,
      harvest: key === 'food' ? harvest : 0,
      headline,
      adaptNote: remaining < rawPressure ? `本轮适应把压力从 ${rawPressure} 降到 ${remaining}` : '',
    }
  })
}

/** Rich, authored prose for the generation's event; falls back to the rule text. */
export function eventHeadline(event: EventDefinition): string {
  return event.flavor ?? event.description
}

export interface TimelineRow {
  generation: number
  environmentId: string
  environmentName: string
  environmentIcon: string
  eventName: string
  result: GenerationResult | null
  entries: TimelineEntry[]
  expressed: string[]
}

/** Merge the settlement results and the evolution log into one per-generation history. */
export function evolutionTimeline(state: RunState, content: GameContent): TimelineRow[] {
  const rows = new Map<number, TimelineRow>()
  const rowFor = (generation: number, environmentId: string): TimelineRow => {
    const existing = rows.get(generation)
    if (existing) return existing
    const definition = content.environments.find((entry) => entry.id === environmentId)
    const row: TimelineRow = {
      generation,
      environmentId,
      environmentName: definition?.name ?? environmentId,
      environmentIcon: environmentIcon(environmentId),
      eventName: '',
      result: null,
      entries: [],
      expressed: [],
    }
    rows.set(generation, row)
    return row
  }
  for (const result of state.history) {
    const row = rowFor(result.generation, result.environmentId)
    row.result = result
    row.eventName = content.events[result.eventId]?.name ?? ''
    row.expressed = [...new Set(result.expressedTraitIds)].map(
      (traitId) => content.traits[traitId]?.name ?? traitId,
    )
  }
  for (const entry of state.timeline) {
    const row = rowFor(entry.generation, '')
    row.entries.push(entry)
    if (entry.kind === 'environment') {
      const definition = content.environments.find((stage) => entry.title.includes(stage.name))
      if (definition) {
        row.environmentId = definition.id
        row.environmentName = definition.name
        row.environmentIcon = environmentIcon(definition.id)
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.generation - a.generation)
}

export interface FixationStatus {
  count: number
  threshold: number
  /** 0–1 progress towards permanent status. */
  ratio: number
  ready: boolean
  remaining: number
  text: string
}

export function fixationStatus(count: number, threshold: number): FixationStatus {
  const clamped = Math.max(0, count)
  const ready = clamped >= threshold
  const remaining = Math.max(0, threshold - clamped)
  return {
    count: clamped,
    threshold,
    ratio: threshold > 0 ? Math.min(1, clamped / threshold) : 0,
    ready,
    remaining,
    text: ready
      ? '本代结算后即可固化为永久性状'
      : remaining === 1
        ? '再表达 1 代即可成为永久性状'
        : `再表达 ${remaining} 代即可成为永久性状`,
  }
}

export function survivalHeadline(summary: ForecastSummary): string {
  if (summary.extinct) return '这一代会灭绝'
  if (summary.delta > 0) return `种群增加 ${summary.delta} 个体`
  if (summary.delta === 0) return '种群规模不变'
  return `存活率 ${percent(summary.survivalRate)}`
}
