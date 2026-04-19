import type { GameState, ResourceId } from '../../State/GameState'
import { ROOM_CATALOG, computePowerStatus, statContribution } from '../../Domain/Rooms'
import { FOOD_PER_TICK, POWER_BOOST_MULT, WATER_PER_TICK } from '../../State/GameState'
import { h, icon, fmt, fmtRate } from '../Dom'
import { RESOURCE_LABEL, RESOURCE_ICON } from '../../Domain/Resources'

function netRate(state: GameState, res: ResourceId): number {
  const power = computePowerStatus(state.rooms, state.resources.power, state.resourceCaps.power)
  const mult = power.boosted ? POWER_BOOST_MULT : 1
  let prod = 0
  for (const r of state.rooms) {
    if (r.assigned.length === 0 || r.hp <= 0) continue
    const t = ROOM_CATALOG[r.typeId]
    if (t.produces !== res) continue
    if (power.dark && res !== 'power') continue
    let sum = 0
    for (const id of r.assigned) {
      const d = state.dwellers.find(x => x.id === id)
      if (d) sum += statContribution(d.stats, t.affinity)
    }
    const avg = sum / r.assigned.length
    prod += t.baseProduction * r.level * avg * r.assigned.length * mult
  }
  const per = res === 'food' ? FOOD_PER_TICK : res === 'water' ? WATER_PER_TICK : 0
  const cons = res === 'power' ? power.totalDraw : state.dwellers.length * per
  return prod - cons
}

function capsRate(state: GameState): number {
  const power = computePowerStatus(state.rooms, state.resources.power, state.resourceCaps.power)
  if (power.dark) return 0
  const mult = power.boosted ? POWER_BOOST_MULT : 1
  let per = 0
  for (const r of state.rooms) {
    if (r.assigned.length === 0 || r.hp <= 0) continue
    const t = ROOM_CATALOG[r.typeId]
    if (t.produces !== 'caps') continue
    let sum = 0
    for (const id of r.assigned) {
      const d = state.dwellers.find(x => x.id === id)
      if (d) sum += statContribution(d.stats, t.affinity)
    }
    const avg = sum / r.assigned.length
    per += t.baseProduction * r.level * avg * r.assigned.length * mult
  }
  return per
}

export function resourceBar(state: GameState, onOpenGear: () => void): HTMLElement {
  const power = computePowerStatus(state.rooms, state.resources.power, state.resourceCaps.power)
  const items: HTMLElement[] = []
  for (const res of ['power', 'water', 'food'] as ResourceId[]) {
    const cur = state.resources[res]
    const cap = state.resourceCaps[res]
    const pct = cap > 0 ? cur / cap : 0
    const rate = netRate(state, res)
    let cls = cur <= 0 ? 'res bad' : pct < 0.15 ? 'res warn' : 'res'
    if (res === 'power' && power.boosted) cls = 'res boosted'
    items.push(
      h(
        'div',
        {
          class: cls,
          'aria-label': `${RESOURCE_LABEL[res]}: ${Math.round(cur)} of ${Math.round(cap)}, ${fmtRate(rate)}`,
        },
        icon(RESOURCE_ICON[res]),
        h('span', { class: 'label' }, RESOURCE_LABEL[res]),
        h('span', { class: 'val' }, `${fmt(cur)}/${fmt(cap)}`),
        h('span', { class: 'rate', title: 'net per minute' }, fmtRate(rate)),
      ),
    )
  }

  return h(
    'header',
    { class: 'hud', role: 'banner' },
    h('div', { class: 'brand' }, 'BUNKER', h('small', {}, '// TERMINAL v0.1')),
    ...items,
    h(
      'div',
      {
        class: 'caps',
        'aria-label': `Caps: ${Math.round(state.caps)}, +${(capsRate(state) * 60).toFixed(2)} per minute`,
      },
      icon('fa-coins'),
      h('span', {}, `${fmt(state.caps)} CAPS`),
      h(
        'span',
        { class: 'rate', title: 'net per minute' },
        `+${(capsRate(state) * 60).toFixed(2)}/m`,
      ),
    ),
    h(
      'button',
      {
        class: 'gear',
        type: 'button',
        title: 'Settings',
        'aria-label': 'Open settings',
        onclick: onOpenGear,
      },
      icon('fa-gear'),
    ),
  )
}
