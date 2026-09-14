import { renderToString } from '@vue/server-renderer'
import type { Component } from 'vue'
import { createSSRApp, h } from 'vue'
import { describe, expect, it } from 'vitest'
import BoardDrawer from '../src/components/board/BoardDrawer.vue'
import HandZone from '../src/components/board/HandZone.vue'
import NumberTween from '../src/components/board/NumberTween.vue'
import ThreatIntents from '../src/components/board/ThreatIntents.vue'
import TraitCard from '../src/components/board/TraitCard.vue'
import EnvironmentPanel from '../src/components/EnvironmentPanel.vue'
import EvolutionTimeline from '../src/components/EvolutionTimeline.vue'
import GeneBank from '../src/components/GeneBank.vue'
import RulesPanel from '../src/components/RulesPanel.vue'
import { cardImpacts, effectContextFor, projectSelection, threatRows } from '../src/game/analysis'
import { content } from '../src/game/content'
import { cardDefinition, createRun, previewGeneration } from '../src/game/engine'
import { speciesIdentity } from '../src/game/species'
import { traitGlyph } from '../src/game/theme'
import type { RunState } from '../src/game/types'
import { act } from './helpers'

function mount(component: Component, props: Record<string, unknown>) {
  return renderToString(createSSRApp({ render: () => h(component, props) }))
}
function freshState(): RunState {
  return createRun('board-smoke', content)
}

describe('卡面', () => {
  const state = freshState()
  const context = effectContextFor(state, content)
  const trait = cardDefinition(state, state.hand[0]!, content)
  const impact = cardImpacts(state, content, previewGeneration(state, content))[state.hand[0]!]!

  it('渲染费用宝石、分类配色、结果条与固化进度', async () => {
    const html = await mount(TraitCard, {
      trait,
      context,
      selectable: true,
      impact,
      progress: 2,
      threshold: content.rules.fixationThreshold,
      detail: 'strip',
      tabIndex: 0,
    })
    expect(html).toContain('cost-gem')
    expect(html).toContain('card-art')
    expect(html).toContain('name-plate')
    expect(html).toContain('card-face')
    expect(html).toContain(trait.name)
    expect(html).toContain(`aria-label="表达性状：${trait.name}"`)
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('tabindex="0"')
    expect(html).toMatch(/预计多存活|对种群影响有限|预计减少/)
    expect(html).toContain('固化进度 2 / 5')
    expect(html).toContain('详细数值')
  })

  it('选中、禁用与奖励三种状态各有明确标记', async () => {
    const selected = await mount(TraitCard, {
      trait,
      context,
      selectable: true,
      selected: true,
      impact: { cardId: 'x', traitId: trait.id, selected: true, delta: 6, affordable: true },
    })
    expect(selected).toContain('已选择')
    expect(selected).toContain('本方案中保住')
    expect(selected).toContain('aria-pressed="true"')
    expect(selected).toContain('card-raised')

    const disabled = await mount(TraitCard, {
      trait,
      context,
      selectable: true,
      disabled: true,
      disabledReason: '额度不足',
      impact: { cardId: 'x', traitId: trait.id, selected: false, delta: 9, affordable: false },
    })
    expect(disabled).toContain('disabled')
    expect(disabled).toContain('cost-gem-off')
    expect(disabled).toContain('额度不足')
    // 额度不够也仍然展示潜力，只是不可点选。
    expect(disabled).toContain('预计多存活')

    const reward = await mount(TraitCard, { trait, context, size: 'reward', caption: '新的性状' })
    expect(reward).toContain('新的性状')
    expect(reward).toContain(trait.description)
  })
})

describe('手牌区', () => {
  it('渲染手牌组、roving tabindex 与额度提示', async () => {
    const state = freshState()
    const html = await mount(HandZone, {
      state,
      context: effectContextFor(state, content),
      impacts: cardImpacts(state, content, previewGeneration(state, content)),
      preview: previewGeneration(state, content),
      baseline: projectSelection(state, content, []),
      spent: 0,
    })
    expect(html).toContain('role="group" aria-label="手牌"')
    expect(html).toContain('已选 0 / 3 点 · 还能再表达 3 点')
    expect(html).toContain('本代尚未选择性状')
    expect(html).toContain('确认演化')
    // 只有第一张卡进入 Tab 序列，其余靠方向键移动。
    expect((html.match(/tabindex="0"/g) ?? []).length).toBe(1)
    expect((html.match(/tabindex="-1"/g) ?? []).length).toBe(state.hand.length - 1)
  })

  it('空手牌时给出人话提示并保持可结算', async () => {
    const empty: RunState = { ...freshState(), hand: [], cards: [], selectedCardIds: [] }
    const html = await mount(HandZone, {
      state: empty,
      context: effectContextFor(empty, content),
      impacts: {},
      preview: null,
      baseline: null,
      spent: 0,
    })
    expect(html).toContain('基因库暂时为空')
    expect(html).toContain('确认演化')
  })
})

describe('HUD 与抽屉', () => {
  it('威胁意图带图标、损失数字与严重度文字', async () => {
    const state = freshState()
    const rows = threatRows(state, previewGeneration(state, content))
    const html = await mount(ThreatIntents, { threats: rows })
    expect(html).toContain('aria-label="本代威胁"')
    for (const row of rows) {
      expect(html).toContain(row.label)
      expect(html).toContain(row.levelLabel)
    }
    expect(html).toContain('❄')
    expect(html).toContain('🍃')
    expect(html).toContain('🐺')
  })

  it('抽屉带对话框语义与关闭入口', async () => {
    const html = await mount(BoardDrawer, { title: '当前环境' })
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('当前环境')
    expect(html).toContain('关闭')
  })

  it('抽屉内容独立渲染：环境、基因库、历史、规则', async () => {
    const state = freshState()
    const settled = act(state, { type: 'commit-generation' }, content)

    const environment = await mount(EnvironmentPanel, {
      state: settled,
      result: settled.history[0]!,
      baseline: null,
    })
    expect(environment).toContain('当前环境')
    expect(environment).toContain('全部压力与资源数值')

    const gene = await mount(GeneBank, { state })
    expect(gene).toContain('拥有的牌')
    expect(gene).toContain('尚未发现')
    expect(gene).toContain('详细数值')

    const history = await mount(EvolutionTimeline, { state: settled })
    expect(history).toContain('已完成 1 / 24 代')
    expect(history).toContain('全部世代数据表')

    const rules = await mount(RulesPanel, { variant: 'dark' })
    expect(rules).toContain('结算公式')
    expect(rules).toContain('性状与固化')
  })
})

describe('卡面资源覆盖', () => {
  it('每种性状都有卡面字形与物种身份描述词', async () => {
    const ids = Object.keys(content.traits)
    for (const id of ids) {
      expect(traitGlyph(id, ''), `缺少卡面字形：${id}`).not.toBe('')
    }
    // 描述词表通过物种身份句子间接校验：全部登记时句子不应回落到祖先名。
    const state: RunState = {
      ...freshState(),
      permanentTraits: ids.slice(0, 8).map((traitId) => ({ traitId, generation: 1 })),
    }
    const identity = speciesIdentity(state, content, effectContextFor(state, content))
    expect(identity.features).toHaveLength(8)
    expect(identity.sentence).not.toBe('尚未形成稳定特征。')
    expect(identity.name).not.toBe(content.ancestorName)
  })
})

describe('数字滚动', () => {
  it('服务端渲染直接给出终值', async () => {
    const html = await mount(NumberTween, { value: 101 })
    expect(html).toContain('101')
    expect(html).toContain('tabular-nums')
  })
})
