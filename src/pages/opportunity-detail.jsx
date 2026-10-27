import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import './opportunity-detail.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon, PathwayIcon, closingLabel, formatDate } from '../modules/icons'
import { setPageTitle } from '../modules/page-title'

// The order of the main journey; 'Unsuccessful' sits outside it.
const STATUSES = ['Not started', 'Preparing', 'Applied', 'Interview', 'Offer', 'Unsuccessful']
const JOURNEY = STATUSES.slice(0, 5)

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function resourceIcon(r) {
  if (r.url.endsWith('.pdf') || r.kind === 'PDF') return 'download'
  if (r.kind === 'Video') return 'video'
  if (r.url.startsWith('/')) return 'book'
  return 'link'
}

function OpportunityDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [opp, setOpp] = useState(null)
  const [resources, setResources] = useState([])
  const [files, setFiles] = useState([])
  const [related, setRelated] = useState([])
  const [status, setStatus] = useState('Not started')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    api.getOpportunity(id)
      .then((data) => {
        setOpp(data.opportunity)
        setPageTitle(data.opportunity.title)
        setResources(data.resources || [])
        setFiles(data.files || [])
        setStatus(data.progress ? data.progress.status : 'Not started')
        setNotes(data.progress ? data.progress.notes : '')
        // Other opportunities in the same pathway (optional - ignore if it fails)
        return api.listOpportunities()
          .then((list) => {
            const others = (list.items || []).filter(
              (o) => o.id !== data.opportunity.id && o.pathway === data.opportunity.pathway,
            )
            setRelated(others.slice(0, 3))
          })
          .catch(() => setRelated([]))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const toggleSave = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setSaving(true)
    try {
      if (opp.saved) await api.unsaveOpportunity(opp.id)
      else await api.saveOpportunity(opp.id)
      setOpp((o) => ({ ...o, saved: !o.saved }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveProgress = async () => {
    setSavedMsg(false)
    try {
      await api.updateProgress(id, { status, notes })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2200)
    } catch (err) {
      setError(err.message)
    }
  }

  const uploadOne = async (file) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const data = await api.uploadFile(id, file)
      setFiles((prev) => [data.file, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (!uploading) uploadOne(e.dataTransfer.files[0])
  }

  const removeFile = async (fileId) => {
    try {
      await api.deleteFile(fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <main className="od">
        <div className="od-loading" aria-label="Loading">
          <span className="od-sk od-sk-sm" />
          <span className="od-sk od-sk-lg" />
          <span className="od-sk od-sk-md" />
        </div>
      </main>
    )
  }
  if (error && !opp) {
    return (
      <main className="od">
        <div className="od-status">
          <p>{error}</p>
          <Link className="secondary-button" to="/opportunities">
            <Icon name="arrowLeft" size={14} /> All opportunities
          </Link>
        </div>
      </main>
    )
  }
  if (!opp) return null

  const closing = closingLabel(opp.closingDate)
  const stepIndex = JOURNEY.indexOf(status)

  return (
    <main className="od">
      {/* Light lilac hero */}
      <header className="od-hero">
        <div className="od-hero-inner">
          <Link className="od-back" to="/opportunities">
            <Icon name="arrowLeft" size={14} />
            All opportunities
          </Link>

          <div className="od-tags">
            <Link className="od-tag" to={`/information#${opp.pathway.toLowerCase()}`}>
              <PathwayIcon pathway={opp.pathway} size={14} />
              {opp.pathway} pathway
            </Link>
            <span className="od-tag">{opp.type}</span>
            {closing && <span className={`od-tag od-tag-${closing.tone}`}>{closing.text}</span>}
          </div>

          <h1>{opp.title}</h1>

          <ul className="od-meta">
            <li><Icon name="building" size={16} />{opp.employer}</li>
            <li><Icon name="pin" size={16} />{opp.location}</li>
            {opp.closingDate && <li><Icon name="calendar" size={16} />Closes {formatDate(opp.closingDate)}</li>}
          </ul>

          <div className="od-hero-actions">
            <a className="od-apply" href={opp.applyUrl} target="_blank" rel="noopener noreferrer">
              Apply on the official site
              <Icon name="external" size={15} />
            </a>
            <button
              type="button"
              className={opp.saved ? 'od-save-opp is-saved' : 'od-save-opp'}
              onClick={toggleSave}
              disabled={saving}
              aria-pressed={!!opp.saved}
            >
              <Icon name="bookmark" size={16} data-filled={opp.saved || undefined} />
              {opp.saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <div className="od-body">
        {error && <div className="od-error" role="alert">{error}</div>}

        <div className="od-grid">
          {/* Main column */}
          <div className="od-main">
            <section className="od-section">
              <h2>About this opportunity</h2>
              <p className="od-about">{opp.summary}</p>
              <p className="od-about">
                This {opp.type.toLowerCase()} with {opp.employer} in {opp.location} is part of
                the {opp.pathway} pathway. You'll combine real work with structured training,
                building the skills and experience employers are looking for.
              </p>
            </section>

            {/* Key facts from the listing */}
            <section className="od-section">
              <h2>At a glance</h2>
              <dl className="od-facts">
                <div>
                  <dt><Icon name="layers" size={16} />Pathway</dt>
                  <dd>{opp.pathway}</dd>
                </div>
                <div>
                  <dt><Icon name="book" size={16} />Type</dt>
                  <dd>{opp.type}</dd>
                </div>
                <div>
                  <dt><Icon name="pin" size={16} />Location</dt>
                  <dd>{opp.location}</dd>
                </div>
                <div>
                  <dt><Icon name="calendar" size={16} />Closing date</dt>
                  <dd>{opp.closingDate ? formatDate(opp.closingDate) : 'Not given'}</dd>
                </div>
              </dl>
            </section>

            {/* How to use this page */}
            <section className="od-section">
              <h2>How to apply</h2>
              <ol className="od-steps">
                <li>
                  <span className="od-step-n">01</span>
                  <div>
                    <h3>Prepare</h3>
                    <p>Work through the resources below, then <Link to="/interview">practise your interview</Link>.</p>
                  </div>
                </li>
                <li>
                  <span className="od-step-n">02</span>
                  <div>
                    <h3>Apply</h3>
                    <p>Submit your application on the official {opp.employer} job page.</p>
                  </div>
                </li>
                <li>
                  <span className="od-step-n">03</span>
                  <div>
                    <h3>Track</h3>
                    <p>Update your status, notes and files on this page as you go.</p>
                  </div>
                </li>
              </ol>
            </section>

            {resources.length > 0 && (
              <section className="od-section">
                <h2>Resources to help you prepare</h2>
                <ul className="od-resources">
                  {resources.map((r) => {
                    const icon = resourceIcon(r)
                    const inner = (
                      <>
                        <span className="od-res-icon"><Icon name={icon} size={18} /></span>
                        <span className="od-res-text">
                          <span className="od-res-title">
                            {r.title}{icon === 'download' ? ' (PDF)' : ''}
                          </span>
                          {r.description && <span className="od-res-desc">{r.description}</span>}
                        </span>
                        <span className="od-res-go">
                          <Icon name={icon === 'download' ? 'download' : r.url.startsWith('/') ? 'arrowRight' : 'external'} size={16} />
                        </span>
                      </>
                    )
                    return (
                      <li key={r.id}>
                        {icon === 'download' ? (
                          <a className="od-res-link" href={r.url} download>{inner}</a>
                        ) : r.url.startsWith('/') ? (
                          <Link className="od-res-link" to={r.url}>{inner}</Link>
                        ) : (
                          <a className="od-res-link" href={r.url} target="_blank" rel="noopener noreferrer">{inner}</a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </div>

          {/* Application tracker */}
          <aside className="od-side">
            <section className="od-tracker">
              <h2>Your application</h2>
              {!user ? (
                <div className="od-signin">
                  <p>Sign in to track your progress, save notes and upload files for this opportunity.</p>
                  <Link className="primary-button" to="/login">Sign in</Link>
                </div>
              ) : (
                <>
                  <span className="od-label" id="status-label">Status</span>
                  <ol className="od-journey" aria-labelledby="status-label">
                    {JOURNEY.map((s, i) => {
                      const state = status === 'Unsuccessful'
                        ? 'todo'
                        : i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo'
                      return (
                        <li key={s} className={`is-${state}`}>
                          <button type="button" onClick={() => setStatus(s)} aria-pressed={status === s}>
                            <span className="od-dot">{state === 'done' && <Icon name="check" size={12} />}</span>
                            {s}
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                  <button
                    type="button"
                    className={status === 'Unsuccessful' ? 'od-unsuccessful is-on' : 'od-unsuccessful'}
                    onClick={() => setStatus(status === 'Unsuccessful' ? 'Not started' : 'Unsuccessful')}
                    aria-pressed={status === 'Unsuccessful'}
                  >
                    {status === 'Unsuccessful' ? 'Marked as unsuccessful (undo)' : 'Mark as unsuccessful'}
                  </button>

                  <label className="od-label" htmlFor="notes">Notes &amp; answers</label>
                  <textarea
                    id="notes"
                    className="od-input od-textarea"
                    rows="7"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Paste the questions you were asked, draft your answers, and jot down your progress…"
                  />

                  <div className="od-save-row">
                    <button className="od-save" type="button" onClick={saveProgress}>Save progress</button>
                    {savedMsg && (
                      <span className="od-saved-msg" role="status">
                        <Icon name="check" size={14} /> Saved
                      </span>
                    )}
                  </div>

                  <div className="od-files">
                    <h3>Your files</h3>
                    {files.length > 0 && (
                      <ul>
                        {files.map((f) => (
                          <li key={f.id}>
                            <span className="od-file-icon"><Icon name="file" size={16} /></span>
                            <a href={api.fileUrl(f.id)} target="_blank" rel="noopener noreferrer">{f.name}</a>
                            <span className="od-file-size">{formatSize(f.size)}</span>
                            <button
                              type="button"
                              className="od-file-remove"
                              onClick={() => removeFile(f.id)}
                              aria-label={`Remove ${f.name}`}
                            >
                              <Icon name="close" size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <label
                      className={`od-drop${dragging ? ' is-dragging' : ''}${uploading ? ' is-busy' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                    >
                      <input
                        ref={fileInput}
                        type="file"
                        className="od-file-input"
                        onChange={(e) => uploadOne(e.target.files[0])}
                        disabled={uploading}
                      />
                      <span className="od-drop-icon"><Icon name="upload" size={20} /></span>
                      <span className="od-drop-text">
                        {uploading ? 'Uploading…' : <><strong>Choose a file</strong> or drag it here</>}
                      </span>
                      <span className="od-file-hint">PDF, Word, text or image. Up to 10 MB.</span>
                    </label>
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="od-related">
            <div className="od-related-head">
              <h2>More in {opp.pathway}</h2>
              <Link className="od-related-all" to="/opportunities">
                See all <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            <div className="od-related-grid">
              {related.map((r) => (
                <Link className="od-related-card" to={`/opportunities/${r.id}`} key={r.id}>
                  <span className="od-related-icon"><PathwayIcon pathway={r.pathway} size={18} /></span>
                  <span className="od-related-title">{r.title}</span>
                  <span className="od-related-meta"><Icon name="pin" size={13} />{r.location}</span>
                  <span className="od-related-go"><Icon name="arrowRight" size={16} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default OpportunityDetail
