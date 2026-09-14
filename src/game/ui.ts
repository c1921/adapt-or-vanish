import type { GameAction, RunState } from './types'

/** Prevent the bottom button changing meaning underneath a rapid second tap. */
export function createActionGate(now: () => number = () => performance.now()) {
  let lockedUntil = 0
  return {
    accept(action: GameAction) {
      if (now() < lockedUntil) return false
      if (action.type !== 'toggle-card') lockedUntil = now() + 320
      return true
    },
    reset() { lockedUntil = 0 },
  }
}

export type LibraryZone = 'all' | 'owned' | 'hand' | 'draw' | 'discard'

/** Collection counts, never the hidden draw order. */
export function countTraits(state: RunState | null, zone: LibraryZone) {
  const ids = !state || zone === 'owned' || zone === 'all' ? null
    : new Set(zone === 'hand' ? state.hand : zone === 'draw' ? state.drawPile : state.discardPile)
  const counts: Record<string, number> = {}
  for (const card of state?.cards ?? []) {
    if (!ids || ids.has(card.id)) counts[card.traitId] = (counts[card.traitId] ?? 0) + 1
  }
  return counts
}
