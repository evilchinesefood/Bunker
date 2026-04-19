import type { ResourceId, StatId } from '../State/GameState'

export type RoomKind = 'production' | 'housing' | 'medbay' | 'currency' | 'training' | 'radio'

export type RoomAffinity = StatId | 'all' | null

export interface RoomType {
  id: string
  name: string
  icon: string
  kind: RoomKind
  affinity: RoomAffinity
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
    description:
      'Keeps the bunker powered. Produces power and raises the power cap per level. Assign high-STR dwellers.',
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
    description:
      'Purifies drinkable water. Produces water and raises the water cap per level. Assign high-INT dwellers.',
  },
  hydroponics: {
    id: 'hydroponics',
    name: 'Hydroponics',
    icon: 'fa-seedling',
    kind: 'production',
    affinity: 'end',
    produces: 'food',
    trainsStat: null,
    baseCapacity: 2,
    baseProduction: 0.25,
    baseCost: 100,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: { food: 50 },
    description:
      'Grows food for the population. Produces food and raises the food cap per level. Assign high-END dwellers.',
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
    description:
      'Houses dwellers and expands your population cap. No output; paired dwellers here can conceive. Assign couples.',
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
    description:
      'Treats the sick and injured. No resource output; heals HP over time. Assign high-INT dwellers.',
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    icon: 'fa-hammer',
    kind: 'currency',
    affinity: 'all',
    produces: 'caps',
    trainsStat: null,
    baseCapacity: 2,
    baseProduction: 0.05,
    baseCost: 150,
    upgradeCostMult: 2,
    demolishRefundPct: 0.5,
    capBoostPerLevel: {},
    description:
      'Builds and tinkers for profit. Produces caps (build currency). All four stats contribute — balanced dwellers excel.',
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
    description:
      'Strength training room. No output; trains STR of assigned dwellers. Use anyone whose STR you want to grow.',
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
    description:
      'Study hall. No output; trains INT of assigned dwellers. Use anyone whose INT you want to grow.',
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
    description:
      'Endurance training. No output; trains END of assigned dwellers. Use anyone whose END you want to grow.',
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
    description:
      'Social hangout. No output; trains CHA of assigned dwellers. Use anyone whose CHA you want to grow.',
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
    description:
      'Broadcasts to the wasteland. Boosts walk-up recruit chance with a small caps trickle. Assign high-CHA dwellers.',
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
  'radio',
]

export function upgradeCost(type: RoomType, currentLevel: 1 | 2 | 3): number {
  return Math.round(type.baseCost * Math.pow(type.upgradeCostMult, currentLevel))
}

export function slotsAtLevel(type: RoomType, level: 1 | 2 | 3): number {
  return type.baseCapacity + (level - 1)
}

export function statContribution(stats: Record<StatId, number>, affinity: RoomAffinity): number {
  if (affinity === 'all') return (stats.str + stats.int + stats.end + stats.cha) / 4
  if (affinity) return stats[affinity]
  return 5
}
