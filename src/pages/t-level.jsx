import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './t-level.css'

/* ------------------------------------------------------------------
   Content
   Images: every block below can take an `image` path such as
   '/assets/images/skills-hub.jpg' (files go in public/assets/images).
   Without one, a grey placeholder is shown instead.
------------------------------------------------------------------- */

const tabs = [
  { id: 'students', label: 'For students' },
  { id: 'schools', label: 'For schools' },
  { id: 'pathway', label: 'Career pathway' },
  { id: 'principles', label: 'Leadership Principles' },
]

const facts = [
  { title: 'Equal to 3 A Levels', text: 'A T Level is a two-year qualification taken after GCSEs, worth the same as three A Levels and recognised by employers and universities.' },
  { title: '80% classroom, 20% placement', text: 'Most of your time is spent learning, with a substantial industry placement built in.' },
  { title: '45 days on placement', text: 'You complete at least 315 hours (about 45 days) on a real industry placement with an employer like Amazon.' },
  { title: 'A route to many options', text: 'T Levels can lead to skilled work, a higher or degree apprenticeship, or university.' },
]

const phases = [
  {
    phase: 'Phase 1',
    title: 'Skills Hub immersion',
    text: 'Start in an Amazon Skills Hub, a supported space where you learn the tools, systems and ways of working used across Amazon teams before you take on live work.',
    points: ['Induction, safety and workplace basics', 'Hands-on training with Amazon tools', 'Meet your mentor and set learning goals'],
    imageAlt: 'Students training together in an Amazon Skills Hub',
  },
  {
    phase: 'Phase 2',
    title: 'Charity group project',
    text: 'Work in a small team of 5 to 7 students on a real brief from a charity partner, with Amazon staff overseeing your progress and giving feedback.',
    points: ['Plan and deliver a live project', 'Present your work to the charity', 'Take on a clear role in the team'],
    imageAlt: 'Student team presenting a project to a charity partner',
  },
  {
    phase: 'Phase 3',
    title: 'Team-based challenges',
    text: 'Join an Amazon team and help solve real business challenges alongside employees, using everything you have learned in the first two phases.',
    points: ['Work on real Amazon problems', 'Get regular feedback from your team', 'Reflect on your progress in a logbook'],
    imageAlt: 'Student working with an Amazon team on a challenge',
  },
]

const skills = [
  { title: 'Digital literacy', text: 'Use workplace software, data and cloud tools confidently, and learn how technology supports a global business.' },
  { title: 'Communication', text: 'Share ideas in meetings, write clear updates, present to stakeholders and give and receive feedback.' },
  { title: 'Problem-solving', text: 'Break down real problems, look at the data, test ideas and explain the reasoning behind your solutions.' },
]

const studentFaqs = [
  {
    question: 'Am I eligible for a T Level placement at Amazon?',
    answer: 'You need to be studying a T Level at a school or college. Your provider arranges placements with employers, so speak to your T Level tutor or careers lead and register your interest with us.',
  },
  {
    question: 'Do I need any work experience?',
    answer: 'No. The placement is designed for students with little or no experience. Phase 1 in the Skills Hub prepares you for the workplace before you take on live work.',
  },
  {
    question: 'Which T Level subjects are relevant?',
    answer: 'Digital T Levels are a strong fit, but students from management and administration, engineering and manufacturing, and other routes can also find relevant placements at Amazon. Explore the pathways page to see which fits you.',
  },
  {
    question: 'Will I work from home?',
    answer: 'Most of your placement will be face-to-face. Some hours may be remote where that matches how the team works, especially for digital T Levels.',
  },
  {
    question: 'Will I get support during my placement?',
    answer: 'Yes. You will have an Amazon mentor, regular check-ins, and at least three formal review meetings with your school or college and Amazon.',
  },
]

const schoolReasons = [
  { title: 'Curriculum alignment', text: 'Placement activities are mapped to T Level technical qualification content and the core employability, enterprise and work-readiness skills students need.' },
  { title: 'Measurable outcomes', text: 'Students set learning goals at the start and are reviewed against them, with progress reports shared with your staff at each review point.' },
  { title: 'Inclusivity focus', text: 'Placements are open to students from every background, with reasonable adjustments, flexible delivery and mentoring to support each student.' },
]

