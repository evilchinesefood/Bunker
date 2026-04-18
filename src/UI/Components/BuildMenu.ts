import type { GameState } from '../../State/GameState'
import { BUILDABLE_ORDER, ROOM_CATALOG } from '../../Domain/Rooms'
import { h, icon, fmt } from '../Dom'

const GROUPS: Array<{ title: string; kinds: string[] }> = [
  { title: 'Production', kinds: ['production', 'currency'] },
  { title: 'Housing', kinds: ['housing'] },
  { title: 'Training', kinds: ['training'] },
  { title: 'Utility', kinds: ['medbay', 'lounge', 'radio'] },
]

export function buildMenu(
  state: GameState,
  onBuild: (typeId: string) => void,
  onClose: () => void,
): HTMLElement {
  const sections = GROUPS.map(g => {
    const ids = BUILDABLE_ORDER.filter(id => g.kinds.includes(ROOM_CATALOG[id].kind))
    if (ids.length === 0) return null
    return h(
      'div',
      { class: 'build-section' },
      h('h3', {}, g.title),
      h(
        'div',
        { class: 'build-grid' },
        ...ids.map(typeId => {
          const t = ROOM_CATALOG[typeId]
          const affordable = state.caps >= t.baseCost
          return h(
            'button',
            {
              type: 'button',
              class: `build-card${affordable ? '' : ' disabled'}`,
              disabled: !affordable,
              onclick: (() => {
                if (!affordable) return
                onBuild(typeId)
                onClose()
              }) as EventListener,
            },
            h('div', { class: 'name' }, icon(t.icon), ` ${t.name}`),
            h('div', { class: 'cost' }, `${fmt(t.baseCost)} caps`),
            h('div', { class: 'desc' }, t.description),
          )
        }),
      ),
    )
  }).filter(n => n !== null) as HTMLElement[]

  return h(
    'div',
    {
      class: 'modal-backdrop',
      onclick: onClose,
    },
    h(
      'div',
      {
        class: 'modal build-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'build-modal-title',
        onclick: ((e: Event) => e.stopPropagation()) as EventListener,
      },
      h('button', { class: 'close', type: 'button', 'aria-label': 'Close', onclick: onClose }, '×'),
      h('h2', { id: 'build-modal-title' }, 'BUILD'),
      ...sections,
    ),
  )
}
