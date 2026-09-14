import { computed, ref, shallowRef } from 'vue'
import { content } from '../game/content'
import {
  createRun,
  fixableTraits,
  previewGeneration,
  reduceGame,
  validateContent,
} from '../game/engine'
import type { GameAction, RunState } from '../game/types'
import { loadRun, saveRun, type StoragePort } from '../persistence/save'
import { createActionGate } from '../game/ui'

export function useGame() {
  const gate = createActionGate()
  const errors = validateContent(content)
  if (errors.length) throw new Error(errors.join('\n'))
  let storage: StoragePort | null = null
  const notice = ref('')
  try {
    storage = window.localStorage
  } catch {
    notice.value = '浏览器不允许本地存储。本局仍可游玩，刷新会丢失进度。'
  }
  const loaded = storage ? loadRun(storage, content) : null
  if (loaded?.notice) notice.value = loaded.notice
  // Shallow refs keep serializable engine snapshots free of Vue Proxy objects.
  const state = shallowRef<RunState | null>(loaded?.state ?? null)
  const playing = ref(false)
  const actionError = ref('')
  const preview = computed(() =>
    state.value?.phase === 'adaptation' ? previewGeneration(state.value, content) : null,
  )
  const fixable = computed(() => (state.value ? fixableTraits(state.value, content) : []))

  function persist() {
    if (storage && state.value) notice.value = saveRun(storage, state.value, content)
  }
  function start(seed: string) {
    gate.reset()
    const randomSeed = `EV-${crypto.getRandomValues(new Uint32Array(1))[0]!.toString(36).toUpperCase()}`
    state.value = createRun(seed || randomSeed, content)
    playing.value = true
    actionError.value = ''
    persist()
  }
  function dispatch(action: GameAction) {
    if (!state.value || !gate.accept(action)) return
    const result = reduceGame(state.value, action, content)
    actionError.value = result.error ?? ''
    if (!result.error) {
      state.value = result.state
      persist()
    }
  }
  function resume() {
    playing.value = true
    actionError.value = ''
  }
  function home() {
    playing.value = false
    actionError.value = ''
  }
  return { state, playing, actionError, notice, preview, fixable, start, dispatch, resume, home }
}
