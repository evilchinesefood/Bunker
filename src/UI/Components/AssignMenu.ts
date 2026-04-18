import type { GameState } from '../../State/GameState'
import { h, icon } from '../Dom'

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

  const candidates = state.dwellers.filter(d => {
    if (d.isChild) return false
    if (d.status === 'pregnant') return false
    if (d.location === roomId) return false
    return true
  })

  const list = candidates.map(d =>
    h(
      'button',
      {
        onclick: () => {
          onAssign(d.id)
          onClose()
        },
      },
      icon('fa-user'),
      ` ${d.name} (${d.stats.str}/${d.stats.int}/${d.stats.end}/${d.stats.cha})`,
    ),
  )

  return h(
    'div',
    { class: 'modal-backdrop', onclick: onClose, style: 'background:transparent' },
    h(
      'div',
      {
        class: 'assign-menu',
        onclick: (e: Event) => e.stopPropagation(),
        style: `left:${x}px;top:${y}px`,
      },
      list.length ? h('div', {}, ...list) : h('div', { class: 'empty' }, 'No available dwellers'),
    ),
  )
}
