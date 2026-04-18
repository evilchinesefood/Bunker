import { MAX_TOASTS } from '../State/GameState'

export type Modal =
  | { kind: 'build' }
  | { kind: 'dweller'; dwellerId: string }
  | { kind: 'gear' }
  | { kind: 'confirm'; title: string; body: string; onConfirm: () => void }
  | null

export interface Toast {
  id: string
  kind: 'info' | 'milestone' | 'warn' | 'bad'
  title: string
  body: string
  expires: number
}

export interface AssignMenu {
  roomId: string
  x: number
  y: number
}

export interface Prefs {
  soundEnabled: boolean
}

export interface UiState {
  expandedRoomId: string | null
  modal: Modal
  toasts: Toast[]
  assignMenu: AssignMenu | null
  prefs: Prefs
}

const PREFS_KEY = 'bunkergame_prefs'

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return { soundEnabled: p.soundEnabled !== false }
    }
  } catch {}
  return { soundEnabled: true }
}

export function savePrefs(): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(ui.prefs))
  } catch {}
}

export const ui: UiState = {
  expandedRoomId: null,
  modal: null,
  toasts: [],
  assignMenu: null,
  prefs: loadPrefs(),
}

let toastSeq = 0
export function pushToast(kind: Toast['kind'], title: string, body: string): void {
  ui.toasts.push({
    id: `t${++toastSeq}`,
    kind,
    title,
    body,
    expires: Date.now() + 8000,
  })
  while (ui.toasts.length > MAX_TOASTS) ui.toasts.shift()
}

export function pruneToasts(): boolean {
  if (ui.toasts.length === 0) return false
  const now = Date.now()
  let earliest = Infinity
  for (const t of ui.toasts) if (t.expires < earliest) earliest = t.expires
  if (now < earliest) return false
  const before = ui.toasts.length
  ui.toasts = ui.toasts.filter(t => t.expires > now)
  return ui.toasts.length !== before
}

export function resetUi(): void {
  ui.expandedRoomId = null
  ui.modal = null
  ui.toasts = []
  ui.assignMenu = null
}
