import type { ResourceId, StatId } from '../State/GameState'

export type RoomKind =
  | 'production'
  | 'housing'
  | 'medbay'
  | 'currency'
  | 'training'
  | 'lounge'
  | 'radio'

export interface RoomType {
  id: string
  name: string
  icon: string
  kind: RoomKind
  affinity: StatId | null
  produces: ResourceId | 'caps' | null
  trainsStat: StatId | null
  baseCapacity: number
  baseProduction: number
  baseCost: number
  upgradeCostMult: number
  demolishRefundPct: number
  capBoostPerLevel: Partial<Record<ResourceId, number>>
  description: string
}

export const ROOM_CATALOG: Record<string, RoomType> = {
  power_plant: {
    id: 'power_plant',
    name: 'Power Plant',
    icon: 'fa-bolt',
    kind: 'production',
    affinity: 'str',
    produces: 'power',
    trainsStat: null,
    baseCapacity: 2,
    baseProduction: 0.25,
    baseCost: 100,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: { power: 50 },
    description: 'Produces power. Each level also raises power cap.',
  },
  water_treatment: {
    id: 'water_treatment',
    name: 'Water Treatment',
    icon: 'fa-droplet',
    kind: 'production',
    affinity: 'int',
    produces: 'water',
    trainsStat: null,
    baseCapacity: 2,
    baseProduction: 0.25,
    baseCost: 100,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: { water: 50 },
    description: 'Produces water. Each level also raises water cap.',
  },
  hydroponics: {
    id: 'hydroponics',
    name: 'Hydroponics',
    icon: 'fa-seedling',
    kind: 'production',
    affinity: 'int',
    produces: 'food',
    trainsStat: null,
    baseCapacity: 2,
    baseProduction: 0.25,
    baseCost: 100,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: { food: 50 },
    description: 'Produces food. Each level also raises food cap.',
  },
  quarters: {
    id: 'quarters',
    name: 'Quarters',
    icon: 'fa-bed',
    kind: 'housing',
    affinity: null,
    produces: null,
    trainsStat: null,
    baseCapacity: 4,
    baseProduction: 0,
    baseCost: 75,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Housing capacity. Paired dwellers here can conceive.',
  },
  medbay: {
    id: 'medbay',
    name: 'Medbay',
    icon: 'fa-kit-medical',
    kind: 'medbay',
    affinity: 'int',
    produces: null,
    trainsStat: null,
    baseCapacity: 2,
    baseProduction: 0.8,
    baseCost: 150,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Heals sick and injured dwellers.',
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    icon: 'fa-hammer',
    kind: 'currency',
    affinity: 'str',
    produces: 'caps',
    trainsStat: null,
    baseCapacity: 2,
    baseProduction: 0.05,
    baseCost: 150,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Produces caps (build currency).',
  },
  gym: {
    id: 'gym',
    name: 'Gym',
    icon: 'fa-dumbbell',
    kind: 'training',
    affinity: null,
    produces: null,
    trainsStat: 'str',
    baseCapacity: 2,
    baseProduction: 0,
    baseCost: 120,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Trains STR of assigned dwellers.',
  },
  classroom: {
    id: 'classroom',
    name: 'Classroom',
    icon: 'fa-book',
    kind: 'training',
    affinity: null,
    produces: null,
    trainsStat: 'int',
    baseCapacity: 2,
    baseProduction: 0,
    baseCost: 120,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Trains INT of assigned dwellers.',
  },
  track: {
    id: 'track',
    name: 'Track',
    icon: 'fa-person-running',
    kind: 'training',
    affinity: null,
    produces: null,
    trainsStat: 'end',
    baseCapacity: 2,
    baseProduction: 0,
    baseCost: 120,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Trains END of assigned dwellers.',
  },
  bar: {
    id: 'bar',
    name: 'Bar',
    icon: 'fa-mug-saucer',
    kind: 'training',
    affinity: null,
    produces: null,
    trainsStat: 'cha',
    baseCapacity: 2,
    baseProduction: 0,
    baseCost: 130,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Trains CHA + small happiness boost to assigned.',
  },
  lounge: {
    id: 'lounge',
    name: 'Lounge',
    icon: 'fa-couch',
    kind: 'lounge',
    affinity: null,
    produces: null,
    trainsStat: null,
    baseCapacity: 3,
    baseProduction: 0,
    baseCost: 100,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Idle dwellers here recover happiness passively.',
  },
  radio: {
    id: 'radio',
    name: 'Radio',
    icon: 'fa-tower-broadcast',
    kind: 'radio',
    affinity: 'cha',
    produces: 'caps',
    trainsStat: null,
    baseCapacity: 1,
    baseProduction: 0.01,
    baseCost: 200,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description: 'Boosts walk-up recruit chance + small caps trickle.',
  },
}

export const BUILDABLE_ORDER = [
  'power_plant',
  'water_treatment',
  'hydroponics',
  'quarters',
  'medbay',
  'workshop',
  'gym',
  'classroom',
  'track',
  'bar',
  'lounge',
  'radio',
]

export function upgradeCost(type: RoomType, currentLevel: 1 | 2 | 3): number {
  return Math.round(type.baseCost * Math.pow(type.upgradeCostMult, currentLevel))
}

export function slotsAtLevel(type: RoomType, level: 1 | 2 | 3): number {
  return type.baseCapacity + (level - 1)
}
