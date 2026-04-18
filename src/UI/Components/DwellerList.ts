import type { GameState, Dweller } from '../../State/GameState'
import { ROOM_CATALOG } from '../../Domain/Rooms'
import { h, icon } from '../Dom'
import { housingCap } from '../../State/Reducers'
import { MAX_DWELLERS } from '../../State/GameState'

function pct(n: number): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

export function dwellerList(state: GameState, onOpen: (id: string) => void): HTMLElement {
  const items = state.dwellers
    .slice()
    .sort((a, b) => Number(a.isChild) - Number(b.isChild) || a.name.localeCompare(b.name))
    .map(d => dwellerRow(state, d, onOpen))
  const cap = Math.min(housingCap(state), MAX_DWELLERS)
  return h(
    'aside',
    { class: 'dwellers', 'aria-label': 'Dwellers' },
    h(
      'div',
      { class: 'section-head' },
      h('span', {}, 'Dwellers'),
      h('span', { class: 'count' }, `${state.dwellers.length}/${cap}`),
    ),
    ...items,
  )
}

function dwellerRow(state: GameState, d: Dweller, onOpen: (id: string) => void): HTMLElement {
  const locName = d.location
    ? (ROOM_CATALOG[state.rooms.find(r => r.id === d.location)?.typeId ?? '']?.name ?? 'Idle')
    : 'Idle'

  const tag = d.isChild
    ? h('span', { class: 'status-tag child' }, 'CHILD')
    : d.status === 'pregnant'
      ? h('span', { class: 'status-tag pregnant' }, 'PREG')
      : d.status === 'training'
        ? h('span', { class: 'status-tag training' }, 'TRAIN')
        : null

  const hpBar = h(
    'div',
    { class: 'bar hp', role: 'img', 'aria-label': `HP ${Math.round(d.hp)}%` },
    h('span', { style: `width:${pct(d.hp)}%` }),
  )
  const happyBar = h(
    'div',
    { class: 'bar happy', role: 'img', 'aria-label': `Happiness ${Math.round(d.happiness)}%` },
    h('span', { style: `width:${pct(d.happiness)}%` }),
  )

  return h(
    'button',
    {
      class: 'dweller',
      type: 'button',
      'aria-label': `${d.name}, at ${locName}, HP ${Math.round(d.hp)}, happiness ${Math.round(d.happiness)}`,
      onclick: (() => onOpen(d.id)) as EventListener,
    },
    h(
      'div',
      { class: 'name' },
      icon(d.isChild ? 'fa-baby' : 'fa-user'),
      ` ${d.name}`,
      tag ? ' ' : '',
      tag,
    ),
    h('div', { class: 'stat' }, `${d.stats.str}/${d.stats.int}/${d.stats.end}/${d.stats.cha}`),
    h('div', { class: 'loc' }, locName),
    h('div', { class: 'bars' }, hpBar, happyBar),
  )
}
