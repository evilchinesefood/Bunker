import type { GameState, Dweller } from '../State/GameState'
import { PREGNANCY_TICKS, MAX_DWELLERS } from '../State/GameState'
import { ROOM_CATALOG } from '../Domain/Rooms'
import { makeDweller, inheritedStats, generateName } from '../Domain/Dwellers'
import { rand } from '../Domain/Rng'
import { pushLog, housingCap } from '../State/Reducers'

export function populationCap(state: GameState): number {
  return Math.min(housingCap(state), MAX_DWELLERS)
}

export function tryPairingAndConceive(state: GameState, dwellerById: Map<string, Dweller>): void {
  if (state.tick % 60 !== 0 || state.tick === 0) return

  const atCap = state.dwellers.length >= populationCap(state)
  const quarters = state.rooms.filter(r => ROOM_CATALOG[r.typeId].kind === 'housing')
  for (const q of quarters) {
    const inside: Dweller[] = []
    for (const id of q.assigned) {
      const d = dwellerById.get(id)
      if (!d || d.isChild || d.status === 'pregnant') continue
      inside.push(d)
    }
    if (inside.length < 2) continue

    const unpaired = inside.filter(d => !d.partnerId)
    for (let i = 0; i + 1 < unpaired.length; i += 2) {
      const a = unpaired[i]
      const b = unpaired[i + 1]
      a.partnerId = b.id
      b.partnerId = a.id
      pushLog(state, `${a.name} and ${b.name} paired up.`, 'good')
    }

    if (atCap) continue

    for (const a of inside) {
      if (!a.partnerId) continue
      const b = dwellerById.get(a.partnerId)
      if (!b || b.isChild || b.status === 'pregnant') continue
      if (b.location !== q.id) continue
      if (a.id > b.id) continue
      state.pregnancies.push({
        motherId: a.id,
        fatherId: b.id,
        ticksRemaining: PREGNANCY_TICKS,
      })
      a.status = 'pregnant'
      pushLog(state, `${a.name} is pregnant!`, 'good')
      return
    }
  }
}

export function advancePregnancies(state: GameState, dwellerById: Map<string, Dweller>): void {
  if (state.pregnancies.length === 0) return
  const remain = []
  for (const p of state.pregnancies) {
    p.ticksRemaining -= 1
    if (p.ticksRemaining <= 0) {
      const mom = dwellerById.get(p.motherId)
      const dad = dwellerById.get(p.fatherId)
      if (!mom || !dad) continue
      if (state.dwellers.length >= populationCap(state)) {
        mom.status = 'idle'
        pushLog(state, `${mom.name}'s baby has nowhere to live — labor postponed.`, 'warn')
        continue
      }
      const child = makeDweller(state, {
        name: generateName(state),
        stats: inheritedStats(state, mom, dad),
        isChild: true,
        ageDays: 0,
        status: 'idle',
      })
      state.dwellers.push(child)
      dwellerById.set(child.id, child)
      mom.status = 'idle'
      pushLog(state, `${mom.name} gave birth to ${child.name}!`, 'good')
      if (!state.milestones.includes('first_birth')) {
        state.milestones.push('first_birth')
        pushLog(state, 'Milestone: first birth.', 'good')
      }
    } else {
      remain.push(p)
    }
  }
  state.pregnancies = remain
}

export function rollRecruit(state: GameState): void {
  if (state.tick % 180 !== 0 || state.tick === 0) return
  if (state.dwellers.length >= populationCap(state)) return

  let chance = 0.02
  for (const r of state.rooms) {
    if (ROOM_CATALOG[r.typeId].id !== 'radio') continue
    chance += 0.04 * r.level
    for (const dId of r.assigned) {
      const d = state.dwellers.find(x => x.id === dId)
      if (d) chance += d.stats.cha * 0.005
    }
  }
  if (rand(state) >= chance) return

  const recruit = makeDweller(state)
  state.dwellers.push(recruit)
  pushLog(state, `${recruit.name} arrived at the entrance and joined the bunker.`, 'good')
}
