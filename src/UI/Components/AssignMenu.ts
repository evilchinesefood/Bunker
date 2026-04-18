import type { GameState } from '../../State/GameState'
import { ROOM_CATALOG } from '../../Domain/Rooms'
import { h, icon, clampToViewport } from '../Dom'

export function assignMenu(
  state: GameState,
  roomId: string,
  x: number,
  y: number,
  onAssign: (dId: string) => void,
  onClose: () => void,
): HTMLElement {
  const room = state.rooms.find(r => r.id === roomId)
  if (!room) return h('div')
  const affStat = ROOM_CATALOG[room.typeId].affinity

  const candidates = state.dwellers.filter(d => {
    if (d.isChild) return false
    if (d.status === 'pregnant') return false
    if (d.location === roomId) return false
    return true
  })

  const [lx, ly] = clampToViewport(x, y, 240, Math.min(260, candidates.length * 28 + 20))

  const items = candidates.map(d => {
    const stats = (['str', 'int', 'end', 'cha'] as const).map(s =>
      h('span', { class: affStat === s ? 'stat-hl' : '' }, String(d.stats[s])),
    )
    return h(
      'button',
      {
        type: 'button',
        onclick: (() => {
          onAssign(d.id)
          onClose()
        }) as EventListener,
      },
      icon('fa-user'),
      ' ',
      h('span', { class: 'aname' }, d.name),
      ' ',
      h('span', { class: 'astats' }, stats[0], '/', stats[1], '/', stats[2], '/', stats[3]),
    )
  })

  return h(
    'div',
    { class: 'modal-backdrop assign-backdrop', onclick: onClose },
    h(
      'div',
      {
        class: 'assign-menu',
        role: 'menu',
        onclick: ((e: Event) => e.stopPropagation()) as EventListener,
        style: `left:${lx}px;top:${ly}px`,
      },
      items.length ? h('div', {}, ...items) : h('div', { class: 'empty' }, 'No available dwellers'),
    ),
  )
}