const benefitsTable = [
  { activity: 'Skills Hub immersion', curriculum: 'Health and safety, workplace behaviours, digital tools in the technical qualification', gatsby: '4. Linking curriculum learning to careers; 6. Experiences of workplaces' },
  { activity: 'Charity group project', curriculum: 'Project planning, teamwork and presenting to a client brief', gatsby: '5. Encounters with employers and employees; 6. Experiences of workplaces' },
  { activity: 'Team-based challenges', curriculum: 'Applying occupational specialism skills to real business problems', gatsby: '6. Experiences of workplaces; 4. Linking curriculum learning to careers' },
  { activity: 'Mentor sessions', curriculum: 'Professional behaviours, reflection and career planning', gatsby: '5. Encounters with employers and employees; 8. Personal guidance' },
  { activity: 'Apprenticeship and careers talks', curriculum: 'Progression routes after the T Level', gatsby: '2. Learning from career and labour market information; 7. Encounters with further and higher education' },
]

const amazonSupport = [
  { title: 'Dedicated mentors', text: 'Every student is paired with an Amazon employee who guides them, answers questions and helps them reach their learning goals.' },
  { title: 'Progress reports', text: 'Your staff receive written feedback at each review meeting and an end-of-placement appraisal for every student.' },
  { title: 'STEM resources', text: 'Classroom resources and activities from Amazon programmes, such as Amazon Future Engineer, to help prepare students before the placement.' },
]

const frameworkPoints = [
  'The minimum placement is still 315 hours, about 45 days.',
  'Hours can be delivered in different ways, including skills hubs, small team projects of 5 to 7 students, and work with more than one employer.',
  'Up to 20% of hours can usually be remote, with more allowed in sectors like digital where hybrid working is normal.',
  'Up to 35 hours can be spent on work taster activities such as shadowing teams.',
  'Providers hold at least three review meetings, and every student keeps a placement logbook.',
]

const steps = [
  { step: '1', title: 'Explore pathways', text: 'Look at the five subject areas and see what each one involves.' },
  { step: '2', title: 'Take the quiz', text: 'Answer a few questions to find the pathway that fits your interests.' },
  { step: '3', title: 'Register interest', text: 'Let Amazon know you are interested in a placement on your chosen pathway.' },
  { step: '4', title: 'Start your placement', text: 'Join an Amazon team, build real skills, and launch your career.' },
]

const timeline = [
  { step: '1', title: 'T Level study', text: 'Two years of classroom learning in your chosen subject at school or college.' },
  { step: '2', title: 'Amazon placement', text: '45 days building real skills across the three placement phases.' },
  { step: '3', title: 'Apprenticeship', text: 'Apply for an Amazon apprenticeship with real Amazon experience on your CV.' },
  { step: '4', title: 'Permanent role', text: 'Finish your apprenticeship and continue your career at Amazon.' },
]

const apprenticeships = [
  { role: 'Software Development Engineer', work: 'Design, build and test software for Amazon and AWS customers.', fit: 'Digital' },
  { role: 'Data Analyst', work: 'Clean, model and analyse data to help teams make decisions.', fit: 'Digital' },
  { role: 'Project Management', work: 'Plan and deliver projects across HR, operations, technology and entertainment.', fit: 'Management and administration' },
  { role: 'Product Management', work: 'Shape digital products that solve real customer problems.', fit: 'Digital; Management and administration' },
  { role: 'IT Engineer', work: 'Support IT systems, networks and cyber security.', fit: 'Digital' },
  { role: 'Robotics and Mechatronics Maintenance', work: 'Maintain the robotics systems that keep Amazon operations running.', fit: 'Engineering and manufacturing' },
  { role: 'Data Centre Engineering', work: 'Keep AWS data centres running reliably and safely.', fit: 'Engineering and manufacturing; Digital' },
]

