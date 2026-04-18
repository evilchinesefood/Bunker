import { CURRENT_VERSION, type GameState } from './GameState'
import { ROOM_CATALOG } from '../Domain/Rooms'
import { makeDweller } from '../Domain/Dwellers'
import { uuid } from '../Domain/Rng'

export function starterState(): GameState {
  const now = Date.now()
  const state: GameState = {
    version: CURRENT_VERSION,
    tick: 0,
    lastSaveTimestamp: now,
    resources: { power: 50, water: 50, food: 50 },
    resourceCaps: { power: 100, water: 100, food: 100 },
    caps: 200,
    rooms: [],
    dwellers: [],
    pregnancies: [],
    activeEvents: [],
    eventLog: [
      {
        tick: 0,
        text: 'Bunker initialized. Welcome, Overseer.',
        severity: 'good',
      },
    ],
    milestones: [],
    rng: Math.floor(Math.random() * 0x7fffffff),
  }

  const makeRoom = (typeId: string) => ({
    id: uuid(state),
    typeId,
    level: 1 as const,
    assigned: [] as string[],
    hp: 100,
    fireActive: false,
  })

  state.rooms.push(makeRoom('power_plant'))
  state.rooms.push(makeRoom('water_treatment'))
  state.rooms.push(makeRoom('hydroponics'))
  state.rooms.push(makeRoom('quarters'))

  for (let i = 0; i < 5; i++) {
    state.dwellers.push(makeDweller(state))
  }

  const power = state.rooms.find(r => r.typeId === 'power_plant')!
  const water = state.rooms.find(r => r.typeId === 'water_treatment')!
  const food = state.rooms.find(r => r.typeId === 'hydroponics')!

  state.dwellers[0].location = power.id
  state.dwellers[0].status = 'working'
  power.assigned.push(state.dwellers[0].id)

  state.dwellers[1].location = water.id
  state.dwellers[1].status = 'working'
  water.assigned.push(state.dwellers[1].id)

  state.dwellers[2].location = food.id
  state.dwellers[2].status = 'working'
  food.assigned.push(state.dwellers[2].id)

  for (const id of [power.id, water.id, food.id]) {
    const rt = ROOM_CATALOG[state.rooms.find(r => r.id === id)!.typeId]
    for (const [res, boost] of Object.entries(rt.capBoostPerLevel)) {
      state.resourceCaps[res as 'power' | 'water' | 'food'] = 100 + (boost ?? 0) * 0
    }
  }

  return state
}
