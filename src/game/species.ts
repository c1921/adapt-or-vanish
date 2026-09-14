import type { EffectChip, EffectContext } from './presentation'
import { effectChips } from './presentation'
import type { GameContent, RunState } from './types'

type Slot =
  'size' | 'habitat' | 'social' | 'diet' | 'covering' | 'metabolism' | 'reproduction' | 'other'

/**
 * Permanent traits are not buffs: they are the words a player would use to
 * describe the animal they have been building. This table supplies that vocabulary.
 */
const descriptors: Record<string, { text: string; slot: Slot }> = {
  'small-body': { text: '小型', slot: 'size' },
  forelimbs: { text: '前肢灵活', slot: 'other' },
  wings: { text: '树栖飞行', slot: 'habitat' },
  claws: { text: '爪锐', slot: 'other' },
  'digging-limbs': { text: '掘土', slot: 'habitat' },
  shell: { text: '有甲壳', slot: 'covering' },
  coat: { text: '体毛厚实', slot: 'covering' },
  'thick-fur': { text: '厚重毛被', slot: 'covering' },
  'sparse-fur': { text: '体毛稀疏', slot: 'covering' },
  'fat-storage': { text: '储脂', slot: 'metabolism' },
  'low-metabolism': { text: '低代谢', slot: 'metabolism' },
  'heat-tolerance': { text: '耐热', slot: 'metabolism' },
  burrow: { text: '穴居', slot: 'habitat' },
  nocturnal: { text: '夜行', slot: 'habitat' },
  herd: { text: '群体活动', slot: 'social' },
  hibernate: { text: '冬眠', slot: 'metabolism' },
  'store-food': { text: '储食', slot: 'other' },
  ambush: { text: '伏击捕食', slot: 'diet' },
  omnivore: { text: '杂食', slot: 'diet' },
  grazer: { text: '植食', slot: 'diet' },
  insectivore: { text: '食虫', slot: 'diet' },
  scavenger: { text: '食腐', slot: 'diet' },
  roots: { text: '食根茎', slot: 'diet' },
  hunter: { text: '捕食', slot: 'diet' },
  'early-maturity': { text: '早熟', slot: 'reproduction' },
  'many-offspring': { text: '多产', slot: 'reproduction' },
  'parental-care': { text: '精细育幼', slot: 'reproduction' },
  'seasonal-breeding': { text: '季节性繁殖', slot: 'reproduction' },
  'long-life': { text: '长寿', slot: 'reproduction' },
  'communal-nursery': { text: '群体育幼', slot: 'social' },
}

/** Order matters: it is the order of the generated species sentence. */
const sentenceOrder: Slot[] = [
  'size',
  'habitat',
  'social',
  'diet',
  'covering',
  'metabolism',
  'reproduction',
  'other',
]

export interface SpeciesFeature {
  traitId: string
  /** The permanent name, e.g. 穴居性 rather than 挖洞. */
  name: string
  generation: number
  benefits: EffectChip[]
  costs: EffectChip[]
}

export interface SpeciesIdentity {
  /** True once at least one adaptation has been fixed for good. */
  formed: boolean
  name: string
  sentence: string
  descriptors: string[]
  features: SpeciesFeature[]
  strengths: string[]
  costs: string[]
  /** Traits being expressed right now that are not permanent yet. */
  expressing: string[]
}

function unique(values: string[], limit: number): string[] {
  return [...new Set(values)].slice(0, limit)
}

export function speciesIdentity(
  state: RunState,
  content: GameContent,
  context: EffectContext,
): SpeciesIdentity {
  const permanentIds = state.permanentTraits.map((entry) => entry.traitId)
  const slots = new Map<Slot, string>()
  for (const traitId of permanentIds) {
    const descriptor = descriptors[traitId]
    if (descriptor && !slots.has(descriptor.slot)) slots.set(descriptor.slot, descriptor.text)
  }
  const ordered = sentenceOrder
    .map((slot) => slots.get(slot))
    .filter((text): text is string => Boolean(text))
  const features: SpeciesFeature[] = state.permanentTraits
    .filter((entry) => content.traits[entry.traitId])
    .map((entry) => {
      const chips = effectChips(content.traits[entry.traitId]!.permanent.effects, context)
      return {
        traitId: entry.traitId,
        name: content.traits[entry.traitId]!.permanent.name,
        generation: entry.generation,
        benefits: chips.filter((chip) => chip.polarity === 'benefit'),
        costs: chips.filter((chip) => chip.polarity === 'cost'),
      }
    })
  const selected = state.selectedCardIds
    .map((cardId) => state.cards.find((card) => card.id === cardId)?.traitId)
    .filter((traitId): traitId is string => Boolean(traitId))
    .map((traitId) => content.traits[traitId]!.name)
  /** The name is built from the three most defining slots, like a field guide entry. */
  const name = ['size', 'habitat', 'diet']
    .map((slot) => slots.get(slot as Slot))
    .filter((text): text is string => Boolean(text))
    .join('')
  return {
    formed: features.length > 0,
    name: name ? `${name}动物` : content.ancestorName,
    sentence: ordered.length
      ? `一种${ordered.slice(0, 5).join('、')}的动物。`
      : '尚未形成稳定特征。',
    descriptors: ordered,
    features,
    strengths: unique(
      features.flatMap((feature) => feature.benefits.map((chip) => chip.text)),
      5,
    ),
    costs: unique(
      features.flatMap((feature) => feature.costs.map((chip) => chip.text)),
      4,
    ),
    expressing: unique(selected, 5),
  }
}
