import { h } from '../Dom'
import { ui, type Toast } from '../UiState'

export function toastList(render: () => void): HTMLElement {
  const container = h('div', { class: 'toasts' })
  for (const t of ui.toasts) {
    container.appendChild(
      h(
        'div',
        {
          class: `toast ${t.kind}`,
          onclick: () => {
            ui.toasts = ui.toasts.filter(x => x.id !== t.id)
            render()
          },
        },
        h('div', { class: 'title' }, t.title),
        h('div', { class: 'body' }, t.body),
      ),
    )
  }
  return container
}

export type { Toast }