const principles = [
  { name: 'Customer Obsession', meaning: 'Start with the customer and work backwards. Think about who you are helping before you start.', placement: 'In your charity project, you will begin by finding out what the charity actually needs.' },
  { name: 'Ownership', meaning: 'Take responsibility for your work and its results. Never say "that\'s not my job".', placement: 'You will own a clear role in your team and see your tasks through to the end.' },
  { name: 'Invent and Simplify', meaning: 'Look for new ideas and simpler ways of doing things.', placement: 'In team challenges, you will be encouraged to suggest better ways of solving a problem.' },
  { name: 'Learn and Be Curious', meaning: 'Keep learning and ask questions about everything.', placement: 'In the Skills Hub, you will explore new tools and ask your mentor how things work.' },
  { name: 'Insist on the Highest Standards', meaning: 'Aim for high-quality work and keep raising the bar.', placement: 'You will review your work with feedback from your team before handing it in.' },
  { name: 'Bias for Action', meaning: 'Speed matters. Many decisions can be changed later, so try things and learn.', placement: 'You will make decisions in your project team instead of waiting to be told what to do.' },
  { name: 'Earn Trust', meaning: 'Listen carefully, speak honestly and treat others with respect.', placement: 'You will be honest about what is going well and what is not in your review meetings.' },
  { name: 'Dive Deep', meaning: 'Stay close to the details and check the facts.', placement: 'You will look at data and evidence to understand a problem before solving it.' },
  { name: 'Have Backbone; Disagree and Commit', meaning: 'Respectfully challenge ideas you disagree with, then fully support the final decision.', placement: 'In team meetings, you will share your view, then back the plan the team agrees on.' },
  { name: 'Deliver Results', meaning: 'Focus on what matters most and get it done on time.', placement: 'You will deliver your charity project and present the finished work to the charity.' },
]

const principleSkills = [
  { name: 'Customer Obsession', skill: 'Customer service and empathy', industries: 'Retail, healthcare, hospitality, public services' },
  { name: 'Ownership', skill: 'Accountability and reliability', industries: 'Every industry' },
  { name: 'Invent and Simplify', skill: 'Creativity and innovation', industries: 'Technology, engineering, design, marketing' },
  { name: 'Learn and Be Curious', skill: 'Adaptability and self-development', industries: 'Every industry' },
  { name: 'Insist on the Highest Standards', skill: 'Attention to detail and quality', industries: 'Engineering, finance, healthcare, manufacturing' },
  { name: 'Bias for Action', skill: 'Initiative and decision-making', industries: 'Business, operations, start-ups' },
  { name: 'Earn Trust', skill: 'Integrity and teamwork', industries: 'Every industry' },
  { name: 'Dive Deep', skill: 'Analytical thinking', industries: 'Data, finance, science, research' },
  { name: 'Have Backbone; Disagree and Commit', skill: 'Confident communication and collaboration', industries: 'Management, law, education, business' },
  { name: 'Deliver Results', skill: 'Time management and goal setting', industries: 'Every industry' },
]

/* ------------------------------------------------------------------
   Small helpers
------------------------------------------------------------------- */

// Shows an image if one is given, otherwise a grey placeholder block.
function Media({ image, alt, className = '' }) {
  if (image) {
    return <img className={`tl-media ${className}`} src={image} alt={alt} />
  }
  return (
    <div className={`tl-media tl-media-placeholder ${className}`} role="img" aria-label={alt}>
      Image coming soon
    </div>
  )
}

// Turns 'A; B' into ['A', 'B'] for tag pills.
const splitTags = (text) => text.split(';').map((tag) => tag.trim()).filter(Boolean)

