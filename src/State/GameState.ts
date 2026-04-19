export type ResourceId = 'power' | 'food' | 'water'
export type StatId = 'str' | 'int' | 'end' | 'cha'

export interface Room {
  id: string
  typeId: string
  level: 1 | 2 | 3
  assigned: string[]
  hp: number
  fireActive: boolean
}

export interface Dweller {
  id: string
  name: string
  stats: Record<StatId, number>
  xp: Record<StatId, number>
  location: string | null
  hp: number
  status: 'working' | 'idle' | 'sleeping' | 'pregnant' | 'sick' | 'training'
  partnerId: string | null
  ageDays: number
  isChild: boolean
}

export interface Pregnancy {
  motherId: string
  fatherId: string
  ticksRemaining: number
}

export interface ActiveEvent {
  id: string
  typeId: 'fire'
  roomId: string
  startedTick: number
  ticksRemaining: number
}

export interface LogEntry {
  tick: number
  text: string
  severity: 'info' | 'warn' | 'bad' | 'good'
}

export interface GameState {
  version: number
  tick: number
  lastSaveTimestamp: number
  resources: Record<ResourceId, number>
  resourceCaps: Record<ResourceId, number>
  caps: number
  rooms: Room[]
  dwellers: Dweller[]
  pregnancies: Pregnancy[]
  activeEvents: ActiveEvent[]
  eventLog: LogEntry[]
  milestones: string[]
  rng: number
}

export const CURRENT_VERSION = 1
export const TICKS_PER_MINUTE = 60
export const TICKS_PER_DAY = TICKS_PER_MINUTE * 24
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
export const MAX_LOG = 50
export const MAX_TOASTS = 6
export const MAX_DWELLERS = 22
export const CHILD_TO_ADULT_DAYS = 3
export const DWELLER_CAP_PER_QUARTERS = 4
export const FOOD_PER_TICK = 0.04
export const WATER_PER_TICK = 0.05
export const POWER_DRAW_BASE = 0.1
export const POWER_DRAW_RADIO = 0.3
export const POWER_BOOST_THRESHOLD = 0.95
export const POWER_BOOST_MULT = 1.2
export const POWER_LOW_THRESHOLD = 0.2
export const POWER_LOW_EVENT_MULT = 2
export const XP_PER_TICK = 0.5
export const XP_TO_STAT = 60
export const OFFLINE_XP_DAMPING = 0.25
export const SHORTAGE_GRACE_TICKS = 30
export const PREGNANCY_TICKS = 60 * 6
