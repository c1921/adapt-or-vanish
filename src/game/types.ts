export type PressureId = 'food' | 'temperature' | 'predation'
export type ResourceId = 'plants' | 'insects' | 'animals'
export type Temperature = 'cold' | 'hot'
export type Category = 'morphology' | 'physiology' | 'behavior' | 'diet' | 'reproduction'
export type Pressures = Record<PressureId, number>
export type Resources = Record<ResourceId, number>

export interface EffectCondition {
  temperature?: Temperature
  /** All tags must be present among the selected and permanent traits. */
  tags?: string[]
}

export type Effect = (
  | { type: 'pressure'; target: PressureId; amount: number }
  | { type: 'harvest'; target: ResourceId; amount: number }
  | { type: 'births'; amount: number }
) & { when?: EffectCondition }

export interface TraitDefinition {
  id: string
  name: string
  category: Category
  tags: string[]
  cost: number
  description: string
  effects: Effect[]
  permanent: { name: string; effects: Effect[] }
  /** Branch mutations are only offered by their mutation recipe. */
  rewardPool: boolean
}

export interface EnvironmentStage {
  fromGeneration: number
  name: string
  pressures: Pressures
  resources: Resources
}

export interface EnvironmentDefinition {
  id: string
  name: string
  description: string
  duration: number
  temperature: Temperature
  stages: EnvironmentStage[]
  eventIds: string[]
}

export interface EventDefinition {
  id: string
  name: string
  description: string
  pressures?: Partial<Pressures>
  resources?: Partial<Resources>
}

export interface MutationDefinition {
  id: string
  from: string
  to: string
  description: string
}

export interface Rules {
  initialPopulation: number
  handSize: number
  expressionBudget: number
  fixationThreshold: number
  permanentLimit: number
  rewardInterval: number
  baseBirths: number
  foodBirthPenalty: number
  deathRates: Pressures
  maxPressure: number
  maxResource: number
}

export interface GameContent {
  version: string
  ancestorName: string
  traits: Record<string, TraitDefinition>
  environments: EnvironmentDefinition[]
  events: Record<string, EventDefinition>
  mutations: MutationDefinition[]
  startingDeck: string[]
  rules: Rules
}

export interface CardInstance {
  id: string
  traitId: string
}
export interface EnvironmentSnapshot {
  environmentId: string
  localGeneration: number
  stageName: string
  temperature: Temperature
  pressures: Pressures
  resources: Resources
  eventId: string
}

export interface GenerationResult {
  generation: number
  environmentId: string
  eventId: string
  populationBefore: number
  populationAfter: number
  births: number
  birthModifier: number
  deaths: Pressures
  totalDeaths: number
  remainingPressures: Pressures
  availableResources: Resources
  harvestedResources: Resources
  remainingResources: Resources
  expressedTraitIds: string[]
  spent: number
}

export type EvolutionReward =
  | { id: string; type: 'new-trait'; traitId: string }
  | { id: string; type: 'mutation'; mutationId: string; cardId: string }

export interface TimelineEntry {
  generation: number
  kind: 'environment' | 'fixation' | 'mutation' | 'acquisition' | 'ending'
  title: string
  detail: string
}

export interface RunState {
  seed: string
  rngState: number
  phase: 'adaptation' | 'settlement' | 'evolution' | 'ended'
  outcome: 'survived' | 'extinct' | null
  generation: number
  population: number
  maxPopulation: number
  cards: CardInstance[]
  drawPile: string[]
  discardPile: string[]
  hand: string[]
  selectedCardIds: string[]
  nextCardNumber: number
  expressionCounts: Record<string, number>
  permanentTraits: { traitId: string; generation: number }[]
  environment: EnvironmentSnapshot
  rewards: EvolutionReward[]
  history: GenerationResult[]
  timeline: TimelineEntry[]
}

export type GameAction =
  | { type: 'toggle-card'; cardId: string }
  | { type: 'commit-generation' }
  | { type: 'fix-trait'; traitId: string }
  | { type: 'continue' }
  | { type: 'choose-reward'; rewardId: string | null }

export interface TransitionResult {
  state: RunState
  error: string | null
}
