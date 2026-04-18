import type { GameState } from '../State/GameState'
import { PREGNANCY_TICKS } from '../State/GameState'
import { ROOM_CATALOG } from '../Domain/Rooms'
import { makeDweller, inheritedStats, generateName } from '../Domain/Dwellers'
import { rand } from '../Domain/Rng'
import { pushLog } from '../State/Reducers'
import { housingCap } from '../State/Reducers'

export function tryPairingAndConceive(state: GameState): void {
  if (state.tick % 60 !== 0 || state.tick === 0) return
  const capFull = state.dwellers.length >= housingCap(state)
  if (capFull) return

  const quarters = state.rooms.filter(r => ROOM_CATALOG[r.typeId].kind === 'housing')
  for (const q of quarters) {
    const inside = q.assigned
      .map(id => state.dwellers.find(d => d.id === id))
      .filter((d): d is NonNullable<typeof d> => !!d && !d.isChild && d.status !== 'pregnant')
    if (inside.length < 2) continue

    for (let i = 0; i < inside.length - 1; i += 2) {
      const a = inside[i]
      const b = inside[i + 1]
      if (!a.partnerId && !b.partnerId) {
        a.partnerId = b.id
        b.partnerId = a.id
        pushLog(state, `${a.name} and ${b.name} paired up.`, 'good')
      }
      if (a.partnerId === b.id && rand(state) < 0.08) {
        state.pregnancies.push({
          motherId: a.id,
          fatherId: b.id,
          ticksRemaining: PREGNANCY_TICKS,
        })
        a.status = 'pregnant'
        pushLog(state, `${a.name} is pregnant!`, 'good')
      }
    }
  }
}

export function advancePregnancies(state: GameState): void {
  if (state.pregnancies.length === 0) return
  const remain = []
  for (const p of state.pregnancies) {
    p.ticksRemaining -= 1
    if (p.ticksRemaining <= 0) {
      const mom = state.dwellers.find(d => d.id === p.motherId)
      const dad = state.dwellers.find(d => d.id === p.fatherId)
      if (!mom || !dad) continue
      const child = makeDweller(state, {
        name: generateName(state),
        stats: inheritedStats(state, mom, dad),
        isChild: true,
        ageDays: 0,
        status: 'idle',
      })
      state.dwellers.push(child)
      mom.status = 'idle'
      pushLog(state, `${mom.name} gave birth to ${child.name}!`, 'good')
      if (!state.milestones.includes('first_birth')) {
        state.milestones.push('first_birth')
      }
    } else {
      remain.push(p)
    }
  }
  state.pregnancies = remain
}

export function rollRecruit(state: GameState): void {
  if (state.tick % 180 !== 0 || state.tick === 0) return
  if (state.dwellers.length >= housingCap(state)) return

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
