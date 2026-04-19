import type { Dweller, StatId } from '../State/GameState'
import { pick, randInt, rand, uuid } from './Rng'

const FIRST_NAMES = [
  'Alex',
  'Morgan',
  'Jordan',
  'Casey',
  'Riley',
  'Taylor',
  'Dakota',
  'Quinn',
  'Skyler',
  'Reese',
  'Avery',
  'Cameron',
  'Hayden',
  'Emerson',
  'Rowan',
  'Sage',
  'Kai',
  'Nico',
  'Milo',
  'Juno',
  'Ira',
  'Remy',
  'Arden',
  'Phoenix',
  'Ezra',
  'Luca',
  'Indra',
  'Wren',
  'Lior',
  'Finn',
  'Ash',
  'Vesper',
  'Ren',
  'Kian',
  'Blue',
  'Lark',
  'Sol',
  'Onyx',
  'Cove',
  'Daye',
]

const LAST_NAMES = [
  'Vance',
  'Hollis',
  'Cain',
  'Rook',
  'Tate',
  'Quill',
  'Marrow',
  'Pike',
  'Crane',
  'Reed',
  'Ash',
  'Vex',
  'Drake',
  'Hale',
  'Nash',
  'Wick',
  'Calder',
  'Fenn',
  'Grey',
  'Silas',
  'Thorn',
  'Glass',
  'Mora',
  'Voss',
  'Kade',
  'Irons',
  'Lark',
  'Osprey',
  'Shelby',
  'Bellamy',
  'Creed',
  'Dune',
]

export function generateName(state: { rng: number }): string {
  return `${pick(state, FIRST_NAMES)} ${pick(state, LAST_NAMES)}`
}

export function generateStats(
  state: { rng: number },
  min: number = 3,
  max: number = 7,
): Record<StatId, number> {
  return {
    str: randInt(state, min, max),
    int: randInt(state, min, max),
    end: randInt(state, min, max),
    cha: randInt(state, min, max),
  }
}

export function makeDweller(state: { rng: number }, opts: Partial<Dweller> = {}): Dweller {
  return {
    id: uuid(state),
    name: opts.name ?? generateName(state),
    stats: opts.stats ?? generateStats(state),
    xp: opts.xp ?? { str: 0, int: 0, end: 0, cha: 0 },
    location: opts.location ?? null,
    hp: opts.hp ?? 100,
    status: opts.status ?? 'idle',
    partnerId: opts.partnerId ?? null,
    ageDays: opts.ageDays ?? 0,
    isChild: opts.isChild ?? false,
  }
}

export function inheritedStats(
  state: { rng: number },
  a: Dweller,
  b: Dweller,
): Record<StatId, number> {
  const keys: StatId[] = ['str', 'int', 'end', 'cha']
  const out: Record<StatId, number> = { str: 5, int: 5, end: 5, cha: 5 }
  for (const k of keys) {
    const avg = (a.stats[k] + b.stats[k]) / 2
    const noise = (rand(state) - 0.5) * 2
    out[k] = Math.max(1, Math.min(10, Math.round(avg + noise)))
  }
  return out
}

export function statTotal(d: Dweller): number {
  return d.stats.str + d.stats.int + d.stats.end + d.stats.cha
}
