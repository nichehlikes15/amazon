import { useEffect, useRef, useState } from 'react'
import './t-level-advice.css'
import { Link } from 'react-router-dom'
import { Icon } from '../modules/icons'

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
      || document.documentElement.getAttribute('data-reduced-motion') === 'on'
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
        <Icon name="arrowLeft" size={18} />
      </button>
      <div className="advice-carousel-track" ref={trackRef} onScroll={updateButtons} tabIndex={0}>
        {items.map((item, index) => (
          <article
            className="advice-card"
            key={item.title}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}`}
          >
            <span className="advice-card-n" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
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
        <Icon name="arrowRight" size={18} />
      </button>
    </div>
  )
}

// Text sections with an image (or soft placeholder) alongside, no boxes.
function AdviceDetails({ items }) {
  return (
    <div className="advice-details">
      {items.map((item, index) => (
        <div className="advice-detail" key={item.title}>
          {item.image ? (
            <img className="advice-detail-media" src={item.image} alt={item.imageAlt} />
          ) : (
            <div className="advice-detail-media advice-detail-placeholder" role="img" aria-label={item.imageAlt}>
              <span>Image coming soon</span>
            </div>
          )}
          <div className="advice-detail-text">
            <span className="advice-detail-n" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
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

// The STAR method - one row per letter: the letter in a star, how to do it on the right.
const STAR_STEPS = [
  {
    letter: 'S',
    word: 'Situation',
    lead: 'Set the scene.',
    how: 'Say when and where it happened, in one or two sentences. Keep it short - just enough for the listener to picture it.',
    example: 'Last year at college, our group had two weeks to build a website for a local charity.',
  },
  {
    letter: 'T',
    word: 'Task',
    lead: 'Say what needed to happen.',
    how: 'Explain the goal or the problem, and what your job was.',
    example: 'I was in charge of making sure the pages worked on phones.',
  },
  {
    letter: 'A',
    word: 'Action',
    lead: 'Say what you did.',
    how: "This is the biggest part. Talk through the steps you took, and say \"I\", not \"we\", so they hear what you did yourself.",
    example: 'I tested every page on my phone, made a list of the problems and fixed them one by one.',
  },
  {
    letter: 'R',
    word: 'Result',
    lead: 'Say how it ended.',
    how: 'Share what happened in the end - use a number if you can - and what you learned.',
    example: 'The site worked on every phone we tried, and I learned to test things early.',
  },
]

// Five-point star with softened corners, the letter in the middle.
function StarBadge({ letter }) {
  const id = `star-grad-${letter}`
  return (
    <svg className="star-badge" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb340" />
          <stop offset="1" stopColor="#ec7211" />
        </linearGradient>
      </defs>
      <polygon
        className="star-shape"
        points="50,8 61.76,35.82 91.85,38.4 69.02,58.18 75.86,87.6 50,72 24.14,87.6 30.98,58.18 8.15,38.4 38.24,35.82"
        fill={`url(#${id})`}
        stroke={`url(#${id})`}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <text x="50" y="57" textAnchor="middle" dominantBaseline="middle" className="star-letter">{letter}</text>
    </svg>
  )
}

function StarMethod() {
  const listRef = useRef(null)
  const [shown, setShown] = useState(false)

  // Stars pop in one after another when the list scrolls into view.
  useEffect(() => {
    const el = listRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return undefined }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="advice-section star-section" id="star" aria-labelledby="star-heading">
      <div className="advice-head">
        <p className="advice-kicker">Interview tips</p>
        <h2 id="star-heading" className="advice-h2">Answer with the STAR method</h2>
        <p className="advice-intro">
          When an interviewer says &ldquo;Tell me about a time when&hellip;&rdquo;, use these four steps
          to give a clear answer with a real example.
        </p>
      </div>

      <ol className={shown ? 'star-list is-in' : 'star-list'} ref={listRef} data-no-reveal>
        {STAR_STEPS.map((s, i) => (
          <li className="star-row" key={s.letter} style={{ '--i': i }}>
            <StarBadge letter={s.letter} />
            <div className="star-text">
              <h3>
                <span className="star-word">{s.word}</span>
                <span className="star-lead">{s.lead}</span>
              </h3>
              <p>{s.how}</p>
              <p className="star-example">
                <span>For example</span>
                &ldquo;{s.example}&rdquo;
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="star-cta">
        <p>Spend most of your answer on the <strong>Action</strong> - that's the part interviewers care about most.</p>
        <Link className="primary-button" to="/interview">
          Practise with the virtual interviewer <Icon name="arrowRight" size={15} />
        </Link>
      </div>
    </section>
  )
}

function TLevelAdvice() {
  return (
    <main className="adv">
      <header className="advice-header" aria-labelledby="advice-heading">
        <div className="advice-header-content">
          <p className="advice-kicker">T Level advice</p>
          <h1 id="advice-heading">Advice for <span>students and schools</span></h1>
          <p className="advice-tagline">
            Practical guidance to help students make the most of their placements, and
            to help schools set them up and manage them.
          </p>
          <ul className="advice-jump" aria-label="Jump to a section">
            <li><a href="#students">Student advice</a></li>
            <li><a href="#star">The STAR method</a></li>
            <li><a href="#schools">School advice</a></li>
          </ul>
        </div>
      </header>

      <section className="advice-section" id="students" aria-labelledby="students-heading">
        <div className="advice-head">
          <p className="advice-kicker">For students</p>
          <h2 id="students-heading" className="advice-h2">Student advice</h2>
          <p className="advice-intro">
            How to get the most out of your placement and connect with the people around you.
          </p>
        </div>
        <AdviceCarousel items={studentAdvice} label="Student advice" />
        <AdviceDetails items={studentDetails} />
      </section>

      <StarMethod />

      <section className="advice-section" id="schools" aria-labelledby="schools-heading">
        <div className="advice-head">
          <p className="advice-kicker">For schools and colleges</p>
          <h2 id="schools-heading" className="advice-h2">School advice</h2>
          <p className="advice-intro">
            How to set up and manage T Level placements, and how to collaborate with Amazon.
          </p>
        </div>
        <AdviceCarousel items={schoolAdvice} label="School advice" />
        <AdviceDetails items={schoolDetails} />
      </section>
    </main>
  )
}

export default TLevelAdvice
