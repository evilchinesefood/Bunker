import type { GameState, ResourceId } from '../../State/GameState'
import { ROOM_CATALOG } from '../../Domain/Rooms'
import { FOOD_PER_TICK, POWER_PER_TICK, WATER_PER_TICK } from '../../State/GameState'
import { h, icon, fmt, fmtRate } from '../Dom'
import { RESOURCE_LABEL, RESOURCE_ICON } from '../../Domain/Resources'

function netRate(state: GameState, res: ResourceId): number {
  let prod = 0
  for (const r of state.rooms) {
    if (r.assigned.length === 0 || r.hp <= 0) continue
    const t = ROOM_CATALOG[r.typeId]
    if (t.produces !== res) continue
    const aff = t.affinity
      ? r.assigned.reduce((s, id) => {
          const d = state.dwellers.find(x => x.id === id)
          return s + (d ? d.stats[t.affinity!] : 0)
        }, 0)
      : r.assigned.length * 5
    prod += t.baseProduction * r.level * aff
  }
  const per = res === 'food' ? FOOD_PER_TICK : res === 'water' ? WATER_PER_TICK : POWER_PER_TICK
  const cons = state.dwellers.length * per
  return prod - cons
}

function capsRate(state: GameState): number {
  let per = 0
  for (const r of state.rooms) {
    if (r.assigned.length === 0 || r.hp <= 0) continue
    const t = ROOM_CATALOG[r.typeId]
    if (t.produces !== 'caps') continue
    const aff = t.affinity
      ? r.assigned.reduce((s, id) => {
          const d = state.dwellers.find(x => x.id === id)
          return s + (d ? d.stats[t.affinity!] : 0)
        }, 0)
      : r.assigned.length * 5
    per += t.baseProduction * r.level * aff
  }
  return per
}

export function resourceBar(state: GameState, onReset: () => void): HTMLElement {
  const items: HTMLElement[] = []
  for (const res of ['power', 'water', 'food'] as ResourceId[]) {
    const cur = state.resources[res]
    const cap = state.resourceCaps[res]
    const pct = cap > 0 ? cur / cap : 0
    const rate = netRate(state, res)
    const cls = cur <= 0 ? 'res bad' : pct < 0.15 ? 'res warn' : 'res'
    items.push(
      h(
        'div',
        { class: cls },
        icon(RESOURCE_ICON[res]),
        h('span', { class: 'label' }, RESOURCE_LABEL[res]),
        h('span', { class: 'val' }, `${fmt(cur)}/${fmt(cap)}`),
        h('span', { class: 'rate' }, fmtRate(rate)),
      ),
    )
  }

  return h(
    'div',
    { class: 'hud' },
    h('div', { class: 'brand' }, 'BUNKER', h('small', {}, '// TERMINAL v0.1')),
    ...items,
    h(
      'div',
      { class: 'caps' },
      icon('fa-coins'),
      h('span', {}, `${fmt(state.caps)} CAPS`),
      h('span', { class: 'rate' }, `+${(capsRate(state) * 60).toFixed(2)}/m`),
    ),
    h('button', { class: 'gear', title: 'Menu', onclick: onReset }, icon('fa-gear')),
  )
}
