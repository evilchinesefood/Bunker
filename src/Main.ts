import type { GameState, ResourceId } from './State/GameState'
import { starterState } from './State/Defaults'
import { load, save, wipe } from './Save/Storage'
import { tick } from './Sim/Tick'
import { runOfflineCatchup, type OfflineSummary } from './Sim/Offline'
import { render, installGlobalKeyboard } from './UI/Render'
import { pruneToasts, pushToast, resetUi, ui } from './UI/UiState'
import { recomputeCaps } from './State/Reducers'

let state: GameState = load() ?? starterState()
recomputeCaps(state)

const seenMilestones = new Set<string>(state.milestones)
let lastLogLen = state.eventLog.length
let lastShortage: Record<ResourceId, boolean> = { power: false, water: false, food: false }
let ticksSinceSave = 0

const bootSummary = runOfflineCatchup(state)
emitWelcomeBack(bootSummary)
lastLogLen = state.eventLog.length
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
      requestRender()
    }
    if (pruneToasts()) requestRender()
  }
  requestAnimationFrame(step)
}

function emitWelcomeBack(summary: OfflineSummary | null): void {
  if (!summary) return
  const mins = Math.round(summary.elapsedMs / 60000)
  const parts: string[] = []
  for (const r of ['power', 'water', 'food'] as ResourceId[]) {
    const g = summary.gains[r]
    if (g) parts.push(`${g >= 0 ? '+' : ''}${Math.round(g)} ${r}`)
  }
  if (summary.capsGain > 0) parts.push(`+${Math.round(summary.capsGain)} caps`)
  if (summary.births) parts.push(`${summary.births} birth${summary.births > 1 ? 's' : ''}`)
  if (summary.deaths) parts.push(`${summary.deaths} death${summary.deaths > 1 ? 's' : ''}`)
  const body = `${mins} min away. ${parts.join(', ') || 'Nothing changed.'}`
  pushToast(summary.deaths > 0 ? 'bad' : 'milestone', 'WELCOME BACK', body)
}

function emitMilestoneToasts(): void {
  for (const id of state.milestones) {
    if (seenMilestones.has(id)) continue
    seenMilestones.add(id)
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
  for (const res of ['water', 'food'] as ResourceId[]) {
    if (cur[res] && !lastShortage[res]) {
      pushToast('bad', 'SHORTAGE', `${res.toUpperCase()} has run out!`)
    }
  }
  lastShortage = cur
}

installGlobalKeyboard(key => {
  if (key === 'Escape') {
    if (ui.assignMenu) {
      ui.assignMenu = null
      requestRender()
    } else if (ui.modal) {
      ui.modal = null
      requestRender()
    } else if (ui.expandedRoomId) {
      ui.expandedRoomId = null
      requestRender()
    }
  }
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save(state)
  } else {
    const s2 = runOfflineCatchup(state)
    if (s2) {
      emitWelcomeBack(s2)
      lastTick = performance.now()
      lastLogLen = state.eventLog.length
      requestRender()
    }
  }
})

window.addEventListener('beforeunload', () => save(state))

requestRender()
requestAnimationFrame(step)
