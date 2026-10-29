import { useState } from 'react'
import { findMentor } from './mentors'

export const DEFAULT_PHOTO = '/assets/images/defaultprofile.svg'

// Round photo of a coffee chat person (the team photos). Anyone without a
// photo, or if it fails to load, gets the default profile picture.
export function PersonPhoto({ name, className = '' }) {
  const person = findMentor(name)
  const [failed, setFailed] = useState(false)
  const src = person?.photo && !failed ? person.photo : DEFAULT_PHOTO
  return (
    <span className={`${className} has-photo`} aria-hidden="true">
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </span>
  )
}
