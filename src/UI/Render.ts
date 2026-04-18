import type { GameState } from '../State/GameState'
import { h, icon, clear } from './Dom'
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
import { wipe } from '../Save/Storage'

export interface RenderCtx {
  state: GameState
  save: () => void
  reset: () => void
  render: () => void
}

export function render(ctx: RenderCtx): void {
  const root = document.getElementById('app')
  if (!root) return
  clear(root)

  root.appendChild(
    resourceBar(ctx.state, () => {
      ui.modal = {
        kind: 'confirm',
        title: 'RESET BUNKER',
        body: 'Wipe save and start a new bunker? This cannot be undone.',
        onConfirm: () => {
          wipe()
          ctx.reset()
        },
      }
      ctx.render()
    }),
  )

  const shortages: string[] = []
  if (ctx.state.resources.water <= 0) shortages.push('WATER — DWELLERS DEHYDRATING')
  if (ctx.state.resources.food <= 0) shortages.push('FOOD — DWELLERS STARVING')
  if (ctx.state.resources.power <= 0) shortages.push('POWER — SYSTEMS FAILING')
  if (shortages.length) {
    root.appendChild(
      h('div', { class: 'banner' }, icon('fa-triangle-exclamation'), ` ${shortages.join(' · ')}`),
    )
  }

  const rooms = h(
    'div',
    { class: 'rooms' },
    h(
      'div',
      { class: 'section-head' },
      'Rooms',
      h('span', { class: 'count' }, String(ctx.state.rooms.length)),
      h(
        'button',
        {
          onclick: () => {
            ui.modal = { kind: 'build' }
            ctx.render()
          },
        },
        '+ BUILD',
      ),
    ),
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
          ui.modal = {
            kind: 'confirm',
            title: 'DEMOLISH',
            body: 'Refund 50% of spent caps. Assigned dwellers go idle.',
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

  const main = h('div', { class: 'main' }, rooms, dwellers)
  root.appendChild(main)

  const log = h('div', { class: 'log' })
  const recent = ctx.state.eventLog.slice(-40).reverse()
  for (const e of recent) {
    const mins = Math.floor(e.tick / 60)
    const ts = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:${String(e.tick % 60).padStart(2, '0')}`
    log.appendChild(
      h('div', { class: `entry ${e.severity}` }, h('span', { class: 't' }, ts), e.text),
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
}
