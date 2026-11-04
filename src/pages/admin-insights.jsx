import { useEffect, useState } from 'react'
import { api } from '../modules/api'
import { Icon } from '../modules/icons'
import { pageName } from '../modules/page-title'
import { C, ActivityChart, Donut, PairBars, RankBars, Ring, Sparkline, StackBar } from './admin-charts'

/*
  Admin: the project's KPIs at a glance (with small charts from
  admin-charts.jsx), and the "Was this page helpful?" answers. Both can be downloaded as CSV files for the Task 3 analysis.
*/

// Admin: link each coffee chat person to their Launchpad account, so they can
// manage their own requests on /alumni/coffee-chats/manage (not this page).
export function AdminChatHosts() {
  const [items, setItems] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [saved, setSaved] = useState(null)

  const show = (list) => {
    setItems(list)
    setDrafts(Object.fromEntries(list.map((i) => [i.mentor, i.email || ''])))
  }

  useEffect(() => {
    let live = true
    api.adminChatHosts()
      .then((d) => { if (live) show(d.items || []) })
      .catch((err) => { if (live) setError(err.message) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])

  const save = async (e, mentor, email) => {
    e?.preventDefault()
    setError('')
    setBusy(mentor)
    try {
      const d = await api.setChatHost(mentor, email)
      show(d.items || [])
      setSaved(mentor)
      setTimeout(() => setSaved((cur) => (cur === mentor ? null : cur)), 1800)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="content-section admin-eoi-section">
      <h2 className="admin-section-title">Coffee chat hosts</h2>
      <p className="admin-chat-hint admin-hosts-intro">
        Link each person on the Coffee chats page to their Launchpad account. They can then confirm and update
        their own requests on the Manage my coffee chats page. They won&apos;t see this admin page or anyone
        else&apos;s requests. They need to create an account first.
      </p>
      {loading && <p className="admin-status">Loading…</p>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      {!loading && items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Person</th><th>Linked account</th><th>Account email</th></tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.mentor}>
                  <td><span className="admin-pathway">{h.mentor}</span></td>
                  <td>
                    {h.email ? (
                      <span>{h.accountName ? `${h.accountName} · ` : ''}{h.email}</span>
                    ) : (
                      <span className="admin-muted">Not linked</span>
                    )}
                  </td>
                  <td>
                    <form className="admin-host-form" onSubmit={(e) => save(e, h.mentor, drafts[h.mentor] || '')}>
                      <input
                        type="email"
                        aria-label={`Account email for ${h.mentor}`}
                        placeholder="name@example.com"
                        value={drafts[h.mentor] || ''}
                        onChange={(e) => setDrafts({ ...drafts, [h.mentor]: e.target.value })}
                      />
                      <button type="submit" className="admin-edit" disabled={busy === h.mentor}>
                        {busy === h.mentor ? 'Saving…' : 'Save'}
                      </button>
                      {h.email && (
                        <button type="button" className="admin-edit" disabled={busy === h.mentor} onClick={() => save(null, h.mentor, '')}>
                          Remove
                        </button>
                      )}
                      {saved === h.mentor && <span className="admin-saved" role="status">Saved</span>}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// Admin: download a copy of the whole database (launchpad.db) to open in
// DB Browser for SQLite. The server removes passwords and reset codes from
// the copy; the live database isn't changed.
export function AdminDatabase() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const download = async () => {
    setError('')
    setDone(false)
    setBusy(true)
    try {
      const res = await fetch(api.databaseUrl(), { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Sorry, the database couldn't be downloaded.")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `launchpad-database-${new Date().toISOString().slice(0, 10)}.db`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="content-section admin-eoi-section admin-db">
      <h2 className="admin-section-title">Download the database</h2>
      <p className="admin-db-text">
        A copy of every table in one file (launchpad.db). Open it with the free app DB Browser for SQLite.
        Passwords and password reset codes are taken out of the copy, and the live database isn&apos;t changed.
      </p>
      <p className="admin-db-text admin-db-warn">
        <Icon name="shield" size={16} />
        <span>
          It still has people&apos;s names and emails, some from under-18s. Keep it private, don&apos;t share it or put it
          on a shared drive, and delete it when you&apos;ve finished.
        </span>
      </p>
      <div className="admin-db-actions">
        <button type="button" className="primary-button" onClick={download} disabled={busy}>
          <Icon name="download" size={16} /> {busy ? 'Preparing…' : 'Download database'}
        </button>
        {done && <span className="admin-saved" role="status">Downloaded</span>}
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
    </section>
  )
}

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

// Who registered interest, coffee chat statuses and pathways, with their chart colours.
const ROLES = [
  { key: 'student', label: 'Students', color: C.orange },
  { key: 'parent', label: 'Parents and carers', color: C.ink },
  { key: 'school', label: 'Schools and colleges', color: C.grey },
]
const STATUSES = [
  { key: 'Requested', label: 'Requested (waiting)', color: C.orange },
  { key: 'Confirmed', label: 'Confirmed', color: C.ink },
  { key: 'Completed', label: 'Completed', color: C.grey },
  { key: 'Cancelled', label: 'Cancelled', color: C.light },
]
const PATHWAY_ORDER = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']

// Known items first (in order, even if 0), then anything else in the data.
function withExtras(known, data, extraColor) {
  const list = known.map((x) => ({ ...x, value: data?.[x.key] || 0 }))
  Object.entries(data || {}).forEach(([key, value]) => {
    if (!known.some((x) => x.key === key)) list.push({ key, label: key, value, color: extraColor })
  })
  return list
}

// One headline number, with a small chart next to it.
function Stat({ icon, label, value, sub, n, children }) {
  return (
    <div className="ak-stat" style={{ '--n': n }}>
      <span className="ak-stat-label"><Icon name={icon} size={15} /> {label}</span>
      <span className="ak-stat-row">
        <strong className="ak-stat-value">{value}</strong>
        {children}
      </span>
      {sub && <span className="ak-stat-sub">{sub}</span>}
    </div>
  )
}

function Panel({ title, note, wide, children }) {
  return (
    <div className={wide ? 'ak-panel is-wide' : 'ak-panel'}>
      <div className="ak-panel-head">
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </div>
      {children}
    </div>
  )
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const timeNow = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export function AdminKpis() {
  const [k, setK] = useState(null)
  const [error, setError] = useState('')
  const [loadedAt, setLoadedAt] = useState(null)
  const [busy, setBusy] = useState(false)

  const fetchKpis = () => api.adminKpis()
    .then((d) => { setK(d); setLoadedAt(new Date()); setError('') })
    .catch((err) => setError(err.message))

  useEffect(() => { fetchKpis() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    setBusy(true)
    fetchKpis().finally(() => setBusy(false))
  }

  const t = k?.trend || { days: [], users: [], interest: [], coffeeChats: [], practice: [] }
  const quizTop = k ? Object.entries(k.quiz.byPathway).sort((x, y) => y[1] - x[1])[0] : null
  const pathwayRows = k ? [
    ...PATHWAY_ORDER,
    ...Object.keys(k.interest.byPathway).filter((p) => !PATHWAY_ORDER.includes(p)),
  ].map((p) => ({ label: p, a: k.interest.byPathway[p] || 0, b: k.quiz.byPathway[p] || 0 })) : []
  const bands = k?.practice.bands || { low: 0, mid: 0, high: 0 }

  return (
    <section className="content-section ak">
      <div className="ak-head">
        <div>
          <h2 className="admin-section-title">Key numbers (KPIs)</h2>
          <p>Live counts from the database. Use them to check the project's KPIs.</p>
        </div>
        <div className="ak-refresh">
          {loadedAt && <span>Updated at {timeNow(loadedAt)}</span>}
          <button type="button" className="ak-csv" onClick={refresh} disabled={busy}>
            <Icon name="motion" size={14} /> {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="auth-error" role="alert">{error}</div>}
      {!k && !error && <p className="admin-status">Loading…</p>}

      {k && (
        <>
          <div className="ak-stats">
            <Stat n={0} icon="user" label="Accounts" value={k.users.total}
              sub={`${k.users.last7} new this week · ${k.users.last30} in 30 days`}>
              <Sparkline values={t.users} color={C.ink} label={`New accounts in the last 14 days: ${k.users.last7} this week`} />
            </Stat>
            <Stat n={1} icon="mail" label="Expressions of interest" value={k.interest.total}
              sub={`${k.interest.last30} in the last 30 days`}>
              <Sparkline values={t.interest} />
            </Stat>
            <Stat n={2} icon="check" label="Career quizzes finished" value={k.quiz.completed}
              sub={quizTop ? `Most common result: ${quizTop[0]}` : 'None yet'} />
            <Stat n={3} icon="calendar" label="Coffee chat requests" value={k.coffeeChats.total}
              sub={`${k.coffeeChats.under18} from under-18s`}>
              <Sparkline values={t.coffeeChats} color={C.grey} />
            </Stat>
            <Stat n={4} icon="video" label="Practice interviews" value={k.practice.calls}
              sub={k.practice.calls ? `${plural(k.practice.people, 'person', 'people')} · average score ${k.practice.averageScore}` : 'None yet'}>
              <Sparkline values={t.practice} color={C.deep} />
            </Stat>
            <Stat n={5} icon="file" label="CVs checked" value={k.cvs.uploaded}
              sub={k.cvs.uploaded ? `Average score ${k.cvs.averageScore} out of 100` : 'None yet'}>
              {k.cvs.uploaded > 0 && (
                <Ring percent={k.cvs.averageScore} size={44} stroke={5} label={`Average CV score ${k.cvs.averageScore} out of 100`} />
              )}
            </Stat>
            <Stat n={6} icon="bookmark" label="Opportunities saved" value={k.saved.total}
              sub={k.saved.mostSaved.length ? plural(k.saved.mostSaved.length, 'opportunity saved so far', 'different opportunities saved') : 'None yet'} />
            <Stat n={7} icon="heart" label="Pages rated helpful"
              value={k.feedback.helpfulPercent === null ? '-' : `${k.feedback.helpfulPercent}%`}
              sub={plural(k.feedback.total, 'answer', 'answers')}>
              {k.feedback.helpfulPercent !== null && (
                <Ring percent={k.feedback.helpfulPercent} size={44} stroke={5} label={`${k.feedback.helpfulPercent}% said yes`} />
              )}
            </Stat>
          </div>

          <div className="ak-panels">
            <Panel wide title="Activity in the last 14 days" note="Hover over the chart to see each day. Click a name to hide or show its line.">
              <ActivityChart days={t.days} series={[
                { key: 'users', label: 'New accounts', color: C.ink, values: t.users },
                { key: 'interest', label: 'Expressions of interest', color: C.orange, values: t.interest },
                { key: 'chats', label: 'Coffee chat requests', color: C.grey, values: t.coffeeChats },
                { key: 'practice', label: 'Practice interviews', color: C.deep, values: t.practice },
              ]} />
            </Panel>

            <Panel title="Who is registering interest" note={plural(k.interest.total, 'form sent', 'forms sent')}>
              <Donut items={withExtras(ROLES, k.interest.byRole, C.light)} centreLabel="forms" />
            </Panel>

            <Panel title="Pathways" note="Interest forms compared with career quiz results">
              <PairBars rows={pathwayRows}
                a={{ label: 'Expressions of interest', color: C.orange }}
                b={{ label: 'Quiz results', color: C.ink }} />
            </Panel>

            <Panel title="Coffee chats" note={`${k.coffeeChats.under18} of ${k.coffeeChats.total} from under-18s`}>
              <Donut items={withExtras(STATUSES, k.coffeeChats.byStatus, C.peach)} centreLabel="requests" />
            </Panel>

            <Panel title="Practice interview scores" note={k.practice.calls ? `Average score ${k.practice.averageScore} out of 100` : ''}>
              <StackBar parts={[
                { key: 'low', label: 'Under 40', value: bands.low, color: C.light },
                { key: 'mid', label: '40 to 69', value: bands.mid, color: C.peach },
                { key: 'high', label: '70 and over', value: bands.high, color: C.orange },
              ]} />
              {k.practice.calls > 0 && (
                <div className="ak-facts">
                  <div><strong>{k.practice.calls}</strong><span>{k.practice.calls === 1 ? 'call' : 'calls'}</span></div>
                  <div><strong>{k.practice.people}</strong><span>{k.practice.people === 1 ? 'person' : 'people'}</span></div>
                  <div><strong>{k.practice.averageScore}</strong><span>average score</span></div>
                </div>
              )}
            </Panel>

            <Panel title="Page feedback" note={'Answers to "Was this page helpful?"'}>
              {k.feedback.total === 0 ? <p className="ak-none">Nothing yet</p> : (
                <div className="ak-feedback">
                  <Ring percent={k.feedback.helpfulPercent} size={112} stroke={11} label={`${k.feedback.helpfulPercent}% said yes`}>
                    <strong>{k.feedback.helpfulPercent}%</strong>
                    <span>said yes</span>
                  </Ring>
                  <div>
                    <h4 className="ak-sub-title">Pages with the lowest ratings</h4>
                    <RankBars items={k.feedback.lowestPages.map((pg) => {
                      const pct = Math.round((100 * pg.yes) / pg.total)
                      return { label: pageName(pg.page), value: pct, display: `${pct}% of ${pg.total}` }
                    })} />
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="Most saved opportunities" note={plural(k.saved.total, 'save', 'saves') + ' in total'}>
              <RankBars items={k.saved.mostSaved.map((o) => ({ label: o.title, value: o.count }))} color={C.ink} />
            </Panel>
          </div>
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


// Question board: posts waiting to be checked (new ones and reported ones).
export function AdminBoard() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let live = true
    api.adminBoard()
      .then((d) => { if (live) setItems(d.items || []) })
      .catch((err) => { if (live) { setError(err.message); setItems([]) } })
    return () => { live = false }
  }, [])

  const decide = async (item, action) => {
    setBusy(`${item.kind}-${item.id}`)
    setError('')
    try {
      await api.moderateBoardPost(item.kind, item.id, action)
      setItems((list) => list.filter((i) => !(i.kind === item.kind && i.id === item.id)))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="content-section admin-eoi-section">
      <h2 className="admin-section-title">Question board: waiting to be checked</h2>
      <div className="admin-toolbar">
        <span className="admin-count">
          {items === null ? 'Loading…' : `${items.length} ${items.length === 1 ? 'post' : 'posts'} waiting`}
        </span>
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {items && items.length === 0 && <p className="admin-status">Nothing to check. New posts will appear here.</p>}
      {items && items.length > 0 && (
        <ul className="ak-board">
          {items.map((i) => (
            <li key={`${i.kind}-${i.id}`} className="ak-board-item">
              <div className="ak-board-tags">
                <span className="ak-role">{i.kind === 'question' ? 'Question' : 'Answer'}</span>
                {i.topic && <span className="ak-role">{i.topic}</span>}
                {i.reported > 0 && <span className="ak-no">Reported {i.reported}x</span>}
                {i.safety && <span className="ak-u18">Mentions safety - follow your safeguarding process</span>}
              </div>
              <strong>{i.kind === 'answer' ? `Answer to: ${i.title}` : i.title}</strong>
              {i.body && <p>{i.body}</p>}
              {i.reasons.length > 0 && <p className="ak-sub">Report reasons: {i.reasons.join('; ')}</p>}
              <p className="ak-sub">From {i.author} ({i.email}) · {i.createdAt}</p>
              <div className="ak-board-actions">
                <button type="button" className="ak-csv" onClick={() => decide(i, 'approve')} disabled={busy === `${i.kind}-${i.id}`}>
                  <Icon name="check" size={14} /> Approve
                </button>
                <button type="button" className="ak-csv is-danger" onClick={() => decide(i, 'reject')} disabled={busy === `${i.kind}-${i.id}`}>
                  <Icon name="close" size={14} /> Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

