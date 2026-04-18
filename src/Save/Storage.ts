import type { GameState, ResourceId } from '../State/GameState'
import { CURRENT_VERSION } from '../State/GameState'

const KEY = 'bunkergame_save'

export function save(state: GameState): void {
  state.lastSaveTimestamp = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Save failed:', err)
  }
}

export function load(): GameState | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const migrated = migrate(parsed)
    if (!migrated) return null
    return migrated
  } catch (err) {
    console.warn('Load failed:', err)
    return null
  }
}

export function wipe(): void {
  localStorage.removeItem(KEY)
}

type Migrator = (s: unknown) => unknown
const MIGRATIONS: Record<number, Migrator> = {}

function migrate(raw: unknown): GameState | null {
  let cur = raw as { version?: number } | null
  if (!cur || typeof cur !== 'object') return null
  let v = typeof cur.version === 'number' ? cur.version : 0
  while (v < CURRENT_VERSION) {
    const step = MIGRATIONS[v]
    if (!step) return null
    cur = step(cur) as typeof cur
    if (!cur) return null
    v += 1
    cur.version = v
  }
  return validate(cur)
}

function validate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const asNum = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def)
  const asInt = (v: unknown, def: number) => Math.floor(asNum(v, def))
  const asStr = (v: unknown, def: string) => (typeof v === 'string' ? v : def)
  const asArr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
  const clampN = (v: unknown, lo: number, hi: number, def: number) =>
    Math.max(lo, Math.min(hi, asNum(v, def)))

  const resObj = (o.resources ?? {}) as Record<string, unknown>
  const capObj = (o.resourceCaps ?? {}) as Record<string, unknown>

  const state: GameState = {
    version: asInt(o.version, CURRENT_VERSION),
    tick: asInt(o.tick, 0),
    lastSaveTimestamp: asNum(o.lastSaveTimestamp, Date.now()),
    resources: {
      power: asNum(resObj.power, 0),
      water: asNum(resObj.water, 0),
      food: asNum(resObj.food, 0),
    },
    resourceCaps: {
      power: asNum(capObj.power, 100),
      water: asNum(capObj.water, 100),
      food: asNum(capObj.food, 100),
    },
    caps: asNum(o.caps, 0),
    rooms: asArr<Record<string, unknown>>(o.rooms).map(r => ({
      id: asStr(r.id, ''),
      typeId: asStr(r.typeId, ''),
      level: clampN(r.level, 1, 3, 1) as 1 | 2 | 3,
      assigned: asArr<string>(r.assigned).filter(x => typeof x === 'string'),
      hp: clampN(r.hp, 0, 100, 100),
      fireActive: r.fireActive === true,
    })),
    dwellers: asArr<Record<string, unknown>>(o.dwellers).map(d => {
      const stats = (d.stats ?? {}) as Record<string, unknown>
      const xp = (d.xp ?? {}) as Record<string, unknown>
      return {
        id: asStr(d.id, ''),
        name: asStr(d.name, 'Unknown'),
        stats: {
          str: clampN(stats.str, 1, 10, 5),
          int: clampN(stats.int, 1, 10, 5),
          end: clampN(stats.end, 1, 10, 5),
          cha: clampN(stats.cha, 1, 10, 5),
        },
        xp: {
          str: asNum(xp.str, 0),
          int: asNum(xp.int, 0),
          end: asNum(xp.end, 0),
          cha: asNum(xp.cha, 0),
        },
        location: typeof d.location === 'string' ? d.location : null,
        hp: clampN(d.hp, 0, 100, 100),
        happiness: clampN(d.happiness, 0, 100, 50),
        status: asStr(d.status, 'idle') as GameState['dwellers'][number]['status'],
        partnerId: typeof d.partnerId === 'string' ? d.partnerId : null,
        ageDays: asInt(d.ageDays, 0),
        isChild: d.isChild === true,
      }
    }),
    pregnancies: asArr<Record<string, unknown>>(o.pregnancies).map(p => ({
      motherId: asStr(p.motherId, ''),
      fatherId: asStr(p.fatherId, ''),
      ticksRemaining: asInt(p.ticksRemaining, 0),
    })),
    activeEvents: asArr<Record<string, unknown>>(o.activeEvents).map(e => ({
      id: asStr(e.id, ''),
      typeId: 'fire',
      roomId: asStr(e.roomId, ''),
      startedTick: asInt(e.startedTick, 0),
      ticksRemaining: asInt(e.ticksRemaining, 0),
    })),
    eventLog: asArr<Record<string, unknown>>(o.eventLog).map(l => ({
      tick: asInt(l.tick, 0),
      text: asStr(l.text, ''),
      severity: asStr(l.severity, 'info') as GameState['eventLog'][number]['severity'],
    })),
    milestones: asArr<unknown>(o.milestones)
      .filter(m => typeof m === 'string')
      .map(m => m as string),
    rng: asInt(o.rng, Math.floor(Math.random() * 0x7fffffff)),
  }

  state.pregnancies = state.pregnancies.filter(p => p.motherId && p.fatherId)
  state.rooms = state.rooms.filter(r => r.id && r.typeId)
  state.dwellers = state.dwellers.filter(d => d.id)
  const dwellerIds = new Set(state.dwellers.map(d => d.id))
  for (const r of state.rooms) r.assigned = r.assigned.filter(id => dwellerIds.has(id))

  for (const res of ['power', 'water', 'food'] as ResourceId[]) {
    state.resources[res] = Math.min(state.resources[res], state.resourceCaps[res])
  }

  return state
}
