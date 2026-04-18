import type { GameState, ResourceId, StatId, Dweller, Room } from '../State/GameState'
import {
  CHILD_TO_ADULT_DAYS,
  FOOD_PER_TICK,
  SHORTAGE_GRACE_TICKS,
  TICKS_PER_DAY,
  WATER_PER_TICK,
  XP_PER_TICK,
  XP_TO_STAT,
} from '../State/GameState'
import { ROOM_CATALOG } from '../Domain/Rooms'
import { pushLog } from '../State/Reducers'
import { rollEventsOncePerMinute, tickActiveEvents } from './Events'
import { advancePregnancies, tryPairingAndConceive, rollRecruit } from './Pregnancy'

export interface TickResult {
  shortages: ResourceId[]
  deaths: string[]
  levelUps: Array<{ dwellerId: string; stat: StatId }>
}

const SHORTAGE_HP_LOSS_PER_TICK = 0.15
const SHORTAGE_HAPPY_LOSS_PER_TICK = 0.4
const BAR_HAPPY_BONUS = 0.15
const LOUNGE_HAPPY_BONUS = 0.25
const MEDBAY_HEAL_PER_TICK = 0.6

const shortageStart: Record<ResourceId, number | null> = { power: null, water: null, food: null }

function buildMaps(state: GameState) {
  const dwellerById = new Map<string, Dweller>()
  for (const d of state.dwellers) dwellerById.set(d.id, d)
  const roomById = new Map<string, Room>()
  for (const r of state.rooms) roomById.set(r.id, r)
  return { dwellerById, roomById }
}

export function tick(state: GameState): TickResult {
  const result: TickResult = { shortages: [], deaths: [], levelUps: [] }
  state.tick += 1
  const maps = buildMaps(state)

  production(state, maps.dwellerById)
  const shortages = consumption(state)
  result.shortages = shortages
  needDecay(state, shortages, result, maps.dwellerById, maps.roomById)
  statTraining(state, maps.dwellerById, result)
  advancePregnancies(state, maps.dwellerById)
  tryPairingAndConceive(state, maps.dwellerById)
  aging(state)
  tickActiveEvents(state, maps.dwellerById, maps.roomById)
  rollEventsOncePerMinute(state)
  rollRecruit(state)
  checkMilestones(state)

  return result
}

function production(state: GameState, dwellerById: Map<string, Dweller>): void {
  for (const room of state.rooms) {
    if (room.assigned.length === 0 || room.hp <= 0) continue
    const type = ROOM_CATALOG[room.typeId]
    if (!type.produces) continue

    const aff = type.affinity
    let sum = 0
    if (aff) {
      for (const id of room.assigned) {
        const d = dwellerById.get(id)
        if (d) sum += d.stats[aff]
      }
    } else {
      sum = room.assigned.length * 5
    }
    const avg = sum / room.assigned.length
    const produced = type.baseProduction * room.level * avg * room.assigned.length
    if (type.produces === 'caps') {
      state.caps += produced
    } else {
      const res = type.produces
      state.resources[res] = Math.min(state.resourceCaps[res], state.resources[res] + produced)
    }
  }

  for (const room of state.rooms) {
    const type = ROOM_CATALOG[room.typeId]
    if (type.kind !== 'medbay' || room.assigned.length === 0) continue
    const docs: Dweller[] = []
    for (const id of room.assigned) {
      const d = dwellerById.get(id)
      if (d) docs.push(d)
    }
    const heal = MEDBAY_HEAL_PER_TICK * room.level
    const bonus = docs.reduce((s, dr) => s + dr.stats.int, 0) / 10
    for (const d of state.dwellers) {
      if (d.hp >= 100) continue
      if (d.hp > 60 && docs.length === 0) continue
      d.hp = Math.min(100, d.hp + heal + bonus * 0.05)
    }
  }
}

function consumption(state: GameState): ResourceId[] {
  const n = state.dwellers.length
  state.resources.food = Math.max(0, state.resources.food - n * FOOD_PER_TICK)
  state.resources.water = Math.max(0, state.resources.water - n * WATER_PER_TICK)
  const out: ResourceId[] = []
  if (state.resources.food <= 0) out.push('food')
  if (state.resources.water <= 0) out.push('water')
  return out
}

