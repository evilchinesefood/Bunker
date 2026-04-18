export interface Rng {
  seed: number
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function advance(seed: number): number {
  return (seed + 0x6d2b79f5) | 0
}

export function rand(state: { rng: number }): number {
  state.rng = advance(state.rng)
  let t = state.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function randInt(state: { rng: number }, min: number, max: number): number {
  return Math.floor(rand(state) * (max - min + 1)) + min
}

export function pick<T>(state: { rng: number }, arr: T[]): T {
  return arr[Math.floor(rand(state) * arr.length)]
}

export function uuid(state: { rng: number }): string {
  return (
    randInt(state, 0, 0xffff).toString(16).padStart(4, '0') +
    randInt(state, 0, 0xffff).toString(16).padStart(4, '0') +
    randInt(state, 0, 0xffff).toString(16).padStart(4, '0')
  )
}
