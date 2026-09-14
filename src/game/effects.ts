import type { Effect, Pressures, Resources, Temperature } from './types'

export interface EffectTotals {
  pressures: Pressures
  harvest: Resources
  births: number
}
type EffectHandlers = {
  [K in Effect['type']]: (effect: Extract<Effect, { type: K }>, total: EffectTotals) => void
}

/** Extend this registry and the Effect union together when adding a new operation. */
const handlers: EffectHandlers = {
  pressure: (effect, total) => {
    total.pressures[effect.target] += effect.amount
  },
  harvest: (effect, total) => {
    total.harvest[effect.target] += effect.amount
  },
  births: (effect, total) => {
    total.births += effect.amount
  },
}

export function sumEffects(
  effects: readonly Effect[],
  temperature: Temperature,
  tags: Set<string>,
): EffectTotals {
  const total: EffectTotals = {
    pressures: { food: 0, temperature: 0, predation: 0 },
    harvest: { plants: 0, insects: 0, animals: 0 },
    births: 0,
  }
  for (const effect of effects) {
    if (effect.when?.temperature && effect.when.temperature !== temperature) continue
    if (effect.when?.tags?.some((tag) => !tags.has(tag))) continue
    // The switch preserves the correlation between each discriminant and payload.
    switch (effect.type) {
      case 'pressure':
        handlers.pressure(effect, total)
        break
      case 'harvest':
        handlers.harvest(effect, total)
        break
      case 'births':
        handlers.births(effect, total)
        break
    }
  }
  return total
}
