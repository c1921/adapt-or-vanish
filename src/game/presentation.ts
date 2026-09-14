import type { Category, Effect, PressureId, ResourceId, Temperature } from './types'

export const categoryLabels: Record<Category, string> = {
  morphology: '形态',
  physiology: '生理',
  behavior: '行为',
  diet: '食性',
  reproduction: '繁殖',
}
export const categoryIcons: Record<Category, string> = {
  morphology: '🦴',
  physiology: '🫀',
  behavior: '🐾',
  diet: '🍖',
  reproduction: '🥚',
}
export const pressureLabels: Record<PressureId, string> = {
  food: '食物',
  temperature: '温度',
  predation: '捕食',
}
export const resourceLabels: Record<ResourceId, string> = {
  plants: '植物',
  insects: '昆虫',
  animals: '小型动物',
}
export const tagLabels: Record<string, string> = {
  small: '小型',
  efficient: '节能',
  limbs: '肢体',
  aerial: '空中',
  hunting: '捕猎',
  underground: '地下',
  armored: '护甲',
  insulation: '保温',
  cooling: '散热',
  nocturnal: '夜行',
  social: '群居',
  gathering: '采集',
  generalist: '泛化食性',
  herbivore: '植食',
  insectivore: '食虫',
  scavenger: '食腐',
  fertile: '繁殖',
  care: '育幼',
}

/**
 * Semantic palette shared by every panel: green marks food and growth, blue marks
 * climate, red marks predation and danger, violet marks genes, orange marks a cost.
 */
export type Tone = 'growth' | 'warmth' | 'danger' | 'gene' | 'cost' | 'neutral'

export const toneChip: Record<Tone, string> = {
  growth: 'chip border-emerald-200 bg-emerald-50 text-emerald-800',
  warmth: 'chip border-sky-200 bg-sky-50 text-sky-800',
  danger: 'chip border-rose-200 bg-rose-50 text-rose-800',
  gene: 'chip border-violet-200 bg-violet-50 text-violet-800',
  cost: 'chip border-orange-200 bg-orange-50 text-orange-900',
  neutral: 'chip border-slate-200 bg-slate-50 text-slate-600',
}
export const toneText: Record<Tone, string> = {
  growth: 'text-emerald-700',
  warmth: 'text-sky-700',
  danger: 'text-rose-700',
  gene: 'text-violet-700',
  cost: 'text-orange-700',
  neutral: 'text-slate-500',
}
/** The board is dark: every semantic tone has a tuned twin. */
export const toneChipOnDark: Record<Tone, string> = {
  growth: 'chip border-emerald-400/40 bg-emerald-400/15 text-emerald-100',
  warmth: 'chip border-sky-400/40 bg-sky-400/15 text-sky-100',
  danger: 'chip border-rose-400/40 bg-rose-400/15 text-rose-100',
  gene: 'chip border-violet-400/40 bg-violet-400/15 text-violet-100',
  cost: 'chip border-orange-400/40 bg-orange-400/15 text-orange-100',
  neutral: 'chip border-white/15 bg-white/5 text-ink-muted',
}
export const toneTextOnDark: Record<Tone, string> = {
  growth: 'text-emerald-300',
  warmth: 'text-sky-300',
  danger: 'text-rose-300',
  gene: 'text-violet-300',
  cost: 'text-orange-300',
  neutral: 'text-ink-muted',
}
/** Dotted-underlined rule keywords carry their explanation as a tooltip. */
export const keywords: Record<string, string> = {
  固化: '连续表达同一性状并存活 5 代，即可固定为永久性状。',
  表达额度: '每代可表达的性状总量；多数性状占 1 点，较大的性状占 2 点。',
  食物压力: '环境造成的食物缺口，每 1 点造成 2 个个体损失并压低出生数。',
  寒冷: '低温压力，缺乏御寒能力的个体会成批死亡。',
  高温: '高温压力，缺乏散热能力的个体会成批死亡。',
  捕食压力: '捕食者造成的损失，每 1 点造成 2 个个体损失。',
  采集: '把本代可用资源转成本代食物，抵消食物压力；资源不跨代储存。',
  永久性状: '固化后每代自动生效，收益与代价都不再需要抽牌。',
  灭绝: '种群归零即终局，谱系终止。',
}
export const keywordTip = (term: string): string => keywords[term] ?? ''
export const pressureTone: Record<PressureId, Tone> = {
  food: 'growth',
  temperature: 'warmth',
  predation: 'danger',
}
export const pressureIcons: Record<PressureId, string> = {
  food: '🍃',
  temperature: '❄',
  predation: '🐺',
}
export function temperatureIcon(temperature: Temperature): string {
  return temperature === 'cold' ? '❄' : '🔥'
}
export function pressureIcon(key: PressureId, temperature: Temperature): string {
  return key === 'temperature' ? temperatureIcon(temperature) : pressureIcons[key]
}
/** "温度" is a formula word; players read the actual climate instead. */
export function pressureDisplay(key: PressureId, temperature: Temperature): string {
  if (key !== 'temperature') return pressureLabels[key]
  return temperature === 'cold' ? '寒冷' : '高温'
}
export const environmentIcons: Record<string, string> = {
  forest: '🌲',
  grassland: '🌾',
  drought: '☀️',
}
export function environmentIcon(environmentId: string): string {
  return environmentIcons[environmentId] ?? '🌍'
}
/** Threat severity is carried by a label and an icon as well as by colour. */
export type SeverityLevel = 'none' | 'mild' | 'tense' | 'danger' | 'critical'
export const severityIcons: Record<SeverityLevel, string> = {
  none: '○',
  mild: '△',
  tense: '▲',
  danger: '◆',
  critical: '☠',
}
export const severityLabels: Record<SeverityLevel, string> = {
  none: '无威胁',
  mild: '轻微',
  tense: '紧张',
  danger: '危险',
  critical: '致命',
}
export const severityChips: Record<SeverityLevel, string> = {
  none: 'chip border-slate-300 bg-white text-slate-600',
  mild: 'chip border-lime-300 bg-lime-50 text-lime-900',
  tense: 'chip border-amber-300 bg-amber-50 text-amber-900',
  danger: 'chip border-orange-400 bg-orange-50 text-orange-900',
  critical: 'chip border-red-400 bg-red-50 text-red-900',
}
export const severityChipsOnDark: Record<SeverityLevel, string> = {
  none: 'chip border-white/20 bg-white/10 text-slate-200',
  mild: 'chip border-lime-400/40 bg-lime-400/15 text-lime-200',
  tense: 'chip border-amber-400/40 bg-amber-400/15 text-amber-100',
  danger: 'chip border-orange-400/50 bg-orange-400/20 text-orange-100',
  critical: 'chip border-red-400/60 bg-red-500/25 text-red-100',
}
export function severityOf(deaths: number): SeverityLevel {
  if (deaths <= 0) return 'none'
  if (deaths <= 2) return 'mild'
  if (deaths <= 5) return 'tense'
  if (deaths <= 9) return 'danger'
  return 'critical'
}
export const signed = (number: number) =>
  number > 0 ? `+${number}` : number < 0 ? `−${Math.abs(number)}` : '0'
