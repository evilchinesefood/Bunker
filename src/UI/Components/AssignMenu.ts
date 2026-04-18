import type { GameState, Dweller } from '../../State/GameState'
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

  const locLabel = (d: Dweller): string => {
    if (!d.location) return 'Idle'
    if (d.location === roomId) return 'Here'
    const r = state.rooms.find(rm => rm.id === d.location)
    return r ? ROOM_CATALOG[r.typeId].name : 'Idle'
  }

  const eligible = state.dwellers.filter(d => {
    if (d.isChild) return false
    if (d.status === 'pregnant') return false
    return true
  })

  const sorted = eligible.slice().sort((a, b) => {
    const la = locLabel(a)
    const lb = locLabel(b)
    const aHere = la === 'Here'
    const bHere = lb === 'Here'
    if (aHere !== bHere) return aHere ? -1 : 1
    const aIdle = la === 'Idle'
    const bIdle = lb === 'Idle'
    if (aIdle !== bIdle) return aIdle ? -1 : 1
    if (la !== lb) return la.localeCompare(lb)
    return a.name.localeCompare(b.name)
  })

  const height = Math.min(400, sorted.length * 30 + 48)
  const [lx, ly] = clampToViewport(x, y, 320, height)

  const items = sorted.map(d => {
    const loc = locLabel(d)
    const here = loc === 'Here'
    const stats = (['str', 'int', 'end', 'cha'] as const).map(s =>
      h('span', { class: affStat === s ? 'stat-hl' : '' }, String(d.stats[s])),
    )
    return h(
      'button',
      {
        type: 'button',
        class: `assign-row${here ? ' assign-here' : ''}`,
        disabled: here,
        onclick: (() => {
          if (here) return
          onAssign(d.id)
          onClose()
        }) as EventListener,
      },
      icon('fa-user'),
      h('span', { class: 'aname' }, d.name),
      h('span', { class: `aloc ${loc === 'Idle' ? 'idle' : here ? 'here' : 'busy'}` }, loc),
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
      h('div', { class: 'assign-head' }, 'ASSIGN — ', ROOM_CATALOG[room.typeId].name),
      items.length
        ? h('div', { class: 'assign-list' }, ...items)
        : h('div', { class: 'empty' }, 'No available dwellers'),
    ),
  )
}
