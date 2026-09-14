import { describe, expect, it } from 'vitest'
import {
  cardImpacts,
  causeRows,
  effectContextFor,
  eventHeadline,
  evolutionTimeline,
  fixationStatus,
  forecastSummary,
  previewForHover,
  probeTraitImpact,
  projectSelection,
  threatRows,
} from '../src/game/analysis'
import { content } from '../src/game/content'
import { cardDefinition, expressionCost, previewGeneration } from '../src/game/engine'
import { effectChip } from '../src/game/presentation'
import { speciesIdentity } from '../src/game/species'
import { act, fixture, selectTraits } from './helpers'

/** The fixture environment has food 6 / temperature 5 / predation 4 and no event. */
describe('悬停预览', () => {
  it('未选卡显示加入后的棋盘，已选卡显示移除后的棋盘', () => {
    const { state, data } = fixture()
    const current = projectSelection(state, data, [])!
    const card = state.cards.find((entry) => entry.traitId === 'omnivore')!
    const added = previewForHover(state, data, current, card.id)!
    expect(added).toMatchObject({ mode: 'add', traitId: 'omnivore', delta: 15 })
    expect(added.result.populationAfter).toBe(107)

    const plan = selectTraits(state, ['omnivore', 'burrow'], data)
    const planResult = projectSelection(plan, data, plan.selectedCardIds)!
    const removed = previewForHover(plan, data, planResult, card.id)!
    expect(removed.mode).toBe('remove')
    expect(removed.result.populationAfter).toBe(101)
    // 移除已选卡会失去它带来的收益，因此 delta 为负。
    expect(removed.delta).toBe(101 - 116)
  })
  it('幽灵预览与真实选择后的预测完全一致', () => {
    const { state, data } = fixture()
    const current = projectSelection(state, data, [])!
    const card = state.cards.find((entry) => entry.traitId === 'burrow')!
    const ghost = previewForHover(state, data, current, card.id)!
    const committed = act(state, { type: 'toggle-card', cardId: card.id }, data)
    expect(ghost.result).toEqual(previewGeneration(committed, data))
  })
  it('超额卡牌也能预览潜力，无卡或手牌外返回空', () => {
    const { state, data } = fixture(['hunter', 'hunter'])
    const selected = selectTraits(state, ['hunter'], data)
    const current = projectSelection(selected, data, selected.selectedCardIds)!
    const other = selected.hand.find((id) => !selected.selectedCardIds.includes(id))!
    expect(expressionCost(selected, [...selected.selectedCardIds, other], data)).toBeGreaterThan(
      data.rules.expressionBudget,
    )
    expect(previewForHover(selected, data, current, other)?.result.populationAfter).toBeGreaterThan(
      0,
    )
    expect(previewForHover(selected, data, current, null)).toBeNull()
    expect(previewForHover(selected, data, current, 'missing-card')).toBeNull()
  })
})

describe('生存预测的拆解', () => {
  it('不做新的适应就是基线，选择性状后逐项解释差异', () => {
    const { state, data } = fixture()
    const baseline = projectSelection(state, data, [])!
    const plan = selectTraits(state, ['omnivore', 'burrow'], data)
    const current = projectSelection(plan, data, plan.selectedCardIds)!
    expect(baseline.populationAfter).toBe(92)
    expect(current.populationAfter).toBe(116)

    const summary = forecastSummary(current, baseline)
    expect(summary).toMatchObject({
      before: 120,
      after: 116,
      delta: -4,
      births: 6,
      losses: 10,
      extinct: false,
      endangered: false,
      deltaVsBaseline: 24,
    })
    const rows = causeRows(current, baseline, 'cold')
    expect(rows.map((row) => [row.key, row.baseline, row.value, row.changed])).toEqual([
      ['births', 2, 6, true],
      ['food', 12, 2, true],
      ['temperature', 10, 4, true],
      ['predation', 8, 4, true],
    ])
    expect(rows[2]!.label).toBe('寒冷损失')
  })
  it('灭绝与濒危状态有明确标记', () => {
    const { state, data } = fixture()
    state.population = 3
    const summary = forecastSummary(projectSelection(state, data, [])!)
    expect(summary.after).toBe(0)
    expect(summary.extinct).toBe(true)
    const survivor = structuredClone(state)
    survivor.population = 50
    survivor.environment.pressures = { food: 10, temperature: 8, predation: 6 }
    const close = forecastSummary(projectSelection(survivor, data, [])!)
    expect(close.after).toBe(2)
    expect(close.endangered).toBe(true)
  })
})

