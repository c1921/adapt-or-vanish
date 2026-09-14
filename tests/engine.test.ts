import { describe, expect, it } from 'vitest'
import { content } from '../src/game/content'
import {
  createRun,
  fixableTraits,
  legalMutations,
  previewGeneration,
  reduceGame,
  totalGenerations,
  validateContent,
} from '../src/game/engine'
import { sumEffects } from '../src/game/effects'
import { shuffled } from '../src/game/random'
import { act, fixture, selectTraits, simulate } from './helpers'

describe('内容与确定性', () => {
  it('提供 30 种性状、五类卡牌、三组突变及完整 24 代环境', () => {
    expect(validateContent(content)).toEqual([])
    expect(Object.keys(content.traits)).toHaveLength(30)
    expect(new Set(Object.values(content.traits).map((trait) => trait.category)).size).toBe(5)
    expect(new Set(content.mutations.map((mutation) => mutation.from)).size).toBe(3)
    expect(totalGenerations(content)).toBe(24)
  })
  it('相同种子重现完整单局；不同种子改变随机流', () => {
    expect(simulate('repeatable', 'shelter')).toEqual(simulate('repeatable', 'shelter'))
    expect(createRun('one', content)).not.toEqual(createRun('two', content))
    expect(shuffled(['a', 'b', 'c'], 42)).toEqual(shuffled(['a', 'b', 'c'], 42))
  })
  it('拒绝内容引用错误', () => {
    const invalid = structuredClone(content)
    invalid.startingDeck.push('unknown')
    invalid.mutations[0]!.to = 'unknown'
    invalid.environments[0]!.eventIds = []
    expect(validateContent(invalid)).toHaveLength(3)
  })
})

describe('表达与结算', () => {
  it('费用校验、取消选牌及非法阶段均不改变原状态或随机数', () => {
    const { state, data } = fixture(['shell', 'hibernate'])
    const selected = selectTraits(state, ['shell'], data)
    const remaining = selected.hand.find((id) => !selected.selectedCardIds.includes(id))!
    const rejected = reduceGame(selected, { type: 'toggle-card', cardId: remaining }, data)
    expect(rejected.error).toContain('额度不足')
    expect(rejected.state).toBe(selected)
    expect(
      act(selected, { type: 'toggle-card', cardId: selected.selectedCardIds[0]! }, data)
        .selectedCardIds,
    ).toEqual([])
    expect(reduceGame(state, { type: 'toggle-card', cardId: 'missing' }, data).error).toBeTruthy()
    expect(reduceGame(state, { type: 'continue' }, data).state).toBe(state)
  })
  it('预览等于正式结果，顺序无关，预览不消耗随机数或修改状态', () => {
    const { state, data } = fixture()
    const selected = selectTraits(state, ['omnivore', 'burrow'], data)
    const before = structuredClone(selected)
    const preview = previewGeneration(selected, data)
    expect(preview).toMatchObject({
      remainingPressures: { food: 1, temperature: 2, predation: 2 },
      births: 6,
      totalDeaths: 10,
      populationAfter: 116,
    })
    const reverse = previewGeneration(selected, data, [...selected.selectedCardIds].reverse())
    expect({ ...reverse, expressedTraitIds: [...reverse.expressedTraitIds].sort() }).toEqual({
      ...preview,
      expressedTraitIds: [...preview.expressedTraitIds].sort(),
    })
    expect(act(selected, { type: 'commit-generation' }, data).history[0]).toEqual(preview)
    expect(selected).toEqual(before)
  })
  it('采集不能超过资源，压力最低为零，出生最低为零', () => {
    const { state, data } = fixture(['omnivore', 'omnivore', 'omnivore'])
    state.environment.resources = { plants: 1, insects: 2, animals: 0 }
    const selected = selectTraits(state, ['omnivore', 'omnivore', 'omnivore'], data)
    const result = previewGeneration(selected, data)
    expect(result.harvestedResources).toEqual({ plants: 1, insects: 2, animals: 0 })
    expect(result.remainingResources).toEqual({ plants: 0, insects: 0, animals: 0 })
    const easy = fixture(['burrow', 'burrow', 'burrow'])
    expect(
      previewGeneration(
        selectTraits(easy.state, ['burrow', 'burrow', 'burrow'], easy.data),
        easy.data,
      ).remainingPressures.temperature,
    ).toBe(0)
    const starving = fixture(['hibernate'])
    starving.state.environment.pressures.food = 30
    expect(
      previewGeneration(selectTraits(starving.state, ['hibernate'], starving.data), starving.data)
        .births,
    ).toBe(0)
  })
  it('条件效果同时依据温度和所选／永久性状标签', () => {
    const effects = content.traits['coat']!.effects
    expect(sumEffects(effects, 'cold', new Set()).pressures.temperature).toBe(-4)
    expect(sumEffects(effects, 'hot', new Set()).pressures.temperature).toBe(1)
    const nursery = content.traits['communal-nursery']!.effects
    expect(sumEffects(nursery, 'hot', new Set(['social'])).births).toBe(6)
    expect(sumEffects(nursery, 'hot', new Set()).births).toBe(4)
  })
})

