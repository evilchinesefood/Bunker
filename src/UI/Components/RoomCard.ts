import type { GameState, Room } from '../../State/GameState'
import { ROOM_CATALOG, slotsAtLevel, statContribution, upgradeCost } from '../../Domain/Rooms'
import { TICKS_PER_MINUTE } from '../../State/GameState'
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

export function roomCard(state: GameState, room: Room, handlers: RoomHandlers): HTMLElement {
  const type = ROOM_CATALOG[room.typeId]
  const slots = slotsAtLevel(type, room.level)
  const expanded = ui.expandedRoomId === room.id

  const cls = `room${expanded ? ' expanded' : ''}${room.fireActive ? ' fire' : ''}`

  const assignedSet = new Set(room.assigned)
  const assignedDwellers = room.assigned
    .map(id => state.dwellers.find(x => x.id === id))
    .filter((d): d is NonNullable<typeof d> => !!d)

  let pairsInside = 0
  let singlesInside = 0
  const pairedIds = new Set<string>()
  if (type.kind === 'housing') {
    for (const d of assignedDwellers) {
      if (pairedIds.has(d.id)) continue
      if (d.partnerId && assignedSet.has(d.partnerId)) {
        pairsInside += 1
        pairedIds.add(d.id)
        pairedIds.add(d.partnerId)
      } else {
        singlesInside += 1
      }
    }
  }

  let prodText = ''
  let prodEl: HTMLElement | null = null
  if (type.produces && room.assigned.length > 0) {
    let sum = 0
    for (const d of assignedDwellers) sum += statContribution(d.stats, type.affinity)
    const avg = sum / room.assigned.length
    const per = type.baseProduction * room.level * avg * room.assigned.length
    prodText = `+${(per * 60).toFixed(1)}/m ${type.produces}`
  } else if (type.trainsStat) {
    prodText = `Trains ${type.trainsStat.toUpperCase()}`
  } else if (type.kind === 'housing') {
    const parts: HTMLElement[] = []
    if (pairsInside > 0) {
      parts.push(
        h(
          'span',
          { class: 'pair-tally' },
          icon('fa-heart', 'pair-mark'),
          ` ${pairsInside} pair${pairsInside === 1 ? '' : 's'}`,
        ),
      )
    }
    if (singlesInside > 0) {
      parts.push(h('span', { class: 'single-tally' }, icon('fa-user'), ` ${singlesInside} solo`))
    }
    if (parts.length === 0) {
      prodText = `${slots} beds — empty`
    } else {
      prodEl = h('div', { class: 'prod housing-tally' }, ...parts)
    }
  }

  const assignedBadge = `${room.assigned.length}/${slots}`
  const emptySlots = slots - room.assigned.length
  const attention = emptySlots > 0 && type.kind !== 'housing'

  const row = h(
    'div',
    { class: 'row' },
    h('div', { class: 'icon' }, icon(type.icon)),
    h(
      'div',
      { class: 'room-title' },
      h('span', { class: 'name' }, type.name),
      h('span', { class: 'lvl' }, `Lv${room.level}`),
    ),
    h(
      'span',
      {
        class: `slot-badge${attention ? ' attention' : ''}`,
        'aria-label': `${room.assigned.length} of ${slots} assigned`,
      },
      assignedBadge,
    ),
    prodEl ?? h('div', { class: 'prod' }, prodText),
    h(
      'div',
      { class: `hp${room.hp < 40 ? ' low' : ''}` },
      room.hp < 100 ? `HP ${Math.round(room.hp)}` : '',
    ),
    h('i', {
      class: `fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'} chev`,
      'aria-hidden': 'true',
    }),
  )

  const cardAttrs: Record<string, string | EventListener | boolean> = {
    class: cls,
    role: 'button',
    tabindex: '0',
    'aria-expanded': expanded ? 'true' : 'false',
    'aria-label': `${type.name} level ${room.level}, ${assignedBadge} assigned${room.fireActive ? ', on fire' : ''}`,
    onclick: ((e: Event) => {
      if ((e.target as HTMLElement).closest('button,.chip,.assign-menu,.chip-remove')) return
      handlers.onToggle(room.id)
    }) as EventListener,
    onkeydown: ((e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      if ((e.target as HTMLElement).closest('button,.chip,.chip-remove')) return
      e.preventDefault()
      handlers.onToggle(room.id)
    }) as unknown as EventListener,
  }
  const card = h('div', cardAttrs, row)

  if (expanded) {
    const slotEls: HTMLElement[] = []
    for (const dId of room.assigned) {
      const d = state.dwellers.find(x => x.id === dId)
      if (!d) continue
      const pairedHere =
        type.kind === 'housing' && d.partnerId ? assignedSet.has(d.partnerId) : false
      const preg = state.pregnancies.find(p => p.motherId === d.id)
      const pregMin = preg ? Math.max(1, Math.round(preg.ticksRemaining / TICKS_PER_MINUTE)) : null
      slotEls.push(
        h(
          'span',
          { class: `chip${pairedHere ? ' paired' : ''}${preg ? ' pregnant' : ''}` },
          h(
            'button',
            {
              class: 'chip-main',
              type: 'button',
              'aria-label': `Open ${d.name}${pairedHere ? ', paired' : ''}${pregMin ? `, due in ${pregMin} min` : ''}`,
              onclick: ((e: Event) => {
                e.stopPropagation()
                handlers.onOpenDweller(d.id)
              }) as EventListener,
            },
            icon('fa-user'),
            ` ${d.name}`,
            pairedHere ? icon('fa-heart', 'pair-mark') : null,
            pregMin ? h('span', { class: 'preg-eta' }, ` ${pregMin}m`) : null,
          ),
          h(
            'button',
            {
              class: 'chip-remove',
              type: 'button',
              title: 'Unassign',
              'aria-label': `Unassign ${d.name}`,
              onclick: ((e: Event) => {
                e.stopPropagation()
                handlers.onUnassign(room.id, d.id)
              }) as EventListener,
            },
            '×',
          ),
        ),
      )
    }
    for (let i = room.assigned.length; i < slots; i++) {
      slotEls.push(
        h(
          'button',
          {
            class: 'chip empty',
            type: 'button',
            'aria-label': 'Assign a dweller',
            onclick: ((e: MouseEvent) => {
              e.stopPropagation()
              handlers.onOpenAssign(room.id, e.clientX, e.clientY)
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
              type: 'button',
              disabled: !canUpgrade,
              onclick: ((e: Event) => {
                e.stopPropagation()
                handlers.onUpgrade(room.id)
              }) as EventListener,
            },
            `UPGRADE (${fmt(upCost!)} caps)`,
          )
        : h('button', { type: 'button', disabled: true }, 'MAX LEVEL'),
      h(
        'button',
        {
          type: 'button',
          class: 'danger',
          onclick: ((e: Event) => {
            e.stopPropagation()
            handlers.onDemolish(room.id)
          }) as EventListener,
        },
        'DEMOLISH',
      ),
    )

    card.appendChild(
      h(
        'div',
        { class: 'expand' },
        h('div', { class: 'room-desc' }, type.description),
        h('div', { class: 'slots' }, ...slotEls),
        actions,
      ),
    )
  }

  return card
}
