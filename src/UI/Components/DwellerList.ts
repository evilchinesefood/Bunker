import type { GameState, Dweller } from '../../State/GameState'
import { ROOM_CATALOG } from '../../Domain/Rooms'
import { h, icon } from '../Dom'
import { housingCap } from '../../State/Reducers'

export function dwellerList(state: GameState, onOpen: (id: string) => void): HTMLElement {
  const items = state.dwellers
    .slice()
    .sort((a, b) => Number(a.isChild) - Number(b.isChild) || a.name.localeCompare(b.name))
    .map(d => dwellerRow(state, d, onOpen))
  return h(
    'div',
    { class: 'dwellers' },
    h(
      'div',
      { class: 'section-head' },
      'Dwellers',
      h('span', { class: 'count' }, `${state.dwellers.length}/${housingCap(state)}`),
    ),
    ...items,
  )
}

function dwellerRow(state: GameState, d: Dweller, onOpen: (id: string) => void): HTMLElement {
  const locName = d.location
    ? (ROOM_CATALOG[state.rooms.find(r => r.id === d.location)?.typeId ?? '']?.name ?? 'idle')
    : 'idle'

  const tag = d.isChild
    ? h('span', { class: 'status-tag child' }, 'CHILD')
    : d.status === 'pregnant'
      ? h('span', { class: 'status-tag pregnant' }, 'PREG')
      : d.status === 'training'
        ? h('span', { class: 'status-tag training' }, 'TRAIN')
        : null

  const hpBar = h('div', { class: 'bar hp' }, h('span', { style: `width:${d.hp}%` }))
  const happyBar = h('div', { class: 'bar happy' }, h('span', { style: `width:${d.happiness}%` }))

  return h(
    'div',
    { class: 'dweller', onclick: () => onOpen(d.id) },
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
