import { describe, expect, it } from 'vitest'
import { conditionMatches, sumEffects } from '../src/game/effects'
import { describeCompactEffect } from '../src/game/presentation'
import { countTraits, createActionGate } from '../src/game/ui'
import { fixture } from './helpers'

describe('卡牌解释与规则一致', () => {
  it('温度和全部标签必须同时满足；切换搭配后条件同步变化', () => {
    const condition = { temperature: 'hot' as const, tags: ['social', 'care'] }
    const cases = [
      { temperature: 'cold' as const, tags: new Set(['social', 'care']), active: false },
      { temperature: 'hot' as const, tags: new Set(['social']), active: false },
      { temperature: 'hot' as const, tags: new Set(['social', 'care']), active: true },
    ]
    for (const context of cases) {
      expect(conditionMatches(condition, context)).toBe(context.active)
      expect(sumEffects([{ type: 'births', amount: 2, when: condition }], context.temperature, context.tags).births).toBe(context.active ? 2 : 0)
    }
    expect(conditionMatches(undefined, cases[0]!)).toBe(true)
  })
  it('紧凑卡面保留方向、数值和生效条件', () => {
    expect(describeCompactEffect({ type: 'pressure', target: 'temperature', amount: -4, when: { temperature: 'cold' } })).toBe('寒冷 −4')
    expect(describeCompactEffect({ type: 'pressure', target: 'food', amount: 1, when: { temperature: 'hot' } })).toBe('食物 +1 · 高温时')
    expect(describeCompactEffect({ type: 'births', amount: 2, when: { tags: ['social'] } })).toBe('出生 +2 · 群居')
    expect(describeCompactEffect({ type: 'harvest', target: 'plants', amount: 3 })).toBe('植物 +3')
  })
})

describe('阶段提交保护', () => {
  it('可以快速搭配与撤销，但确认后的第二次点击不能跨阶段提交', () => {
    let time = 0
    const gate = createActionGate(() => time)
    expect(gate.accept({ type: 'toggle-card', cardId: 'gene-1' })).toBe(true)
    expect(gate.accept({ type: 'toggle-card', cardId: 'gene-1' })).toBe(true)
    expect(gate.accept({ type: 'commit-generation' })).toBe(true)
    expect(gate.accept({ type: 'continue' })).toBe(false)
    time = 319
    expect(gate.accept({ type: 'commit-generation' })).toBe(false)
    time = 320
    expect(gate.accept({ type: 'continue' })).toBe(true)
  })
  it('固化和奖励同样保护；新局重置锁定', () => {
    const gate = createActionGate(() => 0)
    expect(gate.accept({ type: 'fix-trait', traitId: 'coat' })).toBe(true)
    expect(gate.accept({ type: 'fix-trait', traitId: 'coat' })).toBe(false)
    gate.reset()
    expect(gate.accept({ type: 'choose-reward', rewardId: null })).toBe(true)
    expect(gate.accept({ type: 'toggle-card', cardId: 'gene-1' })).toBe(false)
    gate.reset()
    expect(gate.accept({ type: 'toggle-card', cardId: 'gene-1' })).toBe(true)
  })
})

describe('牌区与重复副本', () => {
  it('按副本计数，牌区互不混淆，不暴露抽牌顺序', () => {
    const { state } = fixture(['coat', 'coat', 'burrow', 'omnivore', 'forelimbs'])
    state.hand = ['gene-1']
    state.drawPile = ['gene-2', 'gene-3', 'gene-4']
    state.discardPile = ['gene-5']
    expect(countTraits(state, 'owned').coat).toBe(2)
    expect(countTraits(state, 'hand')).toEqual({ coat: 1 })
    expect(countTraits(state, 'discard')).toEqual({ forelimbs: 1 })
    const draw = countTraits(state, 'draw')
    state.drawPile.reverse()
    expect(countTraits(state, 'draw')).toEqual(draw)
    expect(countTraits(state, 'draw').forelimbs).toBeUndefined()
  })
  it('无存档和空牌区返回空集合', () => {
    expect(countTraits(null, 'all')).toEqual({})
    const { state } = fixture([])
    expect(countTraits(state, 'hand')).toEqual({})
  })
})
