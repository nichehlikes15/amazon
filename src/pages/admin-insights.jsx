import { useEffect, useState } from 'react'
import { api } from '../modules/api'
import { Icon } from '../modules/icons'

/*
  Admin: the project's KPIs at a glance, and the "Was this page helpful?"
  answers. Both can be downloaded as CSV files for the Task 3 analysis.
*/

const ROLE_LABELS = { student: 'Students', parent: 'Parents and carers', school: 'Schools and colleges' }

// Turn rows into a CSV file and download it.
export function downloadCsv(filename, headers, rows) {
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const text = [headers, ...rows].map((r) => r.map(cell).join(',')).join('\n')
  const blob = new Blob([`\ufeff${text}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Tile({ icon, label, value, sub }) {
  return (
    <div className="ak-tile">
      <span className="ak-tile-icon"><Icon name={icon} size={18} /></span>
      <span className="ak-tile-label">{label}</span>
      <strong className="ak-tile-value">{value}</strong>
      {sub && <span className="ak-tile-sub">{sub}</span>}
    </div>
  )
}

// Small horizontal bar list, e.g. interest by pathway.
function Bars({ title, data, labels = {} }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map(([, n]) => n))
  return (
    <div className="ak-bars">
      <h4>{title}</h4>
      {entries.length === 0 ? (
        <p className="ak-none">Nothing yet</p>
      ) : (
        <ul>
          {entries.map(([k, n]) => (
            <li key={k}>
              <span className="ak-bar-label">{labels[k] || k}</span>
              <span className="ak-bar-track" aria-hidden="true">
                <span style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className="ak-bar-num">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AdminKpis() {
  const [k, setK] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.adminKpis().then(setK).catch((err) => setError(err.message))
  }, [])

  return (
    <section className="content-section ak">
      <div className="ak-head">
        <h2 className="admin-section-title">Key numbers (KPIs)</h2>
        <p>Live counts from the database. Use them to check the project's KPIs.</p>
      </div>

      {error && <div className="auth-error" role="alert">{error}</div>}
      {!k && !error && <p className="admin-status">Loading…</p>}

      {k && (
        <>
          <div className="ak-tiles">
            <Tile icon="user" label="Accounts" value={k.users.total} sub={`${k.users.last7} new this week · ${k.users.last30} in 30 days`} />
            <Tile icon="mail" label="Expressions of interest" value={k.interest.total} sub={`${k.interest.last30} in the last 30 days`} />
            <Tile icon="check" label="Career quizzes finished" value={k.quiz.completed} />
            <Tile icon="calendar" label="Coffee chat requests" value={k.coffeeChats.total} sub={`${k.coffeeChats.under18} from under-18s`} />
            <Tile icon="video" label="Practice interviews" value={k.practice.calls}
              sub={k.practice.calls ? `${k.practice.people} people · average score ${k.practice.averageScore}` : 'None yet'} />
            <Tile icon="file" label="CVs checked" value={k.cvs.uploaded}
              sub={k.cvs.uploaded ? `Average score ${k.cvs.averageScore}` : 'None yet'} />
            <Tile icon="bookmark" label="Opportunities saved" value={k.saved.total} />
            <Tile icon="heart" label="Pages rated helpful"
              value={k.feedback.helpfulPercent === null ? '-' : `${k.feedback.helpfulPercent}%`}
              sub={`${k.feedback.total} ${k.feedback.total === 1 ? 'answer' : 'answers'}`} />
          </div>

          <div className="ak-breakdowns">
            <Bars title="Interest by who's asking" data={k.interest.byRole} labels={ROLE_LABELS} />
            <Bars title="Interest by pathway" data={k.interest.byPathway} />
            <Bars title="Quiz results by pathway" data={k.quiz.byPathway} />
            <Bars title="Coffee chats by status" data={k.coffeeChats.byStatus} />
          </div>

          {k.saved.mostSaved.length > 0 && (
            <div className="ak-list">
              <h4>Most saved opportunities</h4>
              <ol>
                {k.saved.mostSaved.map((o) => <li key={o.title}><span>{o.title}</span><strong>{o.count}</strong></li>)}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export function AdminFeedback() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [show, setShow] = useState('all') // all | no | comments

  useEffect(() => {
    api.listFeedback()
      .then((d) => setItems(d.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const shown = items.filter((i) =>
    show === 'no' ? !i.helpful : show === 'comments' ? Boolean(i.comment) : true)

  // Per-page summary
  const byPage = {}
  items.forEach((i) => {
    byPage[i.page] = byPage[i.page] || { yes: 0, total: 0 }
    byPage[i.page].total += 1
    if (i.helpful) byPage[i.page].yes += 1
  })
  const pages = Object.entries(byPage).sort((a, b) => b[1].total - a[1].total)

  const exportCsv = () => downloadCsv(
    'launchpad-page-feedback.csv',
    ['Page', 'Helpful', 'Comment', 'Received'],
    items.map((i) => [i.page, i.helpful ? 'Yes' : 'No', i.comment || '', i.createdAt]),
  )

  return (
    <section className="content-section admin-eoi-section">
      <h2 className="admin-section-title">Page feedback</h2>
      <div className="admin-toolbar">
        <span className="admin-count">{items.length} {items.length === 1 ? 'answer' : 'answers'} to "Was this page helpful?"</span>
        <div className="admin-filter">
          <label htmlFor="fb-filter">Show</label>
          <select id="fb-filter" value={show} onChange={(e) => setShow(e.target.value)}>
            <option value="all">All answers</option>
            <option value="no">Only "No"</option>
            <option value="comments">Only with a comment</option>
          </select>
          <button type="button" className="ak-csv" onClick={exportCsv} disabled={!items.length}>
            <Icon name="download" size={14} /> Download CSV
          </button>
        </div>
      </div>

      {loading && <p className="admin-status">Loading…</p>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      {!loading && !error && items.length === 0 && <p className="admin-status">No feedback yet.</p>}

      {pages.length > 0 && (
        <ul className="ak-pages">
          {pages.map(([page, s]) => (
            <li key={page}>
              <code>{page}</code>
              <span className="ak-bar-track" aria-hidden="true">
                <span style={{ width: `${(s.yes / s.total) * 100}%` }} />
              </span>
              <span>{Math.round((100 * s.yes) / s.total)}% yes · {s.total}</span>
            </li>
          ))}
        </ul>
      )}

      {shown.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Helpful?</th>
                <th>Comment</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id}>
                  <td><code>{i.page}</code></td>
                  <td><span className={i.helpful ? 'ak-yes' : 'ak-no'}>{i.helpful ? 'Yes' : 'No'}</span></td>
                  <td className="admin-message">{i.comment || '-'}</td>
                  <td className="admin-date">{i.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
