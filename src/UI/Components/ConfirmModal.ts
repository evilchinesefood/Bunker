import { h } from '../Dom'

export function confirmModal(
  title: string,
  body: string,
  onConfirm: () => void,
  onClose: () => void,
): HTMLElement {
  return h(
    'div',
    { class: 'modal-backdrop', onclick: onClose },
    h(
      'div',
      { class: 'modal', onclick: (e: Event) => e.stopPropagation() },
      h('button', { class: 'close', onclick: onClose }, '×'),
      h('h2', {}, title),
      h('div', { class: 'confirm-body' }, body),
      h(
        'div',
        { class: 'confirm-actions' },
        h(
          'button',
          {
            onclick: onClose,
            style:
              'background:var(--bg-2);color:var(--fg);border:1px solid var(--border);padding:4px 10px;cursor:pointer;font-family:inherit;',
          },
          'CANCEL',
        ),
        h(
          'button',
          {
            onclick: () => {
              onConfirm()
              onClose()
            },
            style:
              'background:var(--bg-2);color:var(--bad);border:1px solid var(--bad);padding:4px 10px;cursor:pointer;font-family:inherit;',
          },
          'CONFIRM',
        ),
      ),
    ),
  )
}
