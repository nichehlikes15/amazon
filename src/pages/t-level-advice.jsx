import { useEffect, useRef, useState } from 'react'
import './t-level-advice.css'

// Add more cards here; the carousel scrolls through all of them.
const studentAdvice = [
  { title: 'Get the most out of your placement', text: 'Ask questions, take notes, and treat every task as a chance to learn something new.' },
  { title: 'Connect with people at work', text: 'Introduce yourself to your team, find a buddy or mentor, and stay curious about what everyone does.' },
  { title: 'Build good habits early', text: 'Be on time, communicate clearly, and ask for feedback so you keep improving.' },
  { title: 'Lorem ipsum dolor', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.' },
  { title: 'Consectetur adipiscing', text: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.' },
  { title: 'Sed do eiusmod', text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' },
]

// Placeholder content shown under the student cards. Replace text and add an
// `image` path (e.g. '/assets/images/placement.jpg') when real photos are ready.
const studentDetails = [
  {
    title: 'Before your placement starts',
    paragraphs: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus. Vestibulum id ligula porta felis euismod semper. Maecenas faucibus mollis interdum.',
      'Curabitur blandit tempus porttitor. Nullam quis risus eget urna mollis ornare vel eu leo. Donec ullamcorper nulla non metus auctor fringilla.',
    ],
    imageAlt: 'Student preparing for their first day of placement',
  },
  {
    title: 'During your placement',
    paragraphs: [
      'Sed posuere consectetur est at lobortis. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Cras mattis consectetur purus sit amet fermentum.',
      'Etiam porta sem malesuada magna mollis euismod. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.',
    ],
    imageAlt: 'Student working alongside an Amazon team member',
  },
  {
    title: 'After your placement',
    paragraphs: [
      'Nulla vitae elit libero, a pharetra augue. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh.',
      'Donec id elit non mi porta gravida at eget metus. Aenean lacinia bibendum nulla sed consectetur. Maecenas sed diam eget risus varius blandit sit amet non magna.',
    ],
    imageAlt: 'Student reflecting on their placement experience',
  },
]

// Add more cards here; the carousel scrolls through all of them.
const schoolAdvice = [
  { title: 'Setting up placements', text: 'Learn how to plan and arrange T Level placements with employers like Amazon.' },
  { title: 'Managing placements', text: 'Keep track of student progress, employer contacts and paperwork in one place.' },
  { title: 'Collaborating with Amazon', text: 'Find out how your school or college can work with Amazon on T Level opportunities.' },
  { title: 'Lorem ipsum dolor', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.' },
  { title: 'Consectetur adipiscing', text: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.' },
  { title: 'Sed do eiusmod', text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' },
]

// Placeholder content shown under the school cards. Add an `image` path when ready.
const schoolDetails = [
  {
    title: 'Planning placements with employers',
    paragraphs: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean lacinia bibendum nulla sed consectetur. Cras justo odio, dapibus ac facilisis in, egestas eget quam.',
      'Vestibulum id ligula porta felis euismod semper. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec sed odio dui.',
    ],
    imageAlt: 'Teacher planning T Level placements with an employer',
  },
  {
    title: 'Supporting students on placement',
    paragraphs: [
      'Maecenas faucibus mollis interdum. Nullam id dolor id nibh ultricies vehicula ut id elit. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.',
      'Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod.',
    ],
    imageAlt: 'School staff checking in with a student during placement',
  },
  {
    title: 'Building a partnership with Amazon',
    paragraphs: [
      'Cras mattis consectetur purus sit amet fermentum. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Sed posuere consectetur est at lobortis.',
      'Curabitur blandit tempus porttitor. Donec ullamcorper nulla non metus auctor fringilla. Nulla vitae elit libero, a pharetra augue.',
    ],
    imageAlt: 'School and Amazon representatives meeting together',
  },
]

// Horizontal carousel of advice cards with arrows on each side.
function AdviceCarousel({ items, label }) {
  const trackRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const updateButtons = () => {
    const track = trackRef.current
    if (!track) return
    setAtStart(track.scrollLeft <= 1)
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1)
  }

  useEffect(() => {
    updateButtons()
    window.addEventListener('resize', updateButtons)
    return () => window.removeEventListener('resize', updateButtons)
  }, [])

  // Move by one card width (plus the gap between cards).
  const scrollCards = (direction) => {
    const track = trackRef.current
    const card = track?.querySelector('.advice-card')
    if (!card) return
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <div className="advice-carousel" role="region" aria-roledescription="carousel" aria-label={label}>
      <button
        type="button"
        className="advice-carousel-button"
        onClick={() => scrollCards(-1)}
        disabled={atStart}
        aria-label={`Previous ${label.toLowerCase()}`}
      >
        &#8592;
      </button>
      <div className="advice-carousel-track" ref={trackRef} onScroll={updateButtons} tabIndex={0}>
        {items.map((item, index) => (
          <article
            className="advice-card"
            key={item.title}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}`}
          >
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
      <button
        type="button"
        className="advice-carousel-button"
        onClick={() => scrollCards(1)}
        disabled={atEnd}
        aria-label={`Next ${label.toLowerCase()}`}
      >
        &#8594;
      </button>
    </div>
  )
}

// Text sections with an image (or grey placeholder) alongside, no boxes.
function AdviceDetails({ items }) {
  return (
    <div className="advice-details">
      {items.map((item) => (
        <div className="advice-detail" key={item.title}>
          {item.image ? (
            <img className="advice-detail-media" src={item.image} alt={item.imageAlt} />
          ) : (
            <div className="advice-detail-media advice-detail-placeholder" role="img" aria-label={item.imageAlt}>
              Image coming soon
            </div>
          )}
          <div className="advice-detail-text">
            <h3>{item.title}</h3>
            {item.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TLevelAdvice() {
  return (
    <>
      <main>
        <section className="advice-header" aria-labelledby="advice-heading">
          <div className="advice-header-content">
            <p className="eyebrow">Advice</p>
            <h1 id="advice-heading">Advice for <span>students and schools</span></h1>
            <p className="advice-tagline">
              Practical guidance to help students make the most of their placements, and
              to help schools set them up and manage them.
            </p>
          </div>
        </section>

        <section className="content-section" id="students" aria-labelledby="students-heading">
          <p className="eyebrow">For students</p>
          <h2 id="students-heading">Student advice</h2>
          <p className="section-intro">
            How to get the most out of your placement and connect with the people around you.
          </p>
          <AdviceCarousel items={studentAdvice} label="Student advice" />
          <AdviceDetails items={studentDetails} />
        </section>

        <section className="advice-band">
          <div className="content-section" id="schools" aria-labelledby="schools-heading">
            <p className="eyebrow">For schools</p>
            <h2 id="schools-heading">School advice</h2>
            <p className="section-intro">
              How to set up and manage T Level placements, and how to collaborate with Amazon.
            </p>
            <AdviceCarousel items={schoolAdvice} label="School advice" />
            <AdviceDetails items={schoolDetails} />
          </div>
        </section>
      </main>
    </>
  )
}

export default TLevelAdvice
