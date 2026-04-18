import { ui, savePrefs } from './UiState'

type SfxKind =
  | 'click'
  | 'build'
  | 'upgrade'
  | 'demolish'
  | 'assign'
  | 'birth'
  | 'recruit'
  | 'milestone'
  | 'fire'
  | 'shortage'
  | 'death'
  | 'toast'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let unlocked = false

function ensureCtx(): AudioContext | null {
  if (!unlocked) return null
  if (ctx) return ctx
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.15
  master.connect(ctx.destination)
  return ctx
}

export function unlockAudio(): void {
  if (unlocked) return
  unlocked = true
  ensureCtx()
  if (ctx && ctx.state === 'suspended') ctx.resume()
}

export function setSoundEnabled(on: boolean): void {
  ui.prefs.soundEnabled = on
  savePrefs()
  if (on) unlockAudio()
}

export function isSoundEnabled(): boolean {
  return ui.prefs.soundEnabled
}

interface Note {
  freq: number
  dur: number
  type?: OscillatorType
  gain?: number
  delay?: number
}

function playNotes(notes: Note[]): void {
  if (!ui.prefs.soundEnabled) return
  const c = ensureCtx()
  if (!c || !master) return
  const now = c.currentTime
  for (const n of notes) {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = n.type ?? 'square'
    osc.frequency.value = n.freq
    const start = now + (n.delay ?? 0)
    const end = start + n.dur
    const peak = n.gain ?? 0.4
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(peak, start + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(g)
    g.connect(master)
    osc.start(start)
    osc.stop(end + 0.02)
  }
}

const SFX: Record<SfxKind, Note[]> = {
  click: [{ freq: 1200, dur: 0.04, type: 'square', gain: 0.18 }],
  toast: [{ freq: 880, dur: 0.05, type: 'sine', gain: 0.22 }],
  build: [
    { freq: 440, dur: 0.08, type: 'square', gain: 0.3 },
    { freq: 660, dur: 0.1, type: 'square', gain: 0.3, delay: 0.08 },
  ],
  upgrade: [
    { freq: 523, dur: 0.07, type: 'square', gain: 0.3 },
    { freq: 659, dur: 0.07, type: 'square', gain: 0.3, delay: 0.07 },
    { freq: 784, dur: 0.12, type: 'square', gain: 0.3, delay: 0.14 },
  ],
  demolish: [{ freq: 160, dur: 0.22, type: 'sawtooth', gain: 0.35 }],
  assign: [{ freq: 900, dur: 0.06, type: 'triangle', gain: 0.22 }],
  birth: [
    { freq: 523, dur: 0.1, type: 'triangle', gain: 0.3 },
    { freq: 784, dur: 0.1, type: 'triangle', gain: 0.3, delay: 0.1 },
    { freq: 1047, dur: 0.18, type: 'triangle', gain: 0.3, delay: 0.2 },
  ],
  recruit: [
    { freq: 660, dur: 0.1, type: 'sine', gain: 0.3 },
    { freq: 990, dur: 0.12, type: 'sine', gain: 0.3, delay: 0.1 },
  ],
  milestone: [
    { freq: 523, dur: 0.1, type: 'triangle', gain: 0.3 },
    { freq: 659, dur: 0.1, type: 'triangle', gain: 0.3, delay: 0.1 },
    { freq: 784, dur: 0.1, type: 'triangle', gain: 0.3, delay: 0.2 },
    { freq: 1047, dur: 0.2, type: 'triangle', gain: 0.3, delay: 0.3 },
  ],
  fire: [
    { freq: 220, dur: 0.15, type: 'sawtooth', gain: 0.4 },
    { freq: 180, dur: 0.15, type: 'sawtooth', gain: 0.4, delay: 0.15 },
    { freq: 220, dur: 0.15, type: 'sawtooth', gain: 0.4, delay: 0.3 },
  ],
  shortage: [
    { freq: 500, dur: 0.08, type: 'square', gain: 0.3 },
    { freq: 400, dur: 0.08, type: 'square', gain: 0.3, delay: 0.1 },
    { freq: 500, dur: 0.08, type: 'square', gain: 0.3, delay: 0.2 },
  ],
  death: [
    { freq: 440, dur: 0.12, type: 'sawtooth', gain: 0.3 },
    { freq: 330, dur: 0.14, type: 'sawtooth', gain: 0.3, delay: 0.12 },
    { freq: 220, dur: 0.25, type: 'sawtooth', gain: 0.3, delay: 0.26 },
  ],
}

export function playSfx(kind: SfxKind): void {
  playNotes(SFX[kind])
}

document.addEventListener('pointerdown', unlockAudio, { once: true })
document.addEventListener('keydown', unlockAudio, { once: true })
