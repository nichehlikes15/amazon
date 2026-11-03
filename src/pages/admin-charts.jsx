import { useEffect, useRef, useState } from 'react'

/*
  Small charts for the admin dashboard, drawn with SVG (no chart library).
  Colours are Amazon's only: Amazon Orange, Squid Ink, and greys and a light
  orange mixed from them. They are CSS variables set on .ak in admin.css, so
  dark mode can swap them.
*/

export const C = {
  orange: 'var(--ak-orange)',
  ink: 'var(--ak-ink)',
  grey: 'var(--ak-grey)',
  light: 'var(--ak-light)',
  peach: 'var(--ak-peach)',
  deep: 'var(--ak-deep)',
}

const fmtDay = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const sum = (list) => list.reduce((a, b) => a + b, 0)

// Width of an element, kept up to date when the window changes size.
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver((entries) => setWidth(Math.round(entries[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// A smooth line through the points that never overshoots (so it can't dip
// below 0 between two days). "Monotone" curve, like most chart libraries use.
function smoothPath(pts) {
  const n = pts.length
  if (n === 0) return ''
  const f = (v) => v.toFixed(1)
  if (n < 3) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ')
  const dx = []
  const m = []
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]
  }
  const tan = [m[0]]
  for (let i = 1; i < n - 1; i += 1) tan[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  tan[n - 1] = m[n - 2]
  for (let i = 0; i < n - 1; i += 1) {
    if (m[i] === 0) {
      tan[i] = 0
      tan[i + 1] = 0
    } else {
      const a = tan[i] / m[i]
      const b = tan[i + 1] / m[i]
      const s = a * a + b * b
      if (s > 9) {
        const k = 3 / Math.sqrt(s)
        tan[i] = k * a * m[i]
        tan[i + 1] = k * b * m[i]
      }
    }
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const h = dx[i] / 3
    d += ` C${f(x0 + h)} ${f(y0 + tan[i] * h)} ${f(x1 - h)} ${f(y1 - tan[i + 1] * h)} ${f(x1)} ${f(y1)}`
  }
  return d
}

// Round the top of the scale up to a tidy number, split into 4 steps.
function niceScale(max) {
  const step = Math.max(1, Math.ceil(max / 4))
  return { top: step * 4, step }
}

/* ---------- Tiny trend line for a number (last 14 days) ---------- */
export function Sparkline({ values = [], color = C.orange, label }) {
  const w = 112
  const h = 34
  const pad = 3
  if (!values.length) return null
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => [
    pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1),
    h - pad - (v / max) * (h - pad * 2),
  ])
  const line = smoothPath(pts)
  const last = pts[pts.length - 1]
  const area = `${line} L${last[0].toFixed(1)} ${h - pad} L${pts[0][0].toFixed(1)} ${h - pad} Z`
  return (
    <svg className="ak-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label={label || `Last 14 days: ${sum(values)} in total`}>
      <path className="ak-spark-area" d={area} style={{ fill: color }} />
      <path className="ak-spark-line" d={line} pathLength="1" style={{ stroke: color }} />
      <circle className="ak-spark-dot" cx={last[0]} cy={last[1]} r="2.8" style={{ fill: color }} />
    </svg>
  )
}

/* ---------- Ring showing a percentage (e.g. pages rated helpful) ---------- */
export function Ring({ percent, size = 64, stroke = 7, color = C.orange, label, children }) {
  const r = (size - stroke) / 2
  const p = Math.max(0, Math.min(100, percent || 0))
  return (
    <span className="ak-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label || `${p}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ak-ring-track" style={{ strokeWidth: stroke }} />
        <circle cx={size / 2} cy={size / 2} r={r} pathLength="100" className="ak-ring-value"
          style={{ stroke: color, strokeWidth: stroke, strokeLinecap: p > 0 ? 'round' : 'butt', '--dash': `${p} 100` }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      {children && <span className="ak-ring-label">{children}</span>}
    </span>
  )
}

/* ---------- Line chart: activity over the last 14 days ---------- */
export function ActivityChart({ days = [], series = [] }) {
  const [ref, width] = useWidth()
  const [hidden, setHidden] = useState(() => new Set())
  const [hover, setHover] = useState(null)

  const shown = series.filter((s) => !hidden.has(s.key))
  const max = Math.max(1, ...shown.flatMap((s) => s.values))
  const { top, step } = niceScale(max)

  const h = 230
  const pad = { l: 30, r: 12, t: 14, b: 30 }
  const w = Math.max(width, 280)
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const x = (i) => pad.l + (days.length > 1 ? (i * innerW) / (days.length - 1) : innerW / 2)
  const y = (v) => pad.t + innerH - (v / top) * innerH
  const every = w < 520 ? 3 : w < 820 ? 2 : 1

  const toggle = (key) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else if (series.length - next.size > 1) next.add(key) // always keep one line
      return next
    })
  }

  const pick = (clientX) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box || !days.length) return
    const px = ((clientX - box.left) / box.width) * w
    const i = Math.round(((px - pad.l) / innerW) * (days.length - 1))
    setHover(Math.max(0, Math.min(days.length - 1, i)))
  }

  const total = sum(series.flatMap((s) => s.values))

  return (
    <div className="ak-activity">
      <div className="ak-legend" role="group" aria-label="Show or hide lines">
        {series.map((s) => (
          <button key={s.key} type="button" className={hidden.has(s.key) ? 'ak-legend-item is-off' : 'ak-legend-item'}
            aria-pressed={!hidden.has(s.key)} onClick={() => toggle(s.key)}>
            <span className="ak-legend-swatch" style={{ background: s.color }} />
            {s.label}
            <span className="ak-legend-total">{sum(s.values)}</span>
          </button>
        ))}
      </div>

      <div className="ak-activity-plot" ref={ref}
        onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)}
        tabIndex={0} role="img"
        aria-label={`Activity in the last 14 days: ${total} actions in total. Use the left and right arrow keys to read each day.`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setHover((i) => (i === null ? 0 : Math.min(days.length - 1, i + 1)))
          if (e.key === 'ArrowLeft') setHover((i) => (i === null ? days.length - 1 : Math.max(0, i - 1)))
          if (e.key === 'Escape') setHover(null)
        }}
        onBlur={() => setHover(null)}>
        {width > 0 && (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
            {/* scale */}
            {[0, 1, 2, 3, 4].map((n) => (
              <g key={n}>
                <line x1={pad.l} x2={w - pad.r} y1={y(n * step)} y2={y(n * step)} className={n ? 'ak-grid' : 'ak-axis'} />
                <text x={pad.l - 8} y={y(n * step) + 4} className="ak-tick" textAnchor="end">{n * step}</text>
              </g>
            ))}
            {days.map((d, i) => (i % every === 0 || i === days.length - 1) && (
              <text key={d} x={x(i)} y={h - 8} className="ak-tick" textAnchor="middle">{fmtDay(d)}</text>
            ))}

            {/* hover guide */}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} className="ak-guide" />}

            {/* lines */}
            {shown.map((s) => {
              const d = smoothPath(s.values.map((v, i) => [x(i), y(v)]))
              return (
                <path key={`${s.key}-${top}`} d={d} pathLength="1" className={s.dashed ? 'ak-line is-dashed' : 'ak-line'}
                  style={{ stroke: s.color }} />
              )
            })}
            {hover !== null && shown.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r="4.5" className="ak-point" style={{ fill: s.color }} />
            ))}
          </svg>
        )}

        {hover !== null && width > 0 && (
          <div className={x(hover) > w * 0.65 ? 'ak-tip is-left' : 'ak-tip'} style={{ left: `${(x(hover) / w) * 100}%` }}>
            <strong>{fmtDay(days[hover])}</strong>
            {shown.map((s) => (
              <span key={s.key}><i style={{ background: s.color }} />{s.label}<b>{s.values[hover]}</b></span>
            ))}
          </div>
        )}
      </div>

      {/* The same numbers as a table, for screen readers */}
      <table className="visually-hidden">
        <caption>Activity in the last 14 days</caption>
        <thead><tr><th>Day</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d}><td>{fmtDay(d)}</td>{series.map((s) => <td key={s.key}>{s.values[i]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- Donut: share of a total (e.g. coffee chats by status) ---------- */
export function Donut({ items = [], centreLabel = 'in total' }) {
  const [active, setActive] = useState(null)
  const total = sum(items.map((i) => i.value))
  const size = 168
  const stroke = 24
  const r = (size - stroke) / 2
  const gap = items.filter((i) => i.value > 0).length > 1 ? 0.8 : 0
  let start = 0
  const segs = items.filter((i) => i.value > 0).map((it) => {
    const pct = (it.value / total) * 100
    const seg = { ...it, pct, start }
    start += pct
    return seg
  })
  const focus = active ? items.find((i) => i.key === active) : null

  if (!total) return <p className="ak-none">Nothing yet</p>

  return (
    <div className="ak-donut">
      <div className="ak-donut-chart">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
          aria-label={items.map((i) => `${i.label}: ${i.value}`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} className="ak-ring-track" style={{ strokeWidth: stroke }} />
          {segs.map((s, n) => (
            <circle key={s.key} cx={size / 2} cy={size / 2} r={r} pathLength="100"
              className={active && active !== s.key ? 'ak-seg is-dim' : 'ak-seg'}
              style={{
                stroke: s.color,
                strokeWidth: stroke,
                '--dash': `${Math.max(0, s.pct - gap)} ${100 - Math.max(0, s.pct - gap)}`,
                strokeDashoffset: -s.start,
                animationDelay: `${n * 0.08}s`,
              }}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              onMouseEnter={() => setActive(s.key)} onMouseLeave={() => setActive(null)} />
          ))}
        </svg>
        <span className="ak-donut-centre" aria-hidden="true">
          <strong>{focus ? focus.value : total}</strong>
          <span>{focus ? focus.label : centreLabel}</span>
        </span>
      </div>
      <ul className="ak-donut-key">
        {items.map((it) => (
          <li key={it.key} className={active && active !== it.key ? 'is-dim' : ''}
            onMouseEnter={() => setActive(it.key)} onMouseLeave={() => setActive(null)}>
            <span className="ak-legend-swatch" style={{ background: it.color }} />
            <span className="ak-key-label">{it.label}</span>
            <span className="ak-key-num">{it.value}</span>
            <span className="ak-key-pct">{total ? Math.round((it.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Two bars per row (e.g. interest and quiz results per pathway) ---------- */
export function PairBars({ rows = [], a, b }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]))
  return (
    <div className="ak-pairs">
      <div className="ak-legend is-static">
        <span className="ak-legend-item"><span className="ak-legend-swatch" style={{ background: a.color }} />{a.label}</span>
        <span className="ak-legend-item"><span className="ak-legend-swatch" style={{ background: b.color }} />{b.label}</span>
      </div>
      <ul>
        {rows.map((r, n) => (
          <li key={r.label} style={{ '--n': n }}>
            <span className="ak-pair-label">{r.label}</span>
            <span className="ak-pair-bars">
              <span className="ak-pair-line">
                <span className="ak-hbar"><span style={{ width: `${(r.a / max) * 100}%`, background: a.color }} /></span>
                <b aria-label={`${a.label}: ${r.a}`}>{r.a}</b>
              </span>
              <span className="ak-pair-line">
                <span className="ak-hbar"><span style={{ width: `${(r.b / max) * 100}%`, background: b.color }} /></span>
                <b aria-label={`${b.label}: ${r.b}`}>{r.b}</b>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- One bar split into parts (e.g. practice scores) ---------- */
export function StackBar({ parts = [] }) {
  const total = sum(parts.map((p) => p.value))
  if (!total) return <p className="ak-none">Nothing yet</p>
  return (
    <div className="ak-stack">
      <div className="ak-stack-bar" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <span key={p.key} style={{ flexGrow: p.value, background: p.color }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className="ak-donut-key is-row">
        {parts.map((p) => (
          <li key={p.key}>
            <span className="ak-legend-swatch" style={{ background: p.color }} />
            <span className="ak-key-label">{p.label}</span>
            <span className="ak-key-num">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Ranked list with bars (e.g. most saved opportunities) ---------- */
export function RankBars({ items = [], color = C.orange, empty = 'Nothing yet' }) {
  if (!items.length) return <p className="ak-none">{empty}</p>
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ol className="ak-rank">
      {items.map((it, n) => (
        <li key={it.label} style={{ '--n': n }}>
          <span className="ak-rank-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
          <span className="ak-rank-body">
            <span className="ak-rank-top">
              <span className="ak-rank-label">{it.label}</span>
              <b>{it.display ?? it.value}</b>
            </span>
            <span className="ak-hbar"><span style={{ width: `${(it.value / max) * 100}%`, background: it.color || color }} /></span>
          </span>
        </li>
      ))}
    </ol>
  )
}
