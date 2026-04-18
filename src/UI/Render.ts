import type { GameState } from '../State/GameState'
import { h, icon, clear, fmt } from './Dom'
import { ui, pushToast } from './UiState'
import { resourceBar } from './Components/ResourceBar'
import { roomCard } from './Components/RoomCard'
import { dwellerList } from './Components/DwellerList'
import { buildMenu } from './Components/BuildMenu'
import { dwellerModal } from './Components/DwellerModal'
import { confirmModal } from './Components/ConfirmModal'
import { toastList } from './Components/Toasts'
import { assignMenu } from './Components/AssignMenu'
import { gearMenu } from './Components/GearMenu'
import {
  assignDweller,
  buildRoom,
  demolishRoom,
  unassignDweller,
  upgradeRoom,
} from '../State/Reducers'
import { ROOM_CATALOG, upgradeCost } from '../Domain/Rooms'
import { playSfx } from './Audio'

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

function captureScrolls(root: HTMLElement): Map<string, number> {
  const out = new Map<string, number>()
  const targets = root.querySelectorAll<HTMLElement>('.rooms,.dwellers,.log')
  targets.forEach(el => {
    const key = el.className.split(' ')[0]
    out.set(key, el.scrollTop)
  })
  return out
}

function restoreScrolls(root: HTMLElement, scrolls: Map<string, number>): void {
  scrolls.forEach((top, key) => {
    const el = root.querySelector<HTMLElement>(`.${key}`)
    if (el) el.scrollTop = top
  })
}

function openGearMenu(ctx: RenderCtx): void {
  ui.modal = { kind: 'gear' }
  renderOverlays(ctx)
}

function openResetConfirm(ctx: RenderCtx): void {
  ui.modal = {
    kind: 'confirm',
    title: 'RESET BUNKER',
    body: 'Wipe save and start a new bunker? This cannot be undone.',
    onConfirm: ctx.reset,
  }
  renderOverlays(ctx)
}

export function renderApp(ctx: RenderCtx): void {
  const root = document.getElementById('app')
  if (!root) return
  const scrolls = captureScrolls(root)
  clear(root)

  root.appendChild(resourceBar(ctx.state, () => openGearMenu(ctx)))

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
              playSfx('click')
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
          playSfx('click')
          ui.modal = { kind: 'build' }
          renderOverlays(ctx)
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
          playSfx('click')
          ui.expandedRoomId = ui.expandedRoomId === id ? null : id
          ctx.render()
        },
        onOpenAssign: (roomId, x, y) => {
          playSfx('click')
          ui.assignMenu = { roomId, x, y }
          renderOverlays(ctx)
        },
        onUnassign: (_roomId, dId) => {
          playSfx('assign')
          unassignDweller(ctx.state, dId)
          ctx.save()
          ctx.render()
        },
        onUpgrade: id => {
          if (upgradeRoom(ctx.state, id)) {
            playSfx('upgrade')
            pushToast('info', 'UPGRADED', 'Room leveled up.')
            ctx.save()
            ctx.render()
          }
        },
        onDemolish: id => {
          playSfx('click')
          const refund = computeRefund(ctx.state, id)
          ui.modal = {
            kind: 'confirm',
            title: 'DEMOLISH',
            body: `Refund: ${fmt(refund)} caps. Assigned dwellers become idle.`,
            onConfirm: () => {
              playSfx('demolish')
              demolishRoom(ctx.state, id)
              if (ui.expandedRoomId === id) ui.expandedRoomId = null
              ctx.save()
              ctx.render()
            },
          }
          renderOverlays(ctx)
        },
        onOpenDweller: id => {
          playSfx('click')
          ui.modal = { kind: 'dweller', dwellerId: id }
          renderOverlays(ctx)
        },
      }),
    ),
  )

  const dwellers = dwellerList(ctx.state, id => {
    playSfx('click')
    ui.modal = { kind: 'dweller', dwellerId: id }
    renderOverlays(ctx)
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

  restoreScrolls(root, scrolls)
}

export function renderOverlays(ctx: RenderCtx): void {
  const overlays = document.getElementById('overlays')
  if (!overlays) return
  clear(overlays)

  if (ui.modal?.kind === 'build') {
    overlays.appendChild(
      buildMenu(
        ctx.state,
        typeId => {
          const r = buildRoom(ctx.state, typeId)
          if (r) {
            playSfx('build')
            pushToast('info', 'BUILT', 'Room added.')
            ctx.save()
            ctx.render()
          }
        },
        () => {
          ui.modal = null
          renderOverlays(ctx)
        },
      ),
    )
  } else if (ui.modal?.kind === 'dweller') {
    const did = ui.modal.dwellerId
    overlays.appendChild(
      dwellerModal(
        ctx.state,
        did,
        (dwellerId, roomId) => {
          playSfx('assign')
          if (roomId) assignDweller(ctx.state, dwellerId, roomId)
          else unassignDweller(ctx.state, dwellerId)
          ctx.save()
          ctx.render()
        },
        () => {
          ui.modal = null
          renderOverlays(ctx)
        },
      ),
    )
  } else if (ui.modal?.kind === 'gear') {
    overlays.appendChild(
      gearMenu(
        () => openResetConfirm(ctx),
        () => {
          ui.modal = null
          renderOverlays(ctx)
        },
        () => renderOverlays(ctx),
      ),
    )
  } else if (ui.modal?.kind === 'confirm') {
    const m = ui.modal
    overlays.appendChild(
      confirmModal(m.title, m.body, m.onConfirm, () => {
        ui.modal = null
        renderOverlays(ctx)
      }),
    )
  }

  if (ui.assignMenu) {
    const am = ui.assignMenu
    overlays.appendChild(
      assignMenu(
        ctx.state,
        am.roomId,
        am.x,
        am.y,
        dId => {
          playSfx('assign')
          assignDweller(ctx.state, dId, am.roomId)
          ctx.save()
          ctx.render()
        },
        () => {
          ui.assignMenu = null
          renderOverlays(ctx)
        },
      ),
    )
  }

  overlays.appendChild(toastList(() => renderOverlays(ctx)))

  const autoFocus = overlays.querySelector<HTMLElement>('[autofocus], .modal .close')
  if (autoFocus && !overlays.contains(document.activeElement)) {
    autoFocus.focus()
  }
}

export function render(ctx: RenderCtx): void {
  renderApp(ctx)
  renderOverlays(ctx)
}

export function installGlobalKeyboard(handler: (key: string) => void): void {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') handler('Escape')
  })
}