describe('性状卡的实际效果', () => {
  it('每张手牌给出在当前环境下的存活增量，且与基线比较一致', () => {
    const { state, data } = fixture()
    const baseline = projectSelection(state, data, [])!
    const impacts = cardImpacts(state, data, baseline)
    expect(Object.keys(impacts)).toHaveLength(state.hand.length)
    for (const impact of Object.values(impacts)) {
      expect(impact.selected).toBe(false)
      expect(impact.affordable).toBe(true)
    }
    const omnivore = state.cards.find((card) => card.traitId === 'omnivore')!
    expect(impacts[omnivore.id]!.delta).toBe(15)

    const plan = selectTraits(state, ['omnivore', 'burrow'], data)
    const current = projectSelection(plan, data, plan.selectedCardIds)!
    const selected = cardImpacts(plan, data, current)
    expect(selected[omnivore.id]).toMatchObject({ selected: true, delta: 15 })
    expect(selected[state.cards.find((card) => card.traitId === 'burrow')!.id]!.delta).toBe(9)
  })
  it('额度不足的牌仍能显示潜力，但标记为不可选', () => {
    const { state, data } = fixture(['hunter', 'hunter', 'herd'])
    data.rules.expressionBudget = 3
    const selected = selectTraits(state, ['hunter'], data)
    expect(expressionCost(selected, selected.selectedCardIds, data)).toBe(2)
    const current = projectSelection(selected, data, selected.selectedCardIds)!
    const impacts = cardImpacts(selected, data, current)
    const second = selected.hand.find((id) => !selected.selectedCardIds.includes(id))!
    expect(impacts[second]!.affordable).toBe(false)
    expect(cardDefinition(selected, second, data).cost).toBe(2)
  })
  it('演化选项按当前环境估算价值；未拥有的性状也能试算', () => {
    const { state, data } = fixture()
    expect(probeTraitImpact(state, data, 'herd')).toBe(5)
    expect(probeTraitImpact(state, data, 'unknown-trait')).toBeNull()
  })
  it('效果被翻译成生态语言，并标明当前环境是否生效', () => {
    const coat = content.traits['coat']!.effects
    const cold = effectChip(coat[0]!, { temperature: 'cold', tags: new Set() })
    expect(cold).toMatchObject({ polarity: 'benefit', text: '更耐寒', amount: -4, tone: 'warmth' })
    const dormant = effectChip(coat[0]!, { temperature: 'hot', tags: new Set() })
    expect(dormant.polarity).toBe('inactive')
    expect(dormant.inactiveReason).toContain('寒冷')
    const nursery = content.traits['communal-nursery']!.effects[1]!
    expect(effectChip(nursery, { temperature: 'hot', tags: new Set() }).inactiveReason).toContain(
      '群居',
    )
    expect(effectChip(nursery, { temperature: 'hot', tags: new Set(['social']) }).polarity).toBe(
      'benefit',
    )
  })
})

describe('环境语言的威胁说明', () => {
  it('按损失分级，并给出玩家能读懂的说明', () => {
    const { state, data } = fixture()
    const baseline = projectSelection(state, data, [])!
    const rows = threatRows(state, baseline)
    expect(rows.map((row) => [row.key, row.deaths, row.level])).toEqual([
      ['food', 12, 'critical'],
      ['temperature', 10, 'critical'],
      ['predation', 8, 'danger'],
    ])
    expect(rows[0]!.headline).toContain('几乎没有采集能力')
    expect(rows[1]!.label).toBe('寒冷')

    const plan = selectTraits(state, ['omnivore', 'burrow'], data)
    const planned = threatRows(plan, projectSelection(plan, data, plan.selectedCardIds)!)
    expect(planned.map((row) => row.level)).toEqual(['mild', 'tense', 'tense'])
    expect(planned[1]!.adaptNote).toContain('降到')
  })
  it('事件使用写好的场景文本', () => {
    expect(eventHeadline(content.events['cold-snap']!)).toContain('缺乏御寒能力')
    expect(eventHeadline(content.events['quiet']!)).toBe(content.events['quiet']!.flavor)
  })
})

describe('物种身份与历史', () => {
  it('由永久性状生成物种名称与生态描述', () => {
    const { state, data } = fixture()
    expect(speciesIdentity(state, data, effectContextFor(state, data)).formed).toBe(false)
    state.permanentTraits = [
      { traitId: 'burrow', generation: 5 },
      { traitId: 'herd', generation: 6 },
      { traitId: 'insectivore', generation: 7 },
      { traitId: 'small-body', generation: 8 },
    ]
    const identity = speciesIdentity(state, data, effectContextFor(state, data))
    expect(identity.name).toBe('小型穴居食虫动物')
    expect(identity.sentence).toBe('一种小型、穴居、群体活动、食虫的动物。')
    expect(identity.features).toHaveLength(4)
    expect(identity.strengths.length).toBeGreaterThan(0)
  })
  it('固化进度用玩家语言表达', () => {
    expect(fixationStatus(0, 5)).toMatchObject({ remaining: 5, ready: false, ratio: 0 })
    expect(fixationStatus(4, 5).text).toBe('再表达 1 代即可成为永久性状')
    expect(fixationStatus(5, 5)).toMatchObject({ ready: true, ratio: 1 })
  })
  it('结算结果与演化事件合并成按世代倒序的时间线', () => {
    const { state, data } = fixture()
    const settled = act(state, { type: 'commit-generation' }, data)
    const rows = evolutionTimeline(settled, data)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ generation: 1, environmentName: '森林', eventName: '短暂平稳' })
    expect(rows[0]!.result?.populationAfter).toBe(92)
    expect(rows[0]!.entries.some((entry) => entry.kind === 'environment')).toBe(true)
  })
})
