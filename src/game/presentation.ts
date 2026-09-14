import type { Category, Effect, PressureId, ResourceId } from './types'

export const categoryLabels: Record<Category, string> = {
  morphology: '形态',
  physiology: '生理',
  behavior: '行为',
  diet: '食性',
  reproduction: '繁殖',
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
export const signed = (number: number) =>
  number > 0 ? `+${number}` : number < 0 ? `−${Math.abs(number)}` : '0'

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

/** Concise card face wording; full explanations remain available in details. */
export function describeCompactEffect(effect: Effect): string {
  const name = effect.type === 'births' ? '出生'
    : effect.type === 'harvest' ? resourceLabels[effect.target]
    : effect.target === 'temperature' && effect.when?.temperature
      ? effect.when.temperature === 'cold' ? '寒冷' : '高温'
      : pressureLabels[effect.target]
  const condition = effect.when?.temperature && !(effect.type === 'pressure' && effect.target === 'temperature')
    ? effect.when.temperature === 'cold' ? ' · 寒冷时' : ' · 高温时' : ''
  const tags = effect.when?.tags?.map(tag => tagLabels[tag] ?? tag).join('、')
  return `${name} ${signed(effect.amount)}${condition}${tags ? ` · ${tags}` : ''}`
}