export const percent = (ratio: number) => `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`

export function describeEffect(effect: Effect): string {
  let text: string
  switch (effect.type) {
    case 'pressure':
      text = `${pressureLabels[effect.target]}压力 ${signed(effect.amount)}`
      break
    case 'harvest':
      text = `${resourceLabels[effect.target]}采集 ${signed(effect.amount)}`
      break
    case 'births':
      text = `出生 ${signed(effect.amount)}`
      break
  }
  const conditions = [
    effect.when?.temperature ? (effect.when.temperature === 'cold' ? '寒冷时' : '高温时') : '',
    effect.when?.tags?.map((tag) => `具有${tagLabels[tag] ?? tag}性状`).join('、') ?? '',
  ].filter(Boolean)
  return conditions.length ? `${text}（${conditions.join('，')}）` : text
}

export function isBenefit(effect: Effect): boolean {
  return effect.type === 'pressure' ? effect.amount < 0 : effect.amount > 0
}

export interface EffectContext {
  temperature: Temperature
  /** Tags of every trait that will actually be expressed this generation. */
  tags: Set<string>
}

export interface EffectChip {
  tone: Tone
  polarity: 'benefit' | 'cost' | 'inactive'
  /** Player language: what this means for the species, not what the system computes. */
  text: string
  amount: number
  /** Raw rule text, kept for the expandable "详细数值" layer. */
  detail: string
  /** Why a conditional effect does nothing right now. */
  inactiveReason: string
}

function inactiveReason(effect: Effect, context: EffectContext): string {
  if (effect.when?.temperature && effect.when.temperature !== context.temperature)
    return effect.when.temperature === 'cold' ? '只在寒冷环境生效' : '只在高温环境生效'
  const missing = effect.when?.tags?.filter((tag) => !context.tags.has(tag)) ?? []
  if (missing.length) return `需要${missing.map((tag) => tagLabels[tag] ?? tag).join('、')}`
  return ''
}

/** Translate one rule effect into the ecological consequence a player can judge. */
export function effectChip(effect: Effect, context: EffectContext): EffectChip {
  const reason = inactiveReason(effect, context)
  let text: string
  let polarity: 'benefit' | 'cost' = isBenefit(effect) ? 'benefit' : 'cost'
  let tone: Tone = polarity === 'benefit' ? 'growth' : 'cost'
  switch (effect.type) {
    case 'pressure': {
      const reduces = effect.amount < 0
      if (effect.target === 'food') text = reduces ? '食物消耗降低' : '食物消耗增加'
      else if (effect.target === 'predation') text = reduces ? '捕食风险降低' : '捕食风险上升'
      else if (effect.when?.temperature === 'cold') text = reduces ? '更耐寒' : '更难御寒'
      else if (effect.when?.temperature === 'hot') text = reduces ? '更耐热' : '更难散热'
      else text = reduces ? '更能耐受极端温度' : '体温调节更吃力'
      if (tone === 'growth' && effect.target === 'temperature') tone = 'warmth'
      break
    }
    case 'harvest': {
      text = `${resourceLabels[effect.target]}采集`
      polarity = effect.amount > 0 ? 'benefit' : 'cost'
      tone = polarity === 'benefit' ? 'growth' : 'cost'
      break
    }
    case 'births': {
      text = effect.amount > 0 ? '繁殖更快' : '繁殖变慢'
      polarity = effect.amount > 0 ? 'benefit' : 'cost'
      tone = polarity === 'benefit' ? 'growth' : 'cost'
      break
    }
  }
  return {
    tone: reason ? 'neutral' : tone,
    polarity: reason ? 'inactive' : polarity,
    text,
    amount: effect.amount,
    detail: describeEffect(effect),
    inactiveReason: reason,
  }
}

export function effectChips(effects: readonly Effect[], context: EffectContext): EffectChip[] {
  return effects.map((effect) => effectChip(effect, context))
}
