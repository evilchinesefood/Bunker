export type Modal =
  | { kind: 'build' }
  | { kind: 'dweller'; dwellerId: string }
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

export interface UiState {
  expandedRoomId: string | null
  modal: Modal
  toasts: Toast[]
  assignMenu: AssignMenu | null
}

export const ui: UiState = {
  expandedRoomId: null,
  modal: null,
  toasts: [],
  assignMenu: null,
}

export function pushToast(kind: Toast['kind'], title: string, body: string): void {
  ui.toasts.push({
    id: Math.random().toString(36).slice(2, 9),
    kind,
    title,
    body,
    expires: Date.now() + 8000,
  })
  if (ui.toasts.length > 6) ui.toasts.splice(0, ui.toasts.length - 6)
}

export function pruneToasts(): boolean {
  const now = Date.now()
  const before = ui.toasts.length
  ui.toasts = ui.toasts.filter(t => t.expires > now)
  return ui.toasts.length !== before
}
