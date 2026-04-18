import type { GameState } from '../State/GameState'
import { CURRENT_VERSION } from '../State/GameState'

const KEY = 'bunkergame_save'

export function save(state: GameState): void {
  state.lastSaveTimestamp = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Save failed:', err)
  }
}

export function load(): GameState | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as GameState
    return migrate(parsed)
  } catch (err) {
    console.warn('Load failed:', err)
    return null
  }
}

export function wipe(): void {
  localStorage.removeItem(KEY)
}

function migrate(state: GameState): GameState {
  if (state.version === CURRENT_VERSION) return state
  state.version = CURRENT_VERSION
  return state
}