describe('固化与突变', () => {
  it('净减少但存活仍计次，同名牌每代最多一次；灭绝不计次', () => {
    const { state, data } = fixture(['burrow', 'burrow'])
    const selected = selectTraits(state, ['burrow', 'burrow'], data)
    const next = act(selected, { type: 'commit-generation' }, data)
    expect(next.population).toBeLessThan(state.population)
    expect(next.expressionCounts.burrow).toBe(1)
    selected.population = 1
    const extinct = act(selected, { type: 'commit-generation' }, data)
    expect(extinct.phase).toBe('ended')
    expect(extinct.outcome).toBe('extinct')
    expect(extinct.expressionCounts.burrow).toBeUndefined()
    const result = extinct.history[0]!
    expect(result.totalDeaths).toBe(result.populationBefore + result.births)
  })
  it('第五次达标、固化移除全部副本，下代生效，满槽可继续游戏', () => {
    const { state, data } = fixture([
      'burrow',
      'burrow',
      'burrow',
      'burrow',
      'burrow',
      'burrow',
      'burrow',
    ])
    state.expressionCounts.burrow = 4
    const selected = selectTraits(state, ['burrow'], data)
    const settled = act(selected, { type: 'commit-generation' }, data)
    const lastResult = structuredClone(settled.history[0])
    expect(fixableTraits(settled, data)).toContain('burrow')
    const fixed = act(settled, { type: 'fix-trait', traitId: 'burrow' }, data)
    expect(fixed.cards).toEqual([])
    expect([...fixed.hand, ...fixed.drawPile, ...fixed.discardPile]).toEqual([])
    expect(fixed.history[0]).toEqual(lastResult)
    expect(fixed.permanentTraits).toEqual([{ traitId: 'burrow', generation: 1 }])
    const next = act(fixed, { type: 'continue' }, data)
    expect(next.hand).toEqual([])
    expect(previewGeneration(next, data).remainingPressures).toEqual({
      food: 6,
      temperature: 3,
      predation: 3,
    })
    const full = structuredClone(settled)
    full.permanentTraits = Object.keys(content.traits)
      .filter((id) => id !== 'burrow')
      .slice(0, 6)
      .map((traitId) => ({ traitId, generation: 1 }))
    expect(fixableTraits(full, data)).toEqual([])
    expect(reduceGame(full, { type: 'fix-trait', traitId: 'burrow' }, data).error).toBeTruthy()
    expect(act(full, { type: 'continue' }, data).generation).toBe(2)
  })
  it('两代一次三选一，存在合法突变时必定包含突变，并重置新性状进度', () => {
    const { state, data } = fixture(['forelimbs', 'omnivore', 'coat'])
    state.generation = 2
    state.phase = 'settlement'
    state.discardPile.push(...state.hand)
    state.hand = []
    const evolution = act(state, { type: 'continue' }, data)
    expect(evolution.phase).toBe('evolution')
    expect(evolution.rewards).toHaveLength(3)
    const reward = evolution.rewards.find((option) => option.type === 'mutation')!
    expect(reward.type).toBe('mutation')
    if (reward.type !== 'mutation') throw new Error('Expected mutation')
    const definition = data.mutations.find((mutation) => mutation.id === reward.mutationId)!
    evolution.expressionCounts[definition.to] = 4
    const mutated = act(evolution, { type: 'choose-reward', rewardId: reward.id }, data)
    expect(mutated.cards.find((card) => card.id === reward.cardId)?.traitId).toBe(definition.to)
    expect(mutated.expressionCounts[definition.to]).toBe(0)
    expect(mutated.cards).toHaveLength(state.cards.length)
    expect(mutated.generation).toBe(3)
    expect(mutated.timeline.some((entry) => entry.kind === 'mutation')).toBe(true)
    expect(act(evolution, { type: 'choose-reward', rewardId: null }, data).cards).toEqual(
      state.cards,
    )
    expect(reduceGame(evolution, { type: 'choose-reward', rewardId: 'missing' }, data).state).toBe(
      evolution,
    )
  })
  it('固化性状不进入新牌奖励或突变目标，目标已持有时也不会突变成重复性状', () => {
    const { state, data } = fixture(['forelimbs'])
    state.permanentTraits = [{ traitId: 'wings', generation: 1 }]
    expect(legalMutations(state, data).some((entry) => entry.mutation.to === 'wings')).toBe(false)
    state.phase = 'settlement'
    state.generation = 2
    state.permanentTraits.push({ traitId: 'burrow', generation: 1 })
    const evolution = act(state, { type: 'continue' }, data)
    expect(
      evolution.rewards.some(
        (reward) => reward.type === 'new-trait' && reward.traitId === 'burrow',
      ),
    ).toBe(false)
  })
})

