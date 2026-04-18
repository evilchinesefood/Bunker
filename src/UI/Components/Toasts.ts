import { h } from '../Dom'
import { ui, type Toast } from '../UiState'

const PREFIX: Record<Toast['kind'], string> = {
  info: '[*]',
  milestone: '[+]',
  warn: '[!]',
  bad: '[X]',
}

export function toastList(render: () => void): HTMLElement {
  const container = h('div', {
    class: 'toasts',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'false',
  })
  for (const t of ui.toasts) {
    container.appendChild(
      h(
        'button',
        {
          type: 'button',
          class: `toast ${t.kind}`,
          'aria-label': `${t.title} (click to dismiss)`,
          onclick: (() => {
            ui.toasts = ui.toasts.filter(x => x.id !== t.id)
            render()
          }) as EventListener,
        },
        h('div', { class: 'title' }, `${PREFIX[t.kind]} ${t.title}`),
        h('div', { class: 'body' }, t.body),
      ),
    )
  }
  return container
}

export type { Toast }
