
import { useState } from 'react'
import './profile.css'

function Profile() {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState({
    name: 'Bob Bobby',
    headline: 'Exploring my future career',
    location: 'United Kingdom',
    bio: 'I am exploring career opportunities, developing new skills, and learning more about the paths available to me.',
    interests: 'Technology, Business, Creative Industries',
  })

  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  const saveProfile = (event) => {
    event.preventDefault()
    setEditing(false)
    setSaved(true)
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <div className="profile-breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <span>My profile</span>
        </div>

        <section className="profile-heading">
          <div>
            <p className="profile-eyebrow">YOUR LAUNCHPAD</p>
            <h1>My profile</h1>
            <p className="profile-intro">
              Tell your story, showcase your interests, and keep track
              of your career journey.
            </p>
          </div>

          <button
            className="profile-primary-button"
            type="button"
            onClick={() => {
              setEditing(!editing)
              setSaved(false)
            }}
          >
            {editing ? 'Cancel editing' : 'Edit profile'}
          </button>
        </section>

        {saved && (
          <p className="profile-success" role="status">
            Your profile has been updated.
          </p>
        )}

        <section className="profile-overview">
          <div className="profile-identity">
            <img
              className="profile-avatar"
              src="/assets/images/defaultprofile.svg"
              alt="Profile avatar"
            />

            <div>
              <h2>{profile.name}</h2>
              <p className="profile-headline">{profile.headline}</p>
              <p className="profile-location">
                {profile.location}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Profile
