import { useState } from 'react'
import { findMentor } from './mentors'

// Round photo of a coffee chat person. Falls back to their first initial
// if there's no photo (or it fails to load).
export function PersonPhoto({ name, className = '' }) {
  const person = findMentor(name)
  const [failed, setFailed] = useState(false)
  const showPhoto = person?.photo && !failed
  return (
    <span className={`${className}${showPhoto ? ' has-photo' : ''}`} aria-hidden="true">
      {showPhoto ? (
        <img src={person.photo} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        (name || '?').charAt(0)
      )}
    </span>
  )
}