// Builds a CSV file (opens in Excel, Numbers or Google Sheets) and downloads it.
function downloadCsv(filename, headers, rows) {
  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
  // The BOM makes Excel read characters like ’ and – correctly.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function DownloadButton({ filename, headers, rows }) {
  return (
    <button
      type="button"
      className="download-button"
      onClick={() => downloadCsv(filename, headers, rows)}
    >
      <span aria-hidden="true">⤓</span> Download (CSV)
    </button>
  )
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------- */

// The tab comes from the URL (#students, #schools...) so links can open a tab directly.
function tabFromHash(hash) {
  const id = (hash || '').replace('#', '')
  return tabs.some((tab) => tab.id === id) ? id : tabs[0].id
}

function TLevel() {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const panelRef = useRef(null)

  const [active, setActive] = useState(() => tabFromHash(hash))

  useEffect(() => {
    if (hash) setActive(tabFromHash(hash))
  }, [hash])

  const selectTab = (id) => {
    if (id === active) return
    setActive(id)
    navigate({ hash: id }, { replace: true })
    // If you've scrolled down into the content, bring the start of the new tab into view.
    const panel = panelRef.current
    if (panel) {
      const nav = document.querySelector('.tl-subnav')
      const offset = nav ? nav.offsetHeight : 0
      const top = panel.getBoundingClientRect().top + window.scrollY - offset
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  // Left/right arrow keys move between tabs.
  const onTabKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = tabs.findIndex((tab) => tab.id === active)
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id
    selectTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <>
      <main>
        {/* Header */}
        <section className="tl-header" aria-labelledby="tl-heading">
          <div className="tl-header-content">
            <h1 id="tl-heading">A new way to <span>start your career</span></h1>
            <p className="tl-tagline">
              T Levels combine classroom study with a real industry placement. At Amazon,
              that placement gives you the skills, experience and connections employers
              are looking for.
            </p>
            <div className="tl-actions">
              <a className="primary-button" href="/information">Explore pathways</a>
              <a className="secondary-button tl-secondary-on-dark" href="/quiz">Take the career quiz</a>
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="content-section tl-split" aria-labelledby="tl-intro-heading">
          <div>
            <h2 id="tl-intro-heading">Real work, real teams, real progression</h2>
            <p className="tl-body">
              Amazon offers T Level industry placements that give students hands-on
              experience inside one of the world's biggest companies. Students learn
              how Amazon works, build skills employers value, and see the apprenticeships
              and careers that could follow.
            </p>
            <p className="tl-body">
              Schools and colleges get a structured placement that supports their
              curriculum and careers programme, with mentoring and reporting from Amazon.
            </p>
            <a className="tl-link" href="/t-level/advice">Read our advice for students and schools →</a>
          </div>
          <Media alt="T Level students at an Amazon site" />
        </section>

        {/* Tabs: only the selected audience's content is shown below */}
        <nav className="tl-subnav" aria-label="T Level topics">
          <div className="tl-tabs" role="tablist" aria-label="Choose a topic" onKeyDown={onTabKeyDown}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                className={active === tab.id ? 'tl-tab is-active' : 'tl-tab'}
                aria-selected={active === tab.id}
                aria-controls="tl-panel"
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div
          className="tl-panel"
          id="tl-panel"
          role="tabpanel"
          aria-labelledby={`tab-${active}`}
          ref={panelRef}
          key={active}
        >
          {active === 'students' && (
            <>
            {/* ================= FOR STUDENTS ================= */}
            <section className="tl-band" id="students" aria-labelledby="students-heading">
              <div className="content-section">
                <h2 id="students-heading">What is a T Level?</h2>
                <p className="section-intro">
                  T Levels are designed with employers, so what you learn matches what the
                  workplace actually needs.
                </p>
                <div className="fact-grid">
                  {facts.map((fact) => (
                    <article className="fact-card" key={fact.title}>
                      <h3>{fact.title}</h3>
                      <p>{fact.text}</p>
                    </article>
                  ))}
                </div>

                <h2 className="tl-subheading" id="phases-heading">Your placement in three phases</h2>
                <p className="section-intro">
                  Your 45 days at Amazon build up step by step, from learning the basics to
                  working on real challenges with an Amazon team.
                </p>
                <ol className="phase-list" aria-labelledby="phases-heading">
                  {phases.map((item) => (
                    <li className="phase-card" key={item.title}>
                      <Media image={item.image} alt={item.imageAlt} className="phase-media" />
                      <div className="phase-body">
                        <span className="phase-label">{item.phase}</span>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                        <ul>
                          {item.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ol>

                <h2 className="tl-subheading">Skills you will gain</h2>
                <div className="skill-grid">
                  {skills.map((item) => (
                    <article className="skill-item" key={item.title}>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>

                <h2 className="tl-subheading" id="student-faq-heading">Frequently asked questions</h2>
                <div className="tl-faq" aria-labelledby="student-faq-heading">
                  {studentFaqs.map((item) => (
                    <details className="tl-faq-item" key={item.question}>
                      <summary>{item.question}</summary>
                      <p>{item.answer}</p>
                    </details>
                  ))}
                </div>

                <div className="tl-section-actions">
                  <a className="primary-button" href="/register-interest">Register your interest</a>
                  <a className="secondary-button" href="/t-level/advice#students">Student advice</a>
                </div>
              </div>
            </section>

            {/* Your journey (original four steps) */}
            <section className="tl-steps" aria-labelledby="steps-heading">
              <div className="tl-steps-inner">
                <h2 id="steps-heading">From curious to placement in four steps</h2>
                <div className="step-grid">
                  {steps.map((item) => (
                    <article className="step-card" key={item.step}>
                      <span className="step-number">{item.step}</span>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
            </>
          )}
          {active === 'schools' && (
            <>
            {/* ================= FOR SCHOOLS ================= */}
            <section className="tl-band" id="schools" aria-labelledby="schools-heading">
              <div className="content-section">
                <h2 id="schools-heading">Why partner with Amazon?</h2>
                <p className="section-intro">
                  An Amazon placement helps your students build the skills for employability
                  while supporting your curriculum and careers programme.
                </p>

                <div className="tl-split tl-split-flush">
                  <div className="reason-list">
                    {schoolReasons.map((item) => (
                      <article className="reason-item" key={item.title}>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                      </article>
                    ))}
                  </div>
                  <Media alt="Teacher and Amazon mentor reviewing a student's progress" />
                </div>

                <div className="tl-heading-row">
                  <h2 className="tl-subheading" id="benefits-heading">How placement activities map to your curriculum</h2>
                  <DownloadButton
                    filename="amazon-t-level-curriculum-map.csv"
                    headers={['Placement activity', 'Curriculum link', 'Gatsby Benchmarks']}
                    rows={benefitsTable.map((row) => [row.activity, row.curriculum, row.gatsby])}
                  />
                </div>
                <ul className="map-list" aria-labelledby="benefits-heading">
                  {benefitsTable.map((row, index) => (
                    <li className="map-item" key={row.activity}>
                      <span className="map-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <div className="map-main">
                        <h3>{row.activity}</h3>
                        <p>{row.curriculum}</p>
                      </div>
                      <div className="map-tags">
                        <span className="tag-label">Gatsby Benchmarks</span>
                        <ul className="tag-list">
                          {splitTags(row.gatsby).map((tag) => (
                            <li className="tag" key={tag}>{tag}</li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>

                <h2 className="tl-subheading">Support from Amazon</h2>
                <div className="fact-grid fact-grid-3">
                  {amazonSupport.map((item) => (
                    <article className="fact-card" key={item.title}>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>

                <aside className="framework-box" aria-labelledby="framework-heading">
                  <h3 id="framework-heading">The new industry placement framework</h3>
                  <p>
                    The Department for Education updated its industry placement guidance for
                    2026, giving schools and colleges more freedom to shape placements around
                    their students and local employers. Amazon's three-phase placement is built
                    around this framework.
                  </p>
                  <ul>
                    {frameworkPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <a
                    className="tl-link"
                    href="https://www.gov.uk/government/publications/t-level-industry-placements-guidance-for-providers--2/t-level-industry-placements-guidance-for-education-providers"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read the full guidance on GOV.UK (opens in a new tab) →
                  </a>
                </aside>

                <div className="tl-section-actions">
                  <a className="primary-button" href="/register-interest">Start a partnership</a>
                  <a className="secondary-button" href="/t-level/advice#schools">School advice</a>
                </div>
              </div>
            </section>
            </>
          )}
          {active === 'pathway' && (
            <>
            {/* ================= CAREER PATHWAY ================= */}
            <section className="tl-band tl-band-light" id="pathway" aria-labelledby="pathway-heading">
              <div className="content-section">
                <h2 id="pathway-heading">From T Level to a career at Amazon</h2>
                <p className="section-intro">
                  Your placement can be the first step on a fast-track route into an Amazon
                  apprenticeship and a permanent role.
                </p>

                <ol className="timeline">
                  {timeline.map((item) => (
                    <li className="timeline-step" key={item.step}>
                      <span className="timeline-number" aria-hidden="true">{item.step}</span>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </li>
                  ))}
                </ol>

                <div className="earn-callout">
                  <div>
                    <h3>Earn while you learn</h3>
                    <p>
                      Amazon apprentices are paid a salary while they train and gain a
                      recognised qualification, with <strong>zero tuition fees</strong>.
                      Students who complete a T Level placement at Amazon already know the
                      teams, the tools and the Leadership Principles, giving them a head
                      start when they apply.
                    </p>
                  </div>
                  <Media alt="Amazon apprentice at work" className="earn-media" />
                </div>

                <div className="tl-heading-row">
                  <h2 className="tl-subheading" id="apprenticeships-heading">Amazon apprenticeships you could progress into</h2>
                  <DownloadButton
                    filename="amazon-apprenticeships.csv"
                    headers={['Apprenticeship', 'What you would do', 'Related T Level route']}
                    rows={apprenticeships.map((row) => [row.role, row.work, row.fit])}
                  />
                </div>
                <ul className="role-grid" aria-labelledby="apprenticeships-heading">
                  {apprenticeships.map((row) => (
                    <li className="role-card" key={row.role}>
                      <h3>{row.role}</h3>
                      <p>{row.work}</p>
                      <ul className="tag-list">
                        {splitTags(row.fit).map((tag) => (
                          <li className="tag" key={tag}>{tag}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
                <a
                  className="tl-link"
                  href="https://amazonapprenticeships.co.uk/our-programmes"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  See all Amazon apprenticeship programmes (opens in a new tab) →
                </a>
              </div>
            </section>
            </>
          )}
          {active === 'principles' && (
            <>
            {/* ================= LEADERSHIP PRINCIPLES ================= */}
            <section className="tl-band" id="principles" aria-labelledby="principles-heading">
              <div className="content-section">
                <h2 id="principles-heading">How Amazon works, and how you will too</h2>
                <p className="section-intro">
                  Amazon's Leadership Principles guide how every employee works. Here are ten
                  of them in plain language, and how you will use each one on your placement.
                </p>

                <div className="principle-grid">
                  {principles.map((item, index) => (
                    <article className="principle-card" key={item.name}>
                      <span className="principle-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <h3>{item.name}</h3>
                      <p>{item.meaning}</p>
                      <p className="principle-placement">
                        <strong>On your placement:</strong> {item.placement}
                      </p>
                    </article>
                  ))}
                </div>

                <h2 className="tl-subheading" id="principle-skills-heading">Skills that work in any industry</h2>
                <p className="section-intro">
                  Each principle builds an employability skill that employers value, whether
                  or not you stay at Amazon.
                </p>
                <div className="tl-table-wrap">
                  <table className="tl-table" aria-labelledby="principle-skills-heading">
                    <thead>
                      <tr>
                        <th scope="col">Leadership Principle</th>
                        <th scope="col">Transferable skill</th>
                        <th scope="col">Where it is valued</th>
                      </tr>
                    </thead>
                    <tbody>
                      {principleSkills.map((row) => (
                        <tr key={row.name}>
                          <th scope="row">{row.name}</th>
                          <td>{row.skill}</td>
                          <td>{row.industries}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
            </>
          )}
        </div>
      </main>
    </>
  )
}

export default TLevel
