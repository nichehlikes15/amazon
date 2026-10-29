import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../modules/api'
import { Icon, PathwayIcon, closingLabel } from '../modules/icons'

/*
  My profile > Applications: every opportunity you've saved or started, in
  columns by stage. Drag a card to another column, or use its Stage menu
  (works with a keyboard and screen readers too).
*/

const STAGES = ['Not started', 'Preparing', 'Applied', 'Interview', 'Offer', 'Unsuccessful']

const COLUMNS = [
  { id: 'saved', title: 'Saved', stages: ['Not started'], drop: 'Not started', empty: 'Save an opportunity to start' },
  { id: 'preparing', title: 'Preparing', stages: ['Preparing'], drop: 'Preparing', empty: 'Nothing here yet' },
  { id: 'applied', title: 'Applied', stages: ['Applied'], drop: 'Applied', empty: 'Nothing here yet' },
  { id: 'interview', title: 'Interview', stages: ['Interview'], drop: 'Interview', empty: 'Nothing here yet' },
  { id: 'result', title: 'Result', stages: ['Offer', 'Unsuccessful'], drop: 'Offer', empty: 'Nothing here yet' },
]

export default function ApplicationBoard() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [over, setOver] = useState(null)

  useEffect(() => {
    let live = true
    api.myApplications()
      .then((d) => { if (live) setItems(d.items || []) })
      .catch((err) => { if (live) { setError(err.message); setItems([]) } })
    return () => { live = false }
  }, [])

  const move = async (id, status) => {
    const item = items.find((i) => i.id === id)
    if (!item || item.status === status) return
    const before = items
    setError('')
    setItems((list) => list.map((i) => (i.id === id ? { ...i, status } : i)))
    try {
      await api.updateProgress(id, { status, notes: item.notes || '' })
    } catch (err) {
      setItems(before)
      setError(err.message)
    }
  }

  const onDrop = (e, col) => {
    e.preventDefault()
    setOver(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (id) move(id, col.drop)
  }

  if (items === null) return <p className="pf-empty">Loading…</p>

  return (
    <div className="pf-section">
      <div className="pf-section-head">
        <h2>Applications <span className="pf-count">{items.length}</span></h2>
        <Link className="pf-link" to="/opportunities">Find more <Icon name="arrowRight" size={14} /></Link>
      </div>
      <p className="ab-intro">
        Drag a card to the stage you have reached, or choose it from the card&apos;s Stage menu.
        It updates the tracker on the opportunity&apos;s page too.
      </p>
      {error && <div className="pf-error" role="alert">{error}</div>}

      {items.length === 0 ? (
        <div className="pr-empty">
          <span className="pr-empty-icon"><Icon name="check" size={22} /></span>
          <div>
            <strong>No applications yet</strong>
            <p>Save an opportunity, or set a stage on an opportunity&apos;s page, and it will show here.</p>
          </div>
          <Link className="primary-button" to="/opportunities">Browse opportunities <Icon name="arrowRight" size={15} /></Link>
        </div>
      ) : (
        <div className="ab-board">
          {COLUMNS.map((col) => {
            const cards = items.filter((i) => col.stages.includes(i.status))
            return (
              <section
                key={col.id}
                className={over === col.id ? 'ab-col is-over' : 'ab-col'}
                aria-labelledby={`ab-${col.id}`}
                onDragOver={(e) => { e.preventDefault(); setOver(col.id) }}
                onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
                onDrop={(e) => onDrop(e, col)}
              >
                <h3 id={`ab-${col.id}`}>
                  {col.title} <span>{cards.length}</span>
                </h3>
                {cards.length === 0 && <p className="ab-empty">{col.empty}</p>}
                <ul>
                  {cards.map((o) => {
                    const closing = closingLabel(o.closingDate)
                    return (
                      <li
                        key={o.id}
                        className="ab-card"
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(o.id)); e.dataTransfer.effectAllowed = 'move' }}
                        onDragEnd={() => setOver(null)}
                      >
                        <span className="ab-card-path"><PathwayIcon pathway={o.pathway} size={14} /> {o.pathway}</span>
                        <Link className="ab-card-title" to={`/opportunities/${o.id}`}>{o.title}</Link>
                        <span className="ab-card-meta">{o.employer} · {o.location}</span>
                        {closing && <span className={`ab-card-closing is-${closing.tone}`}>{closing.text}</span>}
                        {(o.status === 'Offer' || o.status === 'Unsuccessful') && (
                          <span className={o.status === 'Offer' ? 'ab-result is-offer' : 'ab-result'}>{o.status}</span>
                        )}
                        <label className="ab-stage">
                          <span>Stage</span>
                          <select value={o.status} onChange={(e) => move(o.id, e.target.value)}>
                            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
