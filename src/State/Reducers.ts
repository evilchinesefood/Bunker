import type { GameState, Room, ResourceId } from './GameState'
import { MAX_LOG } from './GameState'
import { ROOM_CATALOG, slotsAtLevel, upgradeCost } from '../Domain/Rooms'
import { uuid } from '../Domain/Rng'

export function recomputeCaps(state: GameState): void {
  const base: Record<ResourceId, number> = { power: 100, water: 100, food: 100 }
  for (const room of state.rooms) {
    const type = ROOM_CATALOG[room.typeId]
    for (const [res, per] of Object.entries(type.capBoostPerLevel)) {
      base[res as ResourceId] += (per ?? 0) * (room.level - 1)
    }
  }
  state.resourceCaps = base
  for (const res of ['power', 'water', 'food'] as ResourceId[]) {
    state.resources[res] = Math.min(state.resources[res], base[res])
  }
}

export function housingCap(state: GameState): number {
  let total = 0
  for (const room of state.rooms) {
    if (ROOM_CATALOG[room.typeId].kind === 'housing') {
      total += slotsAtLevel(ROOM_CATALOG[room.typeId], room.level)
    }
  }
  return total
}

export function unassignDweller(state: GameState, dwellerId: string): void {
  const d = state.dwellers.find(x => x.id === dwellerId)
  if (!d) return
  if (d.location) {
    const r = state.rooms.find(x => x.id === d.location)
    if (r) r.assigned = r.assigned.filter(id => id !== dwellerId)
  }
  d.location = null
  if (d.status === 'working' || d.status === 'training') d.status = 'idle'
}

export function assignDweller(state: GameState, dwellerId: string, roomId: string): boolean {
  const d = state.dwellers.find(x => x.id === dwellerId)
  const r = state.rooms.find(x => x.id === roomId)
  if (!d || !r) return false
  if (d.isChild) return false
  if (d.status === 'pregnant') return false
  const rt = ROOM_CATALOG[r.typeId]
  const cap = slotsAtLevel(rt, r.level)
  if (r.assigned.length >= cap) return false
  unassignDweller(state, dwellerId)
  r.assigned.push(dwellerId)
  d.location = roomId
  if (rt.kind === 'training') d.status = 'training'
  else if (rt.kind === 'housing' || rt.kind === 'lounge') d.status = 'idle'
  else d.status = 'working'
  return true
}

export function buildRoom(state: GameState, typeId: string): Room | null {
  const type = ROOM_CATALOG[typeId]
  if (!type) return null
  if (state.caps < type.baseCost) return null
  state.caps -= type.baseCost
  const room: Room = {
    id: uuid(state),
    typeId,
    level: 1,
    assigned: [],
    hp: 100,
    fireActive: false,
  }
  state.rooms.push(room)
  recomputeCaps(state)
  return room
}

export function upgradeRoom(state: GameState, roomId: string): boolean {
  const r = state.rooms.find(x => x.id === roomId)
  if (!r) return false
  if (r.level >= 3) return false
  const type = ROOM_CATALOG[r.typeId]
  const cost = upgradeCost(type, r.level)
  if (state.caps < cost) return false
  state.caps -= cost
  r.level = (r.level + 1) as 1 | 2 | 3
  recomputeCaps(state)
  return true
}

export function demolishRoom(state: GameState, roomId: string): boolean {
  const r = state.rooms.find(x => x.id === roomId)
  if (!r) return false
  const type = ROOM_CATALOG[r.typeId]
  let spent = type.baseCost
  for (let l = 1; l < r.level; l++) spent += upgradeCost(type, l as 1 | 2 | 3)
  const refund = Math.round(spent * type.demolishRefundPct)
  for (const id of r.assigned) {
    const d = state.dwellers.find(x => x.id === id)
    if (d) {
      d.location = null
      d.status = 'idle'
    }
  }
  state.rooms = state.rooms.filter(x => x.id !== roomId)
  state.caps += refund
  recomputeCaps(state)
  return true
}

export function pushLog(
  state: GameState,
  text: string,
  severity: 'info' | 'warn' | 'bad' | 'good' = 'info',
): void {
  state.eventLog.push({ tick: state.tick, text, severity })
  if (state.eventLog.length > MAX_LOG) {
    state.eventLog.splice(0, state.eventLog.length - MAX_LOG)
  }
}
