import type { GameState, ResourceId } from './State/GameState'
import { starterState } from './State/Defaults'
import { load, save, wipe } from './Save/Storage'
import { tick } from './Sim/Tick'
import { renderApp, renderOverlays, installGlobalKeyboard } from './UI/Render'
import { pruneToasts, pushToast, resetUi, ui } from './UI/UiState'
import { recomputeCaps } from './State/Reducers'
import { playSfx } from './UI/Audio'

let state: GameState = load() ?? starterState()
recomputeCaps(state)
state.lastSaveTimestamp = Date.now()

const seenMilestones = new Set<string>(state.milestones)
let lastLogLen = state.eventLog.length
let lastShortage: Record<ResourceId, boolean> = { power: false, water: false, food: false }
let ticksSinceSave = 0
save(state)

const ctx = {
  state,
  save: () => save(state),
  reset: resetGame,
  render: requestRender,
}

let appDirty = true
let overlaysDirty = true
let rafScheduled = false
function requestRender(): void {
  appDirty = true
  overlaysDirty = true
  schedule()
}
function requestAppRender(): void {
  appDirty = true
  schedule()
}
function schedule(): void {
  if (rafScheduled) return
  rafScheduled = true
  requestAnimationFrame(() => {
    rafScheduled = false
    if (appDirty) {
      renderApp(ctx)
      appDirty = false
    }
    if (overlaysDirty) {
      renderOverlays(ctx)
      overlaysDirty = false
    }
  })
}

function resetGame(): void {
  playSfx('demolish')
  wipe()
  state = starterState()
  recomputeCaps(state)
  save(state)
  ctx.state = state
  seenMilestones.clear()
  for (const m of state.milestones) seenMilestones.add(m)
  lastLogLen = state.eventLog.length
  lastShortage = { power: false, water: false, food: false }
  ticksSinceSave = 0
  resetUi()
  pushToast('milestone', 'NEW BUNKER', 'A fresh start.')
  requestRender()
}

const MILESTONE_LABELS: Record<string, string> = {
  first_birth: 'First birth',
  pop_10: 'Population reached 10',
  pop_25: 'Population reached 25',
  pop_50: 'Population reached 50',
  first_lv3: 'First Level-3 room',
  one_year: '1 in-game year survived',
}

let lastTick = performance.now()

function step(now: number): void {
  if (!document.hidden) {
    const elapsed = now - lastTick
    if (elapsed >= 1000) {
      const iterations = Math.min(5, Math.floor(elapsed / 1000))
      for (let i = 0; i < iterations; i++) {
        const result = tick(state)
        raiseShortageToasts(result.shortages)
        lastTick += 1000
        ticksSinceSave += 1
      }
      emitLogToasts()
      emitMilestoneToasts()
      if (ticksSinceSave >= 20) {
        save(state)
        ticksSinceSave = 0
      }
      requestAppRender()
    }
    if (pruneToasts()) {
      overlaysDirty = true
      schedule()
    }
  }
  requestAnimationFrame(step)
}

function emitMilestoneToasts(): void {
  for (const id of state.milestones) {
    if (seenMilestones.has(id)) continue
    seenMilestones.add(id)
    playSfx('milestone')
    pushToast('milestone', 'MILESTONE', MILESTONE_LABELS[id] ?? id)
  }
}

function emitLogToasts(): void {
  if (state.eventLog.length <= lastLogLen) {
    lastLogLen = state.eventLog.length
    return
  }
  const fresh = state.eventLog.slice(lastLogLen)
  for (const e of fresh) {
    if (e.severity === 'bad' && e.text.startsWith('FIRE')) {
      playSfx('fire')
      pushToast('bad', 'FIRE', e.text)
    } else if (e.severity === 'good' && e.text.includes('gave birth')) {
      playSfx('birth')
      pushToast('milestone', 'NEW DWELLER', e.text)
    } else if (e.severity === 'good' && e.text.includes('arrived at the entrance')) {
      playSfx('recruit')
      pushToast('info', 'RECRUIT', e.text)
    } else if (e.severity === 'bad' && e.text.includes('has died')) {
      playSfx('death')
      pushToast('bad', 'DEATH', e.text)
    }
  }
  lastLogLen = state.eventLog.length
}

function raiseShortageToasts(shortages: ResourceId[]): void {
  const cur: Record<ResourceId, boolean> = { power: false, water: false, food: false }
  for (const s of shortages) cur[s] = true
  for (const res of ['water', 'food'] as ResourceId[]) {
    if (cur[res] && !lastShortage[res]) {
      playSfx('shortage')
      pushToast('bad', 'SHORTAGE', `${res.toUpperCase()} has run out!`)
    }
  }
  lastShortage = cur
}

installGlobalKeyboard(key => {
  if (key === 'Escape') {
    if (ui.assignMenu) {
      ui.assignMenu = null
      overlaysDirty = true
      schedule()
    } else if (ui.modal) {
      ui.modal = null
      overlaysDirty = true
      schedule()
    } else if (ui.expandedRoomId) {
      ui.expandedRoomId = null
      requestAppRender()
    }
  }
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save(state)
  } else {
    lastTick = performance.now()
    state.lastSaveTimestamp = Date.now()
  }
})

window.addEventListener('beforeunload', () => save(state))

requestRender()
requestAnimationFrame(step)
