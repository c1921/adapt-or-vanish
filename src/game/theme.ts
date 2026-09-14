import type { Category } from './types'

/**
 * Card faces are colour-coded by trait category, the way a mature deckbuilder
 * separates its card types. Every class string is literal so Tailwind picks it up.
 */
export interface CategoryTheme {
  /** Card frame border. */
  frame: string
  /** Art backdrop gradient. */
  art: string
  /** Name plate background (dark text sits on it). */
  plate: string
  /** Accent used for emphasis on dark surfaces. */
  accent: string
  /** Selection ring. */
  ring: string
  /** Tinted surface for panels that list this category. */
  soft: string
}

export const categoryTheme: Record<Category, CategoryTheme> = {
  morphology: {
    frame: 'border-amber-400/60',
    art: 'from-amber-400/30 via-amber-500/10 to-transparent',
    plate: 'bg-amber-300',
    accent: 'text-amber-200',
    ring: 'ring-amber-300',
    soft: 'border-amber-400/40 bg-amber-400/10',
  },
  physiology: {
    frame: 'border-teal-400/60',
    art: 'from-teal-400/30 via-teal-500/10 to-transparent',
    plate: 'bg-teal-300',
    accent: 'text-teal-200',
    ring: 'ring-teal-300',
    soft: 'border-teal-400/40 bg-teal-400/10',
  },
  behavior: {
    frame: 'border-sky-400/60',
    art: 'from-sky-400/30 via-sky-500/10 to-transparent',
    plate: 'bg-sky-300',
    accent: 'text-sky-200',
    ring: 'ring-sky-300',
    soft: 'border-sky-400/40 bg-sky-400/10',
  },
  diet: {
    frame: 'border-lime-400/60',
    art: 'from-lime-400/30 via-lime-500/10 to-transparent',
    plate: 'bg-lime-300',
    accent: 'text-lime-200',
    ring: 'ring-lime-300',
    soft: 'border-lime-400/40 bg-lime-400/10',
  },
  reproduction: {
    frame: 'border-rose-400/60',
    art: 'from-rose-400/30 via-rose-500/10 to-transparent',
    plate: 'bg-rose-300',
    accent: 'text-rose-200',
    ring: 'ring-rose-300',
    soft: 'border-rose-400/40 bg-rose-400/10',
  },
}

/**
 * Card art for the prototype: one glyph per trait, drawn on the category gradient.
 * `TraitCard` exposes an `art` slot, so real illustrations can replace these later
 * without touching layout or props.
 */
export const traitGlyphs: Record<string, string> = {
  'small-body': '🐁',
  forelimbs: '🖐️',
  wings: '🪽',
  claws: '🐾',
  'digging-limbs': '⛏️',
  shell: '🐢',
  coat: '🧥',
  'thick-fur': '🐻',
  'sparse-fur': '🌬️',
  'fat-storage': '🥜',
  'low-metabolism': '🐌',
  'heat-tolerance': '🌡️',
  burrow: '🕳️',
  nocturnal: '🦉',
  herd: '🐑',
  hibernate: '🐻‍❄️',
  'store-food': '🌰',
  ambush: '🐍',
  omnivore: '🍽️',
  grazer: '🌿',
  insectivore: '🐛',
  scavenger: '🦴',
  roots: '🥕',
  hunter: '🦁',
  'early-maturity': '🐣',
  'many-offspring': '🪺',
  'parental-care': '🍼',
  'seasonal-breeding': '📅',
  'long-life': '🐘',
  'communal-nursery': '🏡',
}

export function traitGlyph(traitId: string, fallback: string): string {
  return traitGlyphs[traitId] ?? fallback
}
