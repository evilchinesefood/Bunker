import { h, icon } from '../Dom'
import { ui } from '../UiState'
import { setSoundEnabled, playSfx } from '../Audio'

export function gearMenu(
  onReset: () => void,
  onClose: () => void,
  requestRender: () => void,
): HTMLElement {
  const soundOn = ui.prefs.soundEnabled

  return h(
    'div',
    { class: 'modal-backdrop', onclick: onClose },
    h(
      'div',
      {
        class: 'modal gear-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'gear-title',
        onclick: ((e: Event) => e.stopPropagation()) as EventListener,
      },
      h('button', { class: 'close', type: 'button', 'aria-label': 'Close', onclick: onClose }, '×'),
      h('h2', { id: 'gear-title' }, icon('fa-gear'), ' SETTINGS'),
      h(
        'div',
        { class: 'gear-list' },
        h(
          'button',
          {
            type: 'button',
            class: 'gear-row',
            onclick: (() => {
              setSoundEnabled(!soundOn)
              if (!soundOn) playSfx('click')
              requestRender()
            }) as EventListener,
          },
          icon(soundOn ? 'fa-volume-high' : 'fa-volume-xmark'),
          h('span', {}, `Sound: ${soundOn ? 'On' : 'Off'}`),
          h('span', { class: 'gear-hint' }, 'toggle'),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'gear-row danger',
            onclick: (() => {
              onClose()
              onReset()
            }) as EventListener,
          },
          icon('fa-rotate-left'),
          h('span', {}, 'Reset bunker'),
          h('span', { class: 'gear-hint' }, 'confirm'),
        ),
      ),
    ),
  )
}
