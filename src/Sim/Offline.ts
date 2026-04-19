import type { GameState, ResourceId, StatId, Dweller } from '../State/GameState'
import {
  FOOD_PER_TICK,
  WATER_PER_TICK,
  XP_PER_TICK,
  XP_TO_STAT,
  OFFLINE_CAP_MS,
  OFFLINE_XP_DAMPING,
  TICKS_PER_DAY,
  CHILD_TO_ADULT_DAYS,
} from '../State/GameState'
import { ROOM_CATALOG, statContribution } from '../Domain/Rooms'
import { inheritedStats, generateName, makeDweller } from '../Domain/Dwellers'
import { pushLog } from '../State/Reducers'
import { populationCap } from './Pregnancy'
import { resolveOfflineFires } from './Events'

const OFFLINE_HP_PER_TICK = 0.15
const SHORTAGE_GRACE_TICKS = 30

export interface OfflineSummary {
  elapsedMs: number
  ticks: number
  births: number
  deaths: number
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
  const summary: OfflineSummary = {
    elapsedMs,
    ticks,
    births: 0,
    deaths: 0,
    gains: {},
    capsGain: 0,
  }

  const prod: Record<ResourceId, number> = { power: 0, water: 0, food: 0 }
  let capsPerTick = 0
  for (const room of state.rooms) {
    if (room.assigned.length === 0 || room.hp <= 0) continue
    const type = ROOM_CATALOG[room.typeId]
    if (!type.produces) continue
    let sum = 0
    for (const id of room.assigned) {
      const d = state.dwellers.find(x => x.id === id)
      if (d) sum += statContribution(d.stats, type.affinity)
    }
    const avg = sum / room.assigned.length
    const amt = type.baseProduction * room.level * avg * room.assigned.length
    if (type.produces === 'caps') capsPerTick += amt
    else prod[type.produces] += amt
  }

  const n = state.dwellers.length
  const cons: Record<ResourceId, number> = {
    power: 0,
    water: n * WATER_PER_TICK,
    food: n * FOOD_PER_TICK,
  }

  const shortageTicks: Record<ResourceId, number> = { power: 0, water: 0, food: 0 }
  for (const res of ['water', 'food'] as ResourceId[]) {
    const net = prod[res] - cons[res]
    let remaining = ticks
    let current = state.resources[res]
    const cap = state.resourceCaps[res]
    let runoutTicks = 0

    if (net >= 0) {
      const toCap = cap - current
      const ticksToFill = net > 0 ? Math.min(remaining, Math.floor(toCap / net)) : 0
      current += net * ticksToFill
      remaining -= ticksToFill
      current = Math.min(cap, current)
    } else {
      const ticksToEmpty = current / -net
      if (ticksToEmpty < remaining) {
        runoutTicks = remaining - Math.floor(ticksToEmpty)
        current = 0
      } else {
        current += net * remaining
        remaining = 0
      }
    }

    const before = state.resources[res]
    state.resources[res] = Math.max(0, Math.min(cap, current))
    const gain = state.resources[res] - before
    if (gain !== 0) summary.gains[res] = gain
    shortageTicks[res] = runoutTicks
  }

  {
    const res: ResourceId = 'power'
    const netPower = prod[res]
    const before = state.resources[res]
    state.resources[res] = Math.min(state.resourceCaps[res], before + netPower * ticks)
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
    else if (
      type.affinity &&
      type.affinity !== 'all' &&
      (type.produces || type.kind === 'medbay' || type.kind === 'radio')
    ) {
      target = type.affinity
    }
    if (!target) continue
    const gain = XP_PER_TICK * room.level * ticks * OFFLINE_XP_DAMPING
    for (const id of room.assigned) {
      const d = state.dwellers.find(x => x.id === id)
      if (!d || d.stats[target] >= 10) continue
      d.xp[target] += gain
      while (d.xp[target] >= XP_TO_STAT && d.stats[target] < 10) {
        d.xp[target] -= XP_TO_STAT
        d.stats[target] += 1
      }
    }
  }

  const maxShortageStream = Math.max(shortageTicks.water, shortageTicks.food)
  const penaltyTicks = Math.max(0, maxShortageStream - SHORTAGE_GRACE_TICKS)
  const toRemove: string[] = []
  for (const d of state.dwellers) {
    if (penaltyTicks > 0) {
      const shortageCount = (shortageTicks.water > 0 ? 1 : 0) + (shortageTicks.food > 0 ? 1 : 0)
      const hpLoss = OFFLINE_HP_PER_TICK * penaltyTicks * shortageCount * (11 - d.stats.end) * 0.1
      d.hp = clamp(d.hp - hpLoss, 0, 100)
      if (d.hp <= 0) {
        toRemove.push(d.id)
        pushLog(state, `${d.name} did not survive the shortage.`, 'bad')
        summary.deaths += 1
      }
    }
  }
  if (toRemove.length) {
    const dead = new Set(toRemove)
    for (const d of state.dwellers) {
      if (d.partnerId && dead.has(d.partnerId)) d.partnerId = null
    }
    for (const r of state.rooms) r.assigned = r.assigned.filter(id => !dead.has(id))
    state.dwellers = state.dwellers.filter(x => !dead.has(x.id))
    state.pregnancies = state.pregnancies.filter(
      p => !dead.has(p.motherId) && !dead.has(p.fatherId),
    )
  }

  const dById = new Map<string, Dweller>()
  for (const d of state.dwellers) dById.set(d.id, d)
  const remaining = []
  for (const p of state.pregnancies) {
    p.ticksRemaining -= ticks
    if (p.ticksRemaining <= 0) {
      const mom = dById.get(p.motherId)
      const dad = dById.get(p.fatherId)
      if (mom && dad && state.dwellers.length < populationCap(state)) {
        const child = makeDweller(state, {
          name: generateName(state),
          stats: inheritedStats(state, mom, dad),
          isChild: true,
          ageDays: 0,
          status: 'idle',
        })
        state.dwellers.push(child)
        dById.set(child.id, child)
        mom.status = 'idle'
        summary.births += 1
        if (!state.milestones.includes('first_birth')) {
          state.milestones.push('first_birth')
        }
      } else if (mom) {
        mom.status = 'idle'
      }
    } else {
      remaining.push(p)
    }
  }
  state.pregnancies = remaining
  if (state.pregnancies.length === 0) {
    for (const d of state.dwellers) if (d.status === 'pregnant') d.status = 'idle'
  }

  resolveOfflineFires(state, ticks)

  const daysPassed = Math.floor(ticks / TICKS_PER_DAY)
  if (daysPassed > 0) {
    for (const d of state.dwellers) {
      d.ageDays += daysPassed
      if (d.isChild && d.ageDays >= CHILD_TO_ADULT_DAYS) d.isChild = false
    }
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
  if (summary.deaths > 0) parts.push(`${summary.deaths} death${summary.deaths > 1 ? 's' : ''}`)
  const text = `Welcome back — ${mins} min away. ${parts.join(', ') || 'Nothing changed.'}`
  pushLog(state, text, summary.deaths > 0 ? 'bad' : 'good')

  return summary
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
