import type { GameState, ResourceId } from './State/GameState'
import { starterState } from './State/Defaults'
import { load, save, wipe } from './Save/Storage'
import { tick } from './Sim/Tick'
import { runOfflineCatchup } from './Sim/Offline'
import { render } from './UI/Render'
import { pruneToasts, pushToast } from './UI/UiState'
import { recomputeCaps } from './State/Reducers'

let state: GameState = load() ?? starterState()
recomputeCaps(state)

const seenMilestones = new Set<string>(state.milestones)
let lastLogLen = state.eventLog.length
let lastShortage: Record<ResourceId, boolean> = { power: false, water: false, food: false }

const summary = runOfflineCatchup(state)
if (summary) {
  const last = state.eventLog[state.eventLog.length - 1]
  pushToast('milestone', 'WELCOME BACK', last?.text ?? 'Offline catch-up complete.')
  lastLogLen = state.eventLog.length
}
save(state)

let rafScheduled = false
function requestRender(): void {
  if (rafScheduled) return
  rafScheduled = true
  requestAnimationFrame(() => {
    rafScheduled = false
    render({
      state,
      save: () => save(state),
      reset: resetGame,
      render: requestRender,
    })
  })
}

function resetGame(): void {
  wipe()
  state = starterState()
  recomputeCaps(state)
  save(state)
  seenMilestones.clear()
  for (const m of state.milestones) seenMilestones.add(m)
  lastLogLen = state.eventLog.length
  lastShortage = { power: false, water: false, food: false }
  pushToast('milestone', 'NEW BUNKER', 'A fresh start.')
  requestRender()
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
      }
      emitLogToasts()
      emitMilestoneToasts()
      if (state.tick % 20 === 0) save(state)
      requestRender()
    }
    if (pruneToasts()) requestRender()
  }
  requestAnimationFrame(step)
}

function emitMilestoneToasts(): void {
  for (const id of state.milestones) {
    if (seenMilestones.has(id)) continue
    seenMilestones.add(id)
    const lbl = id.replace(/_/g, ' ').toUpperCase()
    pushToast('milestone', 'MILESTONE', lbl)
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
      pushToast('bad', 'FIRE', e.text)
    } else if (e.severity === 'good' && e.text.includes('gave birth')) {
      pushToast('milestone', 'NEW DWELLER', e.text)
    } else if (e.severity === 'good' && e.text.includes('arrived at the entrance')) {
      pushToast('info', 'RECRUIT', e.text)
    } else if (e.severity === 'bad' && e.text.includes('has died')) {
      pushToast('bad', 'DEATH', e.text)
    }
  }
  lastLogLen = state.eventLog.length
}

function raiseShortageToasts(shortages: ResourceId[]): void {
  const cur: Record<ResourceId, boolean> = { power: false, water: false, food: false }
  for (const s of shortages) cur[s] = true
  for (const res of ['power', 'water', 'food'] as ResourceId[]) {
    if (cur[res] && !lastShortage[res]) {
      pushToast('bad', 'SHORTAGE', `${res.toUpperCase()} has run out!`)
    }
  }
  lastShortage = cur
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save(state)
  } else {
    const s2 = runOfflineCatchup(state)
    if (s2) {
      const last = state.eventLog[state.eventLog.length - 1]
      pushToast('milestone', 'WELCOME BACK', last?.text ?? 'Offline catch-up complete.')
      lastTick = performance.now()
      lastLogLen = state.eventLog.length
      requestRender()
    }
  }
})

window.addEventListener('beforeunload', () => save(state))

requestRender()
requestAnimationFrame(step)
