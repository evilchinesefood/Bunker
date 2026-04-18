import { CURRENT_VERSION, type GameState } from './GameState'
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
    eventLog: [{ tick: 0, text: 'Bunker initialized. Welcome, Overseer.', severity: 'good' }],
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

  const power = makeRoom('power_plant')
  const water = makeRoom('water_treatment')
  const food = makeRoom('hydroponics')
  state.rooms.push(power, water, food, makeRoom('quarters'))

  for (let i = 0; i < 5; i++) {
    state.dwellers.push(makeDweller(state))
  }

  const [d0, d1, d2] = state.dwellers
  if (d0 && d1 && d2) {
    d0.location = power.id
    d0.status = 'working'
    power.assigned.push(d0.id)
    d1.location = water.id
    d1.status = 'working'
    water.assigned.push(d1.id)
    d2.location = food.id
    d2.status = 'working'
    food.assigned.push(d2.id)
  }

  return state
}
