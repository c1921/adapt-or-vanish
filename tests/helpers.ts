import { content } from '../src/game/content'
import {
  createRun,
  expressionCost,
  fixableTraits,
  previewGeneration,
  reduceGame,
} from '../src/game/engine'
import type { GameAction, GameContent, RunState } from '../src/game/types'

export function act(state: RunState, action: GameAction, data = content): RunState {
  const result = reduceGame(state, action, data)
  if (result.error) throw new Error(result.error)
  return result.state
}

export function fixture(deck = ['omnivore', 'burrow', 'forelimbs', 'early-maturity', 'coat']) {
  const data = structuredClone(content)
  data.startingDeck = deck
  data.environments[0]!.eventIds = ['quiet']
  data.environments[0]!.stages[0]!.pressures = { food: 6, temperature: 5, predation: 4 }
  return { data, state: createRun('unit-test', data) }
}

export function selectTraits(state: RunState, traitIds: string[], data = content): RunState {
  let current = state
  for (const traitId of traitIds) {
    const card = current.cards.find(
      (entry) =>
        entry.traitId === traitId &&
        current.hand.includes(entry.id) &&
        !current.selectedCardIds.includes(entry.id),
    )!
    current = act(current, { type: 'toggle-card', cardId: card.id }, data)
  }
  return current
}

export const preferences = {
  shelter: [
    'burrow',
    'low-metabolism',
    'omnivore',
    'heat-tolerance',
    'digging-limbs',
    'small-body',
    'roots',
    'forelimbs',
    'nocturnal',
    'insectivore',
    'herd',
  ],
  fertility: [
    'many-offspring',
    'early-maturity',
    'communal-nursery',
    'seasonal-breeding',
    'omnivore',
    'insectivore',
    'low-metabolism',
    'roots',
    'burrow',
    'heat-tolerance',
  ],
}
export type Strategy = keyof typeof preferences

/** Exhaustive selection among at most five visible cards, with a small training preference. */
export function chooseHand(
  state: RunState,
  strategy: Strategy,
  data: GameContent = content,
): string[] {
  let best: string[] = []
  let bestScore = -Infinity
  const priority = preferences[strategy]
  for (let mask = 0; mask < 2 ** state.hand.length; mask++) {
    const selected = state.hand.filter((_, index) => mask & (1 << index))
    if (expressionCost(state, selected, data) > data.rules.expressionBudget) continue
    const result = previewGeneration(state, data, selected)
    const training = [...new Set(result.expressedTraitIds)].reduce((sum, id) => {
      const index = priority.indexOf(id)
      return (
        sum +
        (index >= 0 && (state.expressionCounts[id] ?? 0) < data.rules.fixationThreshold
          ? (priority.length - index) * 0.16
          : 0)
      )
    }, 0)
    const score = result.populationAfter + training
    if (score > bestScore) {
      bestScore = score
      best = selected
    }
  }
  return best
}

export function simulate(seed: string, strategy: Strategy, data = content) {
  let state = createRun(seed, data)
  const actions: GameAction[] = []
  const apply = (action: GameAction) => {
    actions.push(action)
    state = act(state, action, data)
  }
  while (state.phase !== 'ended') {
    if (state.phase === 'adaptation') {
      for (const cardId of chooseHand(state, strategy, data)) apply({ type: 'toggle-card', cardId })
      apply({ type: 'commit-generation' })
    } else if (state.phase === 'settlement') {
      for (const traitId of fixableTraits(state, data)) {
        if (preferences[strategy].includes(traitId) && fixableTraits(state, data).includes(traitId))
          apply({ type: 'fix-trait', traitId })
      }
      apply({ type: 'continue' })
    } else {
      const ranked = state.rewards
        .map((reward) => {
          const traitId =
            reward.type === 'new-trait'
              ? reward.traitId
              : data.mutations.find((mutation) => mutation.id === reward.mutationId)!.to
          const index = preferences[strategy].indexOf(traitId)
          const owned = state.cards.filter((card) => card.traitId === traitId).length
          return {
            reward,
            score: index < 0 ? -1 : preferences[strategy].length - index - owned * 3,
          }
        })
        .sort((a, b) => b.score - a.score)
      apply({
        type: 'choose-reward',
        rewardId: ranked[0] && ranked[0].score > 0 ? ranked[0].reward.id : null,
      })
    }
  }
  return { state, actions }
}