describe('单局闭环', () => {
  it('少牌、空牌与洗牌不会卡死或在一代重复抽同一实例', () => {
    for (const deck of [
      [],
      ['burrow'],
      ['burrow', 'omnivore', 'coat', 'herd', 'small-body', 'forelimbs'],
    ]) {
      const { state, data } = fixture(deck)
      const next = act(act(state, { type: 'commit-generation' }, data), { type: 'continue' }, data)
      expect(next.hand).toHaveLength(Math.min(5, deck.length))
      expect(new Set(next.hand).size).toBe(next.hand.length)
      expect(new Set([...next.hand, ...next.drawPile, ...next.discardPile]).size).toBe(deck.length)
    }
  })
  it('八代转场，终局灭绝优先于通关，终局不可再次操作', () => {
    const { state, data } = fixture([])
    state.generation = 8
    state.phase = 'settlement'
    const next = act(
      act(state, { type: 'continue' }, data),
      { type: 'choose-reward', rewardId: null },
      data,
    )
    expect(next.environment.environmentId).toBe('grassland')
    expect(next.environment.localGeneration).toBe(1)
    next.generation = 24
    next.population = 1
    const extinct = act(next, { type: 'commit-generation' }, data)
    expect(extinct.outcome).toBe('extinct')
    expect(extinct.rewards).toEqual([])
    expect(reduceGame(extinct, { type: 'continue' }, data).state).toBe(extinct)
  })
  it('持续忽视压力会灭绝', () => {
    let state = createRun('neglect', content)
    while (state.phase !== 'ended') {
      state = act(
        state,
        state.phase === 'adaptation'
          ? { type: 'commit-generation' }
          : state.phase === 'settlement'
            ? { type: 'continue' }
            : { type: 'choose-reward', rewardId: null },
      )
    }
    expect(state.outcome).toBe('extinct')
    expect(state.generation).toBeLessThan(24)
  })
  it.each(['shelter', 'fertility'] as const)('%s 构筑完成干旱并经历多次固化', (strategy) => {
    const { state } = simulate(`${strategy}-01`, strategy)
    expect(state.outcome).toBe('survived')
    expect(state.history).toHaveLength(24)
    expect(state.permanentTraits.length).toBeGreaterThanOrEqual(2)
    const fixed = state.permanentTraits.map((entry) => entry.traitId)
    expect(fixed).toContain(strategy === 'shelter' ? 'small-body' : 'early-maturity')
  })
})
