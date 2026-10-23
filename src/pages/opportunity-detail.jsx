import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import './opportunity-detail.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'

const STATUSES = ['Not started', 'Preparing', 'Applied', 'Interview', 'Offer', 'Unsuccessful']

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function OpportunityDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const fileInput = useRef(null)

  const [opp, setOpp] = useState(null)
  const [resources, setResources] = useState([])
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('Not started')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api.getOpportunity(id)
      .then((data) => {
        setOpp(data.opportunity)
        setResources(data.resources || [])
        setFiles(data.files || [])
        if (data.progress) {
          setStatus(data.progress.status)
          setNotes(data.progress.notes)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const saveProgress = async () => {
    setSavedMsg('')
    try {
      await api.updateProgress(id, { status, notes })
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  const onUpload = async (e) => {
    const file = e.target.files[0]
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

  const removeFile = async (fileId) => {
    try {
      await api.deleteFile(fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <main className="od-page"><p className="od-status">Loading…</p></main>
  if (error && !opp) return <main className="od-page"><p className="od-status">{error}</p></main>
  if (!opp) return null

  return (
    <main className="od-page">
      <div className="od-container">
        <Link className="od-back" to="/opportunities">← All opportunities</Link>

        {/* Header */}
        <header className="od-header">
          <span className="od-pathway">{opp.pathway}</span>
          <h1>{opp.title}</h1>
          <p className="od-employer">{opp.employer} · {opp.location}</p>
          {opp.closingDate && (
            <p className="od-closing">Closes {formatDate(opp.closingDate)}</p>
          )}
          <a
            className="od-apply-button"
            href={opp.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply on the official site
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </a>
        </header>

        {error && <div className="od-error" role="alert">{error}</div>}

        <div className="od-grid">
          {/* Main column */}
          <div className="od-main">
            <section className="od-card">
              <h2>About this opportunity</h2>
              <p className="od-about">{opp.summary}</p>
              <p className="od-about">
                This {opp.type.toLowerCase()} with {opp.employer} in {opp.location} is part of
                the {opp.pathway} pathway. You'll combine real work with structured training,
                building the skills and experience employers are looking for.
              </p>
            </section>

            <section className="od-card">
              <h2>Resources to help you prepare</h2>
              <ul className="od-resources">
                {resources.map((r) => (
                  <li key={r.id}>
                    {r.url.startsWith('/') ? (
                      <Link to={r.url}>
                        <span className="od-res-kind">{r.kind}</span>
                        <span className="od-res-title">{r.title}</span>
                      </Link>
                    ) : (
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        <span className="od-res-kind">{r.kind}</span>
                        <span className="od-res-title">{r.title}</span>
                      </a>
                    )}
                    {r.description && <p className="od-res-desc">{r.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Application tracker (requires login) */}
          <aside className="od-side">
            <section className="od-card">
              <h2>Your application</h2>
              {!user ? (
                <p className="od-signin-note">
                  <Link to="/login">Sign in</Link> to track your progress, save notes and
                  upload files for this opportunity.
                </p>
              ) : (
                <>
                  <label className="od-label" htmlFor="status">Status</label>
                  <select
                    id="status"
                    className="od-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <label className="od-label" htmlFor="notes">
                    Notes &amp; answers
                  </label>
                  <textarea
                    id="notes"
                    className="od-textarea"
                    rows="7"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Paste the questions you were asked, draft your answers, and jot down your progress…"
                  />

                  <div className="od-save-row">
                    <button className="od-primary" type="button" onClick={saveProgress}>
                      Save progress
                    </button>
                    {savedMsg && <span className="od-saved-msg">{savedMsg}</span>}
                  </div>

                  <div className="od-files">
                    <h3>Your files</h3>
                    {files.length === 0 && <p className="od-files-empty">No files uploaded yet.</p>}
                    <ul>
                      {files.map((f) => (
                        <li key={f.id}>
                          <a href={api.fileUrl(f.id)} target="_blank" rel="noopener noreferrer">
                            {f.name}
                          </a>
                          <span className="od-file-size">{formatSize(f.size)}</span>
                          <button type="button" className="od-file-remove" onClick={() => removeFile(f.id)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                    <input
                      ref={fileInput}
                      type="file"
                      className="od-file-input"
                      onChange={onUpload}
                      disabled={uploading}
                    />
                    {uploading && <p className="od-uploading">Uploading…</p>}
                    <p className="od-file-hint">PDF, Word, text or image. Up to 10 MB.</p>
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default OpportunityDetail
