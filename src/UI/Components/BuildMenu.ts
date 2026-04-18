import type { GameState } from '../../State/GameState'
import { BUILDABLE_ORDER, ROOM_CATALOG } from '../../Domain/Rooms'
import { h, icon, fmt } from '../Dom'

export function buildMenu(
  state: GameState,
  onBuild: (typeId: string) => void,
  onClose: () => void,
): HTMLElement {
  const cards = BUILDABLE_ORDER.map(typeId => {
    const t = ROOM_CATALOG[typeId]
    const affordable = state.caps >= t.baseCost
    return h(
      'div',
      {
        class: `build-card${affordable ? '' : ' disabled'}`,
        onclick: () => {
          if (!affordable) return
          onBuild(typeId)
          onClose()
        },
      },
      h('div', { class: 'name' }, icon(t.icon), ` ${t.name}`),
      h('div', { class: 'cost' }, `${fmt(t.baseCost)} caps`),
      h('div', { class: 'desc' }, t.description),
    )
  })

  return h(
    'div',
    { class: 'modal-backdrop', onclick: onClose },
    h(
      'div',
      {
        class: 'modal',
        onclick: (e: Event) => e.stopPropagation(),
      },
      h('button', { class: 'close', onclick: onClose }, '×'),
      h('h2', {}, 'BUILD'),
      h('div', { class: 'build-grid' }, ...cards),
    ),
  )
}
