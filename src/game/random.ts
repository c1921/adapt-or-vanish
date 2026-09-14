/** FNV-1a seed hashing and a serializable Mulberry32 stream. No ambient randomness. */
export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
  return hash >>> 0
}

export function random(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0
  let value = Math.imul(next ^ (next >>> 15), next | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return { state: next, value: ((value ^ (value >>> 14)) >>> 0) / 4294967296 }
}

export function shuffled<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const roll = random(state)
    state = roll.state
    const j = Math.floor(roll.value * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return { items: copy, state }
}
