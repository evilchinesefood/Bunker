export type Attrs = Record<string, string | number | boolean | EventListener | null | undefined>

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = String(v)
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener)
    } else if (typeof v === 'boolean') {
      if (v) el.setAttribute(k, '')
    } else {
      el.setAttribute(k, String(v))
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return el
}

export function icon(fa: string, extra = ''): HTMLElement {
  return h('i', { class: `fa-solid ${fa} ${extra}`.trim() })
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString()
  return Math.round(n).toString()
}

export function fmtRate(n: number): string {
  const r = n * 60
  const sign = r >= 0 ? '+' : ''
  return `${sign}${r.toFixed(1)}/m`
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild)
}