function needDecay(
  state: GameState,
  shortages: ResourceId[],
  result: TickResult,
  dwellerById: Map<string, Dweller>,
  roomById: Map<string, Room>,
): void {
  for (const res of ['power', 'water', 'food'] as ResourceId[]) {
    const hit = shortages.includes(res)
    if (hit && shortageStart[res] === null) shortageStart[res] = state.tick
    if (!hit) shortageStart[res] = null
  }
  let penaltyFactor = 0
  for (const res of shortages) {
    const start = shortageStart[res]
    if (start !== null && state.tick - start >= SHORTAGE_GRACE_TICKS) penaltyFactor += 1
  }
  const happyPressure = shortages.length

  for (const d of state.dwellers) {
    let happyChange = 0
    let hpChange = 0

    if (happyPressure > 0) happyChange -= SHORTAGE_HAPPY_LOSS_PER_TICK * happyPressure
    if (penaltyFactor > 0) {
      hpChange -= SHORTAGE_HP_LOSS_PER_TICK * penaltyFactor * (11 - d.stats.end) * 0.1
    }

    if (d.location) {
      const r = roomById.get(d.location)
      if (r) {
        const t = ROOM_CATALOG[r.typeId]
        if (t.id === 'bar') happyChange += BAR_HAPPY_BONUS
        if (t.id === 'lounge') happyChange += LOUNGE_HAPPY_BONUS
      }
    } else if (happyPressure === 0) {
      happyChange += 0.04
    }

    d.happiness = clamp(d.happiness + happyChange, 0, 100)
    d.hp = clamp(d.hp + hpChange, 0, 100)

    if (d.hp <= 0) {
      result.deaths.push(d.id)
      pushLog(state, `${d.name} has died.`, 'bad')
      if (d.partnerId) {
        const partner = dwellerById.get(d.partnerId)
        if (partner) partner.partnerId = null
      }
      if (d.location) {
        const r = roomById.get(d.location)
        if (r) r.assigned = r.assigned.filter(id => id !== d.id)
      }
    }
  }

  if (result.deaths.length) {
    const dead = new Set(result.deaths)
    state.dwellers = state.dwellers.filter(x => !dead.has(x.id))
    state.pregnancies = state.pregnancies.filter(
      p => !dead.has(p.motherId) && !dead.has(p.fatherId),
    )
  }
}

function statTraining(
  state: GameState,
  dwellerById: Map<string, Dweller>,
  result: TickResult,
): void {
  for (const room of state.rooms) {
    const type = ROOM_CATALOG[room.typeId]
    let target: StatId | null = null
    if (type.kind === 'training' && type.trainsStat) target = type.trainsStat
    else if (type.affinity && (type.produces || type.kind === 'medbay' || type.kind === 'radio')) {
      target = type.affinity
    }
    if (!target) continue
    for (const id of room.assigned) {
      const d = dwellerById.get(id)
      if (!d || d.stats[target] >= 10) continue
      d.xp[target] += XP_PER_TICK * room.level
      if (d.xp[target] >= XP_TO_STAT) {
        d.xp[target] -= XP_TO_STAT
        d.stats[target] += 1
        result.levelUps.push({ dwellerId: d.id, stat: target })
        pushLog(state, `${d.name}'s ${target.toUpperCase()} is now ${d.stats[target]}.`, 'good')
      }
    }
  }
}

function aging(state: GameState): void {
  if (state.tick % TICKS_PER_DAY !== 0) return
  for (const d of state.dwellers) {
    d.ageDays += 1
    if (d.isChild && d.ageDays >= CHILD_TO_ADULT_DAYS) {
      d.isChild = false
      pushLog(state, `${d.name} grew up.`, 'good')
    }
  }
}

function checkMilestones(state: GameState): void {
  const pop = state.dwellers.length
  const ms = [
    { id: 'pop_10', cond: pop >= 10, text: 'Milestone: population reached 10.' },
    { id: 'pop_25', cond: pop >= 25, text: 'Milestone: population reached 25.' },
    { id: 'pop_50', cond: pop >= 50, text: 'Milestone: population reached 50.' },
    {
      id: 'first_lv3',
      cond: state.rooms.some(r => r.level === 3),
      text: 'Milestone: first Level 3 room.',
    },
    {
      id: 'one_year',
      cond: state.tick >= TICKS_PER_DAY * 365,
      text: 'Milestone: 1 in-game year survived.',
    },
  ]
  for (const m of ms) {
    if (m.cond && !state.milestones.includes(m.id)) {
      state.milestones.push(m.id)
      pushLog(state, m.text, 'good')
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
