import { h } from '../Dom'

export function confirmModal(
  title: string,
  body: string,
  onConfirm: () => void,
  onClose: () => void,
): HTMLElement {
  const cancelBtn = h(
    'button',
    { type: 'button', class: 'btn', onclick: onClose, autofocus: true },
    'CANCEL',
  )
  return h(
    'div',
    { class: 'modal-backdrop', onclick: onClose },
    h(
      'div',
      {
        class: 'modal confirm-modal',
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'confirm-title',
        'aria-describedby': 'confirm-body',
        onclick: ((e: Event) => e.stopPropagation()) as EventListener,
      },
      h('button', { class: 'close', type: 'button', 'aria-label': 'Close', onclick: onClose }, '×'),
      h('h2', { id: 'confirm-title' }, title),
      h('div', { id: 'confirm-body', class: 'confirm-body' }, body),
      h(
        'div',
        { class: 'confirm-actions' },
        cancelBtn,
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-danger',
            'aria-label': `Confirm destructive action: ${title}`,
            onclick: (() => {
              onConfirm()
              onClose()
            }) as EventListener,
          },
          'CONFIRM',
        ),
      ),
    ),
  )
}
