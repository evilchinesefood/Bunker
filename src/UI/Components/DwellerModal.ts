import type { GameState, StatId } from '../../State/GameState'
import { XP_TO_STAT } from '../../State/GameState'
import { ROOM_CATALOG } from '../../Domain/Rooms'
import { h, icon } from '../Dom'

const STATS: StatId[] = ['str', 'int', 'end', 'cha']

export function dwellerModal(
  state: GameState,
  dwellerId: string,
  onReassign: (dwellerId: string, roomId: string | null) => void,
  onClose: () => void,
): HTMLElement {
  const d = state.dwellers.find(x => x.id === dwellerId)
  if (!d) return h('div')

  const statCards = STATS.map(s =>
    h(
      'div',
      { class: 'stat' },
      h('div', { class: 'k' }, s.toUpperCase()),
      h('div', { class: 'v' }, String(d.stats[s])),
      h('div', { class: 'x' }, `XP ${Math.round(d.xp[s])}/${XP_TO_STAT}`),
    ),
  )

  const partner = d.partnerId ? state.dwellers.find(x => x.id === d.partnerId) : null
  const locRoom = d.location ? state.rooms.find(r => r.id === d.location) : null
  const locLabel = locRoom ? ROOM_CATALOG[locRoom.typeId].name : 'Idle'

  const rooms = state.rooms
    .filter(r => r.assigned.length < ROOM_CATALOG[r.typeId].baseCapacity + (r.level - 1))
    .filter(r => ROOM_CATALOG[r.typeId].kind !== 'lounge' || true)

  const select = h(
    'select',
    {
      onchange: (e: Event) => {
        const v = (e.target as HTMLSelectElement).value
        onReassign(dwellerId, v || null)
      },
    },
    h('option', { value: '' }, '— idle —'),
    ...rooms.map(r => {
      const t = ROOM_CATALOG[r.typeId]
      return h(
        'option',
        { value: r.id, selected: r.id === d.location },
        `${t.name} Lv${r.level} (${r.assigned.length}/${t.baseCapacity + (r.level - 1)})`,
      )
    }),
  )

  return h(
    'div',
    { class: 'modal-backdrop', onclick: onClose },
    h(
      'div',
      {
        class: 'modal dweller-modal',
        onclick: (e: Event) => e.stopPropagation(),
      },
      h('button', { class: 'close', onclick: onClose }, '×'),
      h('h2', {}, icon(d.isChild ? 'fa-baby' : 'fa-user'), ` ${d.name}`),
      h('div', { class: 'stats' }, ...statCards),
      h(
        'div',
        { class: 'meta' },
        h('span', {}, 'HP'),
        h('b', {}, `${Math.round(d.hp)}/100`),
        h('span', {}, 'Happiness'),
        h('b', {}, `${Math.round(d.happiness)}/100`),
        h('span', {}, 'Status'),
        h('b', {}, d.isChild ? 'Child' : d.status),
        h('span', {}, 'Age'),
        h('b', {}, `${d.ageDays} day${d.ageDays === 1 ? '' : 's'}`),
        h('span', {}, 'Partner'),
        h('b', {}, partner ? partner.name : 'none'),
        h('span', {}, 'Location'),
        h('b', {}, locLabel),
      ),
      h('div', { style: 'margin-top:14px' }, h('b', {}, 'Reassign: '), select),
    ),
  )
}
