import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import { describe, expect, it } from 'vitest'
import RunView from '../src/components/RunView.vue'
import { content } from '../src/game/content'
import { createRun, fixableTraits, previewGeneration, totalGenerations } from '../src/game/engine'
import type { RunState } from '../src/game/types'
import { act, selectTraits } from './helpers'

/** Server rendering catches template branch and undefined-access mistakes that types miss. */
function render(state: RunState) {
  const app = createSSRApp(RunView, {
    state,
    preview: state.phase === 'adaptation' ? previewGeneration(state, content) : null,
    fixable: fixableTraits(state, content),
    error: '',
    notice: '',
  })
  return renderToString(app)
}

async function settlePhase() {
  const state = createRun('ui-smoke', content)
  return act(state, { type: 'commit-generation' }, content)
}

describe('演化回合界面', () => {
  it('首屏回答：我在哪、发生了什么、还剩多少、该选几张、点了会怎样', async () => {
    const state = createRun('ui-smoke', content)
    const html = await render(state)
    expect(html).toContain(`第 1 / ${totalGenerations(content)} 代`)
    expect(html).toContain('主要威胁')
    expect(html).toContain('当前种群')
    expect(html).toContain('预计下一代')
    expect(html).toContain('生存预测')
    expect(html).toContain('当前物种')
    expect(html).toContain('当前环境')
    expect(html).toContain('本代要表达的性状')
    expect(html).toContain('还能再表达 3 点')
    expect(html).toContain('确认演化')
    expect(html).toContain('不做新的适应')
    // Fixed trait language, not system language.
    expect(html).not.toContain('表达额度：0')
    expect(html).not.toContain('确认表达并结算')
  })

  it('卡牌给出当前环境下的存活增量与固化进度', async () => {
    const state = createRun('ui-smoke', content)
    const html = await render(state)
    expect(html).toMatch(/选择后预计多存活|对当前种群影响有限/)
    expect(html).toContain('固化进度')
    expect(html).toContain('详细数值')
    expect(html).toContain('再表达')
  })

  it('选择后预测与原因同步更新', async () => {
    const state = createRun('ui-smoke', content)
    const first = state.hand[0]
    const selected = act(state, { type: 'toggle-card', cardId: first }, content)
    const html = await render(selected)
    expect(html).toContain('已选择')
    expect(html).toContain('本方案中保住')
    expect(html).toContain('已选 1 / 3 点')
    expect(html).toContain('按当前选择的下一代种群')
  })

  it('结算阶段显示固化进度与进入下一代的动作', async () => {
    const html = await render(await settlePhase())
    expect(html).toContain('自然选择')
    expect(html).toContain('剩余永久槽位')
    expect(html).toContain('第 1 代结算')
    expect(html).toContain('适应并进入第 2 代')
    expect(html).toContain('演化历史')
    expect(html).toContain('基因库')
    expect(html).toContain('规则与计算说明')
    // 结算后不再宣称"预计下一代"，改说本代结果。
    expect(html).toContain('本代结果')
    expect(html).not.toContain('预计下一代')
    expect(html).toContain('存活率')
  })

  it('固化达成时给出明确的固化入口，固化后显示物种身份', async () => {
    const settled = await settlePhase()
    const withProgress: RunState = {
      ...settled,
      expressionCounts: { ...settled.expressionCounts, burrow: content.rules.fixationThreshold },
    }
    const ready = await render(withProgress)
    expect(ready).toContain('固化进度已达成')
    expect(ready).toContain('固化为「穴居性」')
    expect(ready).toContain('剩余永久槽位 6 / 6')

    const fixed = act(withProgress, { type: 'fix-trait', traitId: 'burrow' }, content)
    const html = await render(fixed)
    expect(html).toContain('穴居性')
    expect(html).toContain('穴居动物')
    expect(html).toContain('一种穴居的动物。')
    expect(html).toContain('第 1 代固化')
    expect(html).not.toContain('尚未形成稳定特征')
  })

  it('结算后用"再表达几代"说明固化进度', async () => {
    const base = createRun('ui-smoke', content)
    const card = base.cards.find((entry) => base.hand.includes(entry.id))!
    const chosen = act(base, { type: 'toggle-card', cardId: card.id }, content)
    const settled = act(chosen, { type: 'commit-generation' }, content)
    expect(settled.expressionCounts[card.traitId]).toBe(1)
    const html = await render(settled)
    expect(html).toContain(content.traits[card.traitId]!.name)
    expect(html).toContain('再表达 4 代即可成为永久性状')
    expect(html).toContain('本代成功表达的性状累计了一次固化进度')
  })

  it('终局与演化选择阶段都能渲染', async () => {
    const settled = await settlePhase()
    const evolution = act({ ...settled, generation: 2 }, { type: 'continue' }, content)
    expect(evolution.phase).toBe('evolution')
    const choiceHtml = await render(evolution)
    expect(choiceHtml).toContain('演化选择')
    expect(choiceHtml).toContain('跳过，直接进入下一代')

    const ended: RunState = { ...settled, phase: 'ended', outcome: 'extinct', population: 0 }
    const endedHtml = await render(ended)
    expect(endedHtml).toContain('这条谱系，停在了这里。')
    expect(endedHtml).toContain('返回首页，开始新谱系')
  })

  it('极端局面：濒危选择给出风险按钮，无手牌时给出人话提示', async () => {
    const state = createRun('ui-smoke', content)
    state.population = 60
    state.environment.pressures = { food: 10, temperature: 8, predation: 6 }
    const html = await render(state)
    expect(html).toContain('冒险进入下一代')
    expect(html).toContain('⚠')
    expect(html).toContain('种群濒临灭绝')

    const empty: RunState = { ...state, hand: [], cards: [], selectedCardIds: [] }
    const emptyHtml = await render(empty)
    expect(emptyHtml).toContain('基因库暂时为空')
    expect(emptyHtml).toContain('本代尚未选择性状')
  })

  it('遗传性：先选牌再取消，预测回到基线', async () => {
    const state = createRun('ui-smoke', content)
    const cardId = state.hand[0]!
    const on = act(state, { type: 'toggle-card', cardId }, content)
    const off = act(on, { type: 'toggle-card', cardId }, content)
    expect(off.selectedCardIds).toEqual([])
    const before = await render(state)
    const after = await render(off)
    expect(before).toBe(after)
  })
})
