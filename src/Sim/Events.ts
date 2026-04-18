import type { GameState } from '../State/GameState'
import { ROOM_CATALOG } from '../Domain/Rooms'
import { rand, pick, uuid } from '../Domain/Rng'
import { pushLog } from '../State/Reducers'

export const FIRE_DURATION_TICKS = 30
export const FIRE_HP_ROOM_PER_TICK = 1.5
export const FIRE_HP_DWELLER_PER_TICK = 0.6

export function rollEventsOncePerMinute(state: GameState): void {
  if (state.tick % 60 !== 0 || state.tick === 0) return

  const eligible = state.rooms.filter(r => {
    const t = ROOM_CATALOG[r.typeId]
    const isHazardous = t.kind === 'production' || t.kind === 'currency' || t.kind === 'medbay'
    return isHazardous && r.assigned.length > 0 && !r.fireActive
  })
  if (eligible.length === 0) return

  if (rand(state) >= 0.04) return
  const target = pick(state, eligible)
  target.fireActive = true
  state.activeEvents.push({
    id: uuid(state),
    typeId: 'fire',
    roomId: target.id,
    startedTick: state.tick,
    ticksRemaining: FIRE_DURATION_TICKS,
  })
  pushLog(state, `FIRE in ${ROOM_CATALOG[target.typeId].name}!`, 'bad')
}

export function tickActiveEvents(state: GameState): void {
  if (state.activeEvents.length === 0) return
  const survivors = []
  for (const evt of state.activeEvents) {
    const room = state.rooms.find(r => r.id === evt.roomId)
    if (!room) continue
    if (evt.typeId === 'fire') {
      room.hp = Math.max(0, room.hp - FIRE_HP_ROOM_PER_TICK)
      for (const dId of room.assigned) {
        const d = state.dwellers.find(x => x.id === dId)
        if (!d) continue
        const defense = d.stats.end + d.stats.str
        const dmg = FIRE_HP_DWELLER_PER_TICK * (11 / (defense + 6))
        d.hp = Math.max(0, d.hp - dmg)
      }
    }
    evt.ticksRemaining -= 1
    if (evt.ticksRemaining <= 0) {
      room.fireActive = false
      pushLog(state, `Fire contained in ${ROOM_CATALOG[room.typeId].name}.`, 'good')
    } else {
      survivors.push(evt)
    }
  }
  state.activeEvents = survivors
}
