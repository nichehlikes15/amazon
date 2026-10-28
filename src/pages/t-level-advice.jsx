import { useEffect, useRef, useState } from 'react'
import './t-level-advice.css'

// Add more cards here; the carousel scrolls through all of them.
const studentAdvice = [
  { title: 'Get the most out of your placement', text: 'Ask questions, take notes, and treat every task as a chance to learn something new.' },
  { title: 'Connect with people at work', text: 'Introduce yourself to your team, find a buddy or mentor, and stay curious about what everyone does.' },
  { title: 'Build good habits early', text: 'Be on time, communicate clearly, and ask for feedback so you keep improving.' },
  { title: 'Keep your logbook up to date', text: 'Every T Level student must keep a placement logbook. Write in it regularly while what you did is still fresh.' },
  { title: 'Know your learning goals', text: 'You will have at least three technical and three employability goals. Check them each week and track your progress.' },
  { title: 'Speak up early', text: 'If something is not working, such as your travel, your workload or your health, tell your tutor or mentor straight away.' },
]

// Text sections shown under the student cards, each with a photo alongside.
const studentDetails = [
  {
    title: 'Before your placement starts',
    paragraphs: [
      'Your school or college arranges the placement with Amazon. Before it starts, you and Amazon sign a placement agreement that sets out your objectives, learning goals, working hours and who to contact. Read it carefully and ask about anything you are unsure of.',
      'Plan your journey, check what to wear and what to bring, and read about the Amazon Leadership Principles. Phase 1 in the Skills Hub is there to teach you the tools and ways of working, so you do not need any experience before you start.',
    ],
    image: '/assets/images/advice-before-placement.jpg',
    imageAlt: 'Two students preparing at an outdoor table, one typing on a laptop and the other writing notes',
  },
  {
    title: 'During your placement',
    paragraphs: [
      'You will work towards your learning goals with support from your Amazon mentor. Record what you did, what you learned and the feedback you received in your logbook, along with your hours on the timesheet.',
      'Your school or college will hold at least three review meetings with you and Amazon, and at least one of them will take place at your workplace. Use these meetings to talk honestly about what is going well and what you need help with.',
    ],
    image: '/assets/images/advice-during-placement.jpg',
    imageAlt: 'A team member stands beside a young woman at an office desk, guiding her through printed documents as others work nearby',
  },
  {
    title: 'After your placement',
    paragraphs: [
      'At your final review meeting, your school or college and Amazon confirm that you have completed at least 315 hours and met the completion criteria. Amazon also writes an appraisal of how you progressed towards your learning goals.',
      'Use your logbook and appraisal to update your CV and prepare examples for interviews. Then look at what comes next: an Amazon apprenticeship, other skilled work, or further study.',
    ],
    image: '/assets/images/advice-after-placement.jpg',
    imageAlt: 'A student sketches ideas in a notebook while two classmates lean in to look and give feedback',
  },
]

// Add more cards here; the carousel scrolls through all of them.
const schoolAdvice = [
  { title: 'Setting up placements', text: 'Learn how to plan and arrange T Level placements with employers like Amazon.' },
  { title: 'Managing placements', text: 'Keep track of student progress, employer contacts and paperwork in one place.' },
  { title: 'Collaborating with Amazon', text: 'Find out how your school or college can work with Amazon on T Level opportunities.' },
  { title: 'Agree objectives and goals', text: 'Agree up to three high-level objectives with the employer, and at least three technical and three employability learning goals for each student.' },
  { title: 'Plan review meetings', text: 'Schedule at least three review meetings for each student, with at least one held at the workplace.' },
  { title: 'Prepare students in advance', text: 'Use enrichment, employability and work taster activities earlier in the course to build confidence before the placement begins.' },
]

// Text sections shown under the school cards, each with a photo alongside.
const schoolDetails = [
  {
    title: 'Planning placements with employers',
    paragraphs: [
      'Every T Level student must complete an industry placement of at least 315 hours, about 45 days, to receive their full T Level certificate. Start planning early so that placement hours fit around teaching across the two years.',
      'Record the placement objectives, learning goals and typical activities in a placement agreement. The student and employer must sign it before the placement starts, and you must keep a signed copy for at least three years. The Department for Education\'s Connect service can also help you find local employers.',
    ],
    image: '/assets/images/advice-planning-placements.jpg',
    imageAlt: 'A man points to a page in an open folder as two colleagues read along and plan together',
  },
  {
    title: 'Supporting students on placement',
    paragraphs: [
      'Check at regular intervals that students are completing their logbooks, and keep in regular contact with the employer so that any attendance, behaviour or wellbeing concerns are dealt with quickly.',
      'You can help students by finding out early about anything that could affect their placement, such as caring responsibilities, health needs or a long journey. Then agree support with the employer, such as adjusted hours or reasonable adjustments. Help each student prepare by practising workplace skills, setting goals they understand and checking in with them often, so they know who to talk to if they need help.'
    ],
    image: '/assets/images/advice-supporting-students.jpg',
    imageAlt: 'A teacher stands by a chalkboard talking with a small group of students seated around a table',
  },
  {
    title: 'Building a partnership with Amazon',
    paragraphs: [
      'Amazon\'s nine-week placement starts with an onboarding week in a Skills Hub. A group project then runs in weeks 2 to 4, alongside team-based challenges that continue until week 9. Each student is paired with an Amazon mentor, and your staff receive progress feedback at every review meeting.',
      'To get started, register your interest and tell us which T Level routes your students are studying and how many students you have. We will then work with you to agree dates, objectives and the reporting you need.',
    ],
    image: '/assets/images/advice-partnership.jpg',
    imageAlt: 'A presenter beside a whiteboard leads a meeting with colleagues seated around a boardroom table',
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

// Text sections with an image alongside (a grey box shows if no image is set).
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
            <h1 id="advice-heading">Advice for <span>students and schools</span></h1>
            <p className="advice-tagline">
              Practical guidance to help students make the most of their placements, and
              to help schools set them up and manage them.
            </p>
          </div>
        </section>

        <section className="content-section" id="students" aria-labelledby="students-heading">
          <h2 id="students-heading">Student advice</h2>
          <p className="section-intro">
            How to get the most out of your placement and connect with the people around you.
          </p>
          <AdviceCarousel items={studentAdvice} label="Student advice" />
          <AdviceDetails items={studentDetails} />
        </section>

        <section className="advice-band">
          <div className="content-section" id="schools" aria-labelledby="schools-heading">
            <h2 id="schools-heading">School advice</h2>
            <p className="section-intro">
              How to set up and manage T Level placements, and how to collaborate with Amazon.
            </p>
            <AdviceCarousel items={schoolAdvice} label="School advice" />
            <AdviceDetails items={schoolDetails} />
            <p className="advice-source">
              Source:{' '}
              <a
                href="https://www.gov.uk/government/publications/t-level-industry-placements-guidance-for-providers--2/t-level-industry-placements-guidance-for-education-providers"
                target="_blank"
                rel="noopener noreferrer"
              >
                T Level industry placements: guidance for education providers, Department for Education (opens in a new tab)
              </a>
            </p>
          </div>
        </section>
      </main>
    </>
  )
}

export default TLevelAdvice
