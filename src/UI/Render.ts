import type { GameState } from '../State/GameState'
import { h, icon, clear, clearOverlays } from './Dom'
import { ui, pushToast } from './UiState'
import { resourceBar } from './Components/ResourceBar'
import { roomCard } from './Components/RoomCard'
import { dwellerList } from './Components/DwellerList'
import { buildMenu } from './Components/BuildMenu'
import { dwellerModal } from './Components/DwellerModal'
import { confirmModal } from './Components/ConfirmModal'
import { toastList } from './Components/Toasts'
import { assignMenu } from './Components/AssignMenu'
import {
  assignDweller,
  buildRoom,
  demolishRoom,
  unassignDweller,
  upgradeRoom,
} from '../State/Reducers'
import { ROOM_CATALOG, upgradeCost } from '../Domain/Rooms'
import { fmt } from './Dom'

const SEV_PREFIX: Record<string, string> = { warn: '[!]', bad: '[X]', good: '[+]', info: '[*]' }

export interface RenderCtx {
  state: GameState
  save: () => void
  reset: () => void
  render: () => void
}

function computeRefund(state: GameState, roomId: string): number {
  const r = state.rooms.find(x => x.id === roomId)
  if (!r) return 0
  const t = ROOM_CATALOG[r.typeId]
  let spent = t.baseCost
  for (let l = 1; l < r.level; l++) spent += upgradeCost(t, l as 1 | 2 | 3)
  return Math.round(spent * t.demolishRefundPct)
}

export function render(ctx: RenderCtx): void {
  const root = document.getElementById('app')
  if (!root) return
  clear(root)
  clearOverlays()

  root.appendChild(
    resourceBar(ctx.state, () => {
      ui.modal = {
        kind: 'confirm',
        title: 'RESET BUNKER',
        body: 'Wipe save and start a new bunker? This cannot be undone.',
        onConfirm: ctx.reset,
      }
      ctx.render()
    }),
  )

  const shortages: string[] = []
  if (ctx.state.resources.water <= 0) shortages.push('WATER — DWELLERS DEHYDRATING')
  if (ctx.state.resources.food <= 0) shortages.push('FOOD — DWELLERS STARVING')
  if (shortages.length) {
    root.appendChild(
      h(
        'div',
        { class: 'banner', role: 'alert' },
        icon('fa-triangle-exclamation'),
        ` ${shortages.join(' · ')}`,
      ),
    )
  }

  const anyExpanded = ui.expandedRoomId !== null
  const roomsHead = h(
    'div',
    { class: 'section-head' },
    h('span', {}, 'Rooms'),
    h('span', { class: 'count' }, String(ctx.state.rooms.length)),
    anyExpanded
      ? h(
          'button',
          {
            type: 'button',
            'aria-label': 'Collapse expanded room',
            onclick: () => {
              ui.expandedRoomId = null
              ctx.render()
            },
          },
          'COLLAPSE',
        )
      : null,
    h(
      'button',
      {
        type: 'button',
        onclick: () => {
          ui.modal = { kind: 'build' }
          ctx.render()
        },
      },
      '+ BUILD',
    ),
  )

  const rooms = h(
    'section',
    { class: 'rooms', 'aria-label': 'Rooms' },
    roomsHead,
    ...ctx.state.rooms.map(r =>
      roomCard(ctx.state, r, {
        onToggle: id => {
          ui.expandedRoomId = ui.expandedRoomId === id ? null : id
          ctx.render()
        },
        onOpenAssign: (roomId, x, y) => {
          ui.assignMenu = { roomId, x, y }
          ctx.render()
        },
        onUnassign: (_roomId, dId) => {
          unassignDweller(ctx.state, dId)
          ctx.save()
          ctx.render()
        },
        onUpgrade: id => {
          if (upgradeRoom(ctx.state, id)) {
            pushToast('info', 'UPGRADED', 'Room leveled up.')
            ctx.save()
            ctx.render()
          }
        },
        onDemolish: id => {
          const refund = computeRefund(ctx.state, id)
          ui.modal = {
            kind: 'confirm',
            title: 'DEMOLISH',
            body: `Refund: ${fmt(refund)} caps. Assigned dwellers become idle.`,
            onConfirm: () => {
              demolishRoom(ctx.state, id)
              if (ui.expandedRoomId === id) ui.expandedRoomId = null
              ctx.save()
              ctx.render()
            },
          }
          ctx.render()
        },
        onOpenDweller: id => {
          ui.modal = { kind: 'dweller', dwellerId: id }
          ctx.render()
        },
      }),
    ),
  )

  const dwellers = dwellerList(ctx.state, id => {
    ui.modal = { kind: 'dweller', dwellerId: id }
    ctx.render()
  })

  const main = h('main', { class: 'main' }, rooms, dwellers)
  root.appendChild(main)

  const log = h('footer', {
    class: 'log',
    role: 'log',
    'aria-live': 'polite',
    'aria-label': 'Event log',
  })
  const recent = ctx.state.eventLog.slice(-40)
  for (let i = recent.length - 1; i >= 0; i--) {
    const e = recent[i]
    const mins = Math.floor(e.tick / 60)
    const ts = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:${String(e.tick % 60).padStart(2, '0')}`
    log.appendChild(
      h(
        'div',
        { class: `entry ${e.severity}` },
        h('span', { class: 't' }, ts),
        h('span', { class: 'sev' }, SEV_PREFIX[e.severity] ?? '[*]'),
        e.text,
      ),
    )
  }
  root.appendChild(log)

  if (ui.modal?.kind === 'build') {
    document.body.appendChild(
      buildMenu(
        ctx.state,
        typeId => {
          const r = buildRoom(ctx.state, typeId)
          if (r) {
            pushToast('info', 'BUILT', 'Room added.')
            ctx.save()
          }
        },
        () => {
          ui.modal = null
          ctx.render()
        },
      ),
    )
  } else if (ui.modal?.kind === 'dweller') {
    const did = ui.modal.dwellerId
    document.body.appendChild(
      dwellerModal(
        ctx.state,
        did,
        (dwellerId, roomId) => {
          if (roomId) assignDweller(ctx.state, dwellerId, roomId)
          else unassignDweller(ctx.state, dwellerId)
          ctx.save()
          ctx.render()
        },
        () => {
          ui.modal = null
          ctx.render()
        },
      ),
    )
  } else if (ui.modal?.kind === 'confirm') {
    const m = ui.modal
    document.body.appendChild(
      confirmModal(m.title, m.body, m.onConfirm, () => {
        ui.modal = null
        ctx.render()
      }),
    )
  }

  if (ui.assignMenu) {
    const am = ui.assignMenu
    document.body.appendChild(
      assignMenu(
        ctx.state,
        am.roomId,
        am.x,
        am.y,
        dId => {
          assignDweller(ctx.state, dId, am.roomId)
          ctx.save()
        },
        () => {
          ui.assignMenu = null
          ctx.render()
        },
      ),
    )
  }

  document.body.appendChild(toastList(ctx.render))

  const firstFocusable = document.querySelector<HTMLElement>(
    '.modal [autofocus], .modal .close, .modal button, .modal select, .modal input',
  )
  if (firstFocusable && document.activeElement === document.body) {
    firstFocusable.focus()
  }
}

export function installGlobalKeyboard(handler: (key: string) => void): void {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') handler('Escape')
  })
}
