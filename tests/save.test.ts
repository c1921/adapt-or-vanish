import { describe, expect, it } from 'vitest'
import { content } from '../src/game/content'
import { createRun, previewGeneration } from '../src/game/engine'
import { decodeRun, encodeRun, loadRun, saveRun, type StoragePort } from '../src/persistence/save'
import { act, simulate } from './helpers'

describe('本地存档', () => {
  it('完整单局每一步都可恢复，保留手牌、选牌、奖励、随机数及之后的全部结果', () => {
    for (const strategy of ['shelter', 'fertility'] as const) {
      const seed = `${strategy}-01`
      const replay = simulate(seed, strategy)
      let state = createRun(seed, content)
      for (const action of replay.actions) {
        state = act(state, action)
        const restored = decodeRun(encodeRun(state, content), content)
        expect(restored, `${state.phase} / ${state.generation}`).toEqual(state)
        if (!restored) throw new Error('Restore failed')
        if (state.phase === 'adaptation')
          expect(previewGeneration(restored, content)).toEqual(previewGeneration(state, content))
        state = restored
      }
      expect(state).toEqual(replay.state)
    }
  })
  it('拒绝 JSON 损坏、旧版本、缺失字段及未知 ID、重复牌区、非法阶段', () => {
    const encoded = encodeRun(createRun('save', content), content)
    expect(decodeRun('{oops', content)).toBeNull()
    const variants = [
      (value: any) => {
        value.version = 2
      },
      (value: any) => {
        value.contentVersion = 'old'
      },
      (value: any) => {
        delete value.state.environment
      },
      (value: any) => {
        value.state.cards[0].traitId = 'unknown'
      },
      (value: any) => {
        value.state.drawPile.push(value.state.hand[0])
      },
      (value: any) => {
        value.state.phase = 'ended'
      },
      (value: any) => {
        value.state.selectedCardIds = ['unknown']
      },
      (value: any) => {
        value.state.rngState = -1
      },
      (value: any) => {
        value.state.environment.pressures.food = 100
      },
    ]
    for (const corrupt of variants) {
      const value = JSON.parse(encoded)
      corrupt(value)
      expect(decodeRun(JSON.stringify(value), content)).toBeNull()
    }
  })
  it('存储不可用、配额用尽和存档损坏均返回提示，不抛异常或删除原数据', () => {
    const unavailable: StoragePort = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(loadRun(unavailable, content).notice).toContain('无法读取')
    const state = createRun('save', content)
    const before = structuredClone(state)
    expect(saveRun(unavailable, state, content)).toContain('自动保存失败')
    expect(state).toEqual(before)
    let saved = '{corrupt'
    const storage: StoragePort = {
      getItem: () => saved,
      setItem: (_, value) => {
        saved = value
      },
    }
    expect(loadRun(storage, content).notice).toContain('损坏')
    expect(saved).toBe('{corrupt')
    expect(saveRun(storage, state, content)).toBe('')
    expect(loadRun(storage, content)).toEqual({ state, notice: '' })
  })
})
