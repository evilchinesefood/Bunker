import type { GameState, Room } from '../../State/GameState'
import { ROOM_CATALOG, slotsAtLevel, upgradeCost } from '../../Domain/Rooms'
import { h, icon, fmt } from '../Dom'
import { ui } from '../UiState'

export interface RoomHandlers {
  onToggle: (id: string) => void
  onOpenAssign: (roomId: string, x: number, y: number) => void
  onUnassign: (roomId: string, dwellerId: string) => void
  onUpgrade: (roomId: string) => void
  onDemolish: (roomId: string) => void
  onOpenDweller: (id: string) => void
}

export function roomCard(state: GameState, room: Room, h2: RoomHandlers): HTMLElement {
  const type = ROOM_CATALOG[room.typeId]
  const slots = slotsAtLevel(type, room.level)
  const expanded = ui.expandedRoomId === room.id

  const cls = `room${expanded ? ' expanded' : ''}${room.fireActive ? ' fire' : ''}`

  let prodText = ''
  if (type.produces && room.assigned.length > 0) {
    const aff = type.affinity
      ? room.assigned.reduce((s, id) => {
          const d = state.dwellers.find(x => x.id === id)
          return s + (d ? d.stats[type.affinity!] : 0)
        }, 0)
      : room.assigned.length * 5
    const per = type.baseProduction * room.level * aff
    prodText = `+${(per * 60).toFixed(1)}/m ${type.produces}`
  } else if (type.trainsStat) {
    prodText = `Trains ${type.trainsStat.toUpperCase()}`
  } else if (type.kind === 'housing') {
    prodText = `Housing ${slots}`
  } else if (type.kind === 'lounge') {
    prodText = 'Happiness ↑'
  }

  const row = h(
    'div',
    { class: 'row' },
    h('div', { class: 'icon' }, icon(type.icon)),
    h(
      'div',
      {},
      h('span', { class: 'name' }, type.name),
      h('span', { class: 'lvl' }, `Lv${room.level}`),
    ),
    h('div', { class: 'prod' }, prodText),
    h(
      'div',
      { class: `hp${room.hp < 40 ? ' low' : ''}` },
      room.hp < 100 ? `HP ${Math.round(room.hp)}` : '',
    ),
  )

  const card = h(
    'div',
    {
      class: cls,
      onclick: (e: Event) => {
        if ((e.target as HTMLElement).closest('button,.chip,.assign-menu')) return
        h2.onToggle(room.id)
      },
    },
    row,
  )

  if (expanded) {
    const slotEls: HTMLElement[] = []
    for (const dId of room.assigned) {
      const d = state.dwellers.find(x => x.id === dId)
      if (!d) continue
      slotEls.push(
        h(
          'span',
          {
            class: 'chip',
            title: 'Click to open dweller; right-click to unassign',
            onclick: (e: Event) => {
              e.stopPropagation()
              h2.onOpenDweller(d.id)
            },
            oncontextmenu: (e: Event) => {
              e.preventDefault()
              e.stopPropagation()
              h2.onUnassign(room.id, d.id)
            },
          },
          icon('fa-user'),
          ` ${d.name}`,
        ),
      )
    }
    for (let i = room.assigned.length; i < slots; i++) {
      slotEls.push(
        h(
          'span',
          {
            class: 'chip empty',
            onclick: ((e: MouseEvent) => {
              e.stopPropagation()
              h2.onOpenAssign(room.id, e.clientX, e.clientY)
            }) as EventListener,
          },
          icon('fa-plus'),
          ' assign',
        ),
      )
    }

    const upCost = room.level < 3 ? upgradeCost(type, room.level) : null
    const canUpgrade = upCost !== null && state.caps >= upCost

    const actions = h(
      'div',
      { class: 'room-actions' },
      room.level < 3
        ? h(
            'button',
            {
              disabled: !canUpgrade,
              onclick: (e: Event) => {
                e.stopPropagation()
                h2.onUpgrade(room.id)
              },
            },
            `UPGRADE (${fmt(upCost!)} caps)`,
          )
        : h('button', { disabled: true }, 'MAX LEVEL'),
      h(
        'button',
        {
          class: 'danger',
          onclick: (e: Event) => {
            e.stopPropagation()
            h2.onDemolish(room.id)
          },
        },
        'DEMOLISH',
      ),
    )

    card.appendChild(
      h('div', { class: 'expand' }, h('div', { class: 'slots' }, ...slotEls), actions),
    )
  }

  return card
}
