import type { GameState, ResourceId, StatId } from '../State/GameState'
import {
  FOOD_PER_TICK,
  POWER_PER_TICK,
  WATER_PER_TICK,
  XP_PER_TICK,
  XP_TO_STAT,
  OFFLINE_CAP_MS,
  TICKS_PER_DAY,
  CHILD_TO_ADULT_DAYS,
  PREGNANCY_TICKS,
} from '../State/GameState'
import { ROOM_CATALOG } from '../Domain/Rooms'
import { inheritedStats, generateName, makeDweller } from '../Domain/Dwellers'
import { pushLog, housingCap } from '../State/Reducers'

export interface OfflineSummary {
  elapsedMs: number
  ticks: number
  births: number
  gains: Partial<Record<ResourceId, number>>
  capsGain: number
}

export function runOfflineCatchup(state: GameState): OfflineSummary | null {
  const now = Date.now()
  const elapsedMs = Math.min(now - state.lastSaveTimestamp, OFFLINE_CAP_MS)
  if (elapsedMs < 5000) {
    state.lastSaveTimestamp = now
    return null
  }
  const ticks = Math.floor(elapsedMs / 1000)
  const summary: OfflineSummary = { elapsedMs, ticks, births: 0, gains: {}, capsGain: 0 }

  const n = state.dwellers.length
  const prod: Record<ResourceId, number> = { power: 0, water: 0, food: 0 }
  let capsPerTick = 0

  for (const room of state.rooms) {
    if (room.assigned.length === 0) continue
    if (room.hp <= 0) continue
    const type = ROOM_CATALOG[room.typeId]
    if (!type.produces) continue
    const affStat = type.affinity
    const aff = affStat
      ? room.assigned.reduce((s: number, id) => {
          const d = state.dwellers.find(x => x.id === id)
          return s + (d ? d.stats[affStat] : 0)
        }, 0)
      : room.assigned.length * 5
    const amt = type.baseProduction * room.level * aff
    if (type.produces === 'caps') capsPerTick += amt
    else prod[type.produces] += amt
  }

  const consumption: Record<ResourceId, number> = {
    power: n * POWER_PER_TICK,
    water: n * WATER_PER_TICK,
    food: n * FOOD_PER_TICK,
  }

  for (const res of ['power', 'water', 'food'] as ResourceId[]) {
    const net = (prod[res] - consumption[res]) * ticks
    const before = state.resources[res]
    state.resources[res] = clamp(before + net, 0, state.resourceCaps[res])
    const gain = state.resources[res] - before
    if (gain !== 0) summary.gains[res] = gain
  }

  const capsGain = capsPerTick * ticks
  state.caps += capsGain
  summary.capsGain = capsGain

  for (const room of state.rooms) {
    const type = ROOM_CATALOG[room.typeId]
    let target: StatId | null = null
    if (type.kind === 'training' && type.trainsStat) target = type.trainsStat
    else if (type.affinity && (type.produces || type.kind === 'medbay' || type.kind === 'radio')) {
      target = type.affinity
    }
    if (!target) continue
    for (const id of room.assigned) {
      const d = state.dwellers.find(x => x.id === id)
      if (!d || d.stats[target] >= 10) continue
      d.xp[target] += XP_PER_TICK * room.level * ticks
      while (d.xp[target] >= XP_TO_STAT && d.stats[target] < 10) {
        d.xp[target] -= XP_TO_STAT
        d.stats[target] += 1
      }
    }
  }

  const remaining = []
  for (const p of state.pregnancies) {
    p.ticksRemaining -= ticks
    if (p.ticksRemaining <= 0) {
      const mom = state.dwellers.find(d => d.id === p.motherId)
      const dad = state.dwellers.find(d => d.id === p.fatherId)
      if (mom && dad && state.dwellers.length < housingCap(state)) {
        const child = makeDweller(state, {
          name: generateName(state),
          stats: inheritedStats(state, mom, dad),
          isChild: true,
          ageDays: 0,
          status: 'idle',
        })
        state.dwellers.push(child)
        mom.status = 'idle'
        summary.births += 1
      }
    } else {
      remaining.push(p)
    }
  }
  state.pregnancies = remaining
  if (state.pregnancies.length === 0) {
    for (const d of state.dwellers) if (d.status === 'pregnant') d.status = 'idle'
  }

  const daysPassed = Math.floor(ticks / TICKS_PER_DAY)
  if (daysPassed > 0) {
    for (const d of state.dwellers) {
      d.ageDays += daysPassed
      if (d.isChild && d.ageDays >= CHILD_TO_ADULT_DAYS) d.isChild = false
    }
  }

  const happyDrift = summary.gains.food === undefined ? 0 : -1
  for (const d of state.dwellers) {
    d.happiness = clamp(d.happiness + happyDrift, 0, 100)
  }

  state.tick += ticks
  state.lastSaveTimestamp = now

  const mins = Math.round(elapsedMs / 60000)
  const parts: string[] = []
  for (const res of ['power', 'water', 'food'] as ResourceId[]) {
    if ((summary.gains[res] ?? 0) !== 0) {
      const g = Math.round(summary.gains[res]!)
      parts.push(`${g >= 0 ? '+' : ''}${g} ${res}`)
    }
  }
  if (capsGain > 0) parts.push(`+${Math.round(capsGain)} caps`)
  if (summary.births > 0) parts.push(`${summary.births} birth${summary.births > 1 ? 's' : ''}`)
  const text = `Welcome back — ${mins} min away. ${parts.join(', ') || 'Nothing changed.'}`
  pushLog(state, text, 'good')

  void PREGNANCY_TICKS
  return summary
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
