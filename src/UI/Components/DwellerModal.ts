import type { GameState, StatId } from '../../State/GameState'
import { XP_TO_STAT, TICKS_PER_MINUTE } from '../../State/GameState'
import { ROOM_CATALOG, slotsAtLevel } from '../../Domain/Rooms'
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

  const pregnancy = state.pregnancies.find(p => p.motherId === d.id || p.fatherId === d.id)
  const pregText = pregnancy
    ? `Due in ~${Math.max(1, Math.round(pregnancy.ticksRemaining / TICKS_PER_MINUTE))} min`
    : null

  const rooms = state.rooms.filter(r => {
    const cap = slotsAtLevel(ROOM_CATALOG[r.typeId], r.level)
    return r.id === d.location || r.assigned.length < cap
  })

  const select = h(
    'select',
    {
      id: `reassign-${d.id}`,
      onchange: ((e: Event) => {
        const v = (e.target as HTMLSelectElement).value
        onReassign(dwellerId, v || null)
      }) as EventListener,
    },
    h('option', { value: '' }, '— Idle —'),
    ...rooms.map(r => {
      const t = ROOM_CATALOG[r.typeId]
      const cap = slotsAtLevel(t, r.level)
      return h(
        'option',
        { value: r.id, selected: r.id === d.location },
        `${t.name} Lv${r.level} (${r.assigned.length}/${cap})`,
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
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'dweller-modal-title',
        onclick: ((e: Event) => e.stopPropagation()) as EventListener,
      },
      h('button', { class: 'close', type: 'button', 'aria-label': 'Close', onclick: onClose }, '×'),
      h('h2', { id: 'dweller-modal-title' }, icon(d.isChild ? 'fa-baby' : 'fa-user'), ` ${d.name}`),
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
        pregText ? h('span', {}, 'Pregnancy') : null,
        pregText ? h('b', {}, pregText) : null,
      ),
      h(
        'div',
        { class: 'reassign-row' },
        h('label', { for: `reassign-${d.id}` }, 'Reassign: '),
        select,
      ),
    ),
  )
}
