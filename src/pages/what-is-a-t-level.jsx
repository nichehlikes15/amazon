import './what-is-a-t-level.css'

// General information about T Levels (not specific to Amazon).
// Facts checked against tlevels.gov.uk and GOV.UK guidance, October 2026.

const facts = [
  { title: 'A two-year course', text: 'T Levels are Level 3 technical qualifications you can take after your GCSEs, usually between the ages of 16 and 19.' },
  { title: 'Equal to 3 A Levels', text: 'One T Level is the same size as three A Levels and earns up to 168 UCAS points.' },
  { title: '45 days with an employer', text: 'Every T Level includes an industry placement of at least 315 hours, about 45 days.' },
  { title: 'Designed with employers', text: 'Businesses help write the content, so what you learn matches what the workplace needs.' },
]

const parts = [
  {
    title: 'Core component',
    text: 'The knowledge and skills for your whole subject area, such as how the industry works and the key theory behind it. You are assessed through exams and an employer-set project.',
  },
  {
    title: 'Occupational specialism',
    text: 'The practical skills for a specific job within your subject, for example software development within Digital. You are assessed through practical tasks.',
  },
  {
    title: 'Industry placement',
    text: 'At least 315 hours working with a real employer, where you put what you have learned into practice and build workplace skills.',
  },
]

const grades = [
  { grade: 'Distinction*', points: '168', equal: 'A*A*A*' },
  { grade: 'Distinction', points: '144', equal: 'AAA' },
  { grade: 'Merit', points: '120', equal: 'BBB' },
  { grade: 'Pass (core A* to C)', points: '96', equal: 'CCC' },
  { grade: 'Pass (core D or E)', points: '72', equal: 'DDD' },
]

// Each subject area opens to show its courses and example jobs.
const subjects = [
  { route: 'Agriculture, Environmental and Animal Care', options: ['Agriculture, Land Management and Production', 'Animal Care and Management'], jobs: 'Farm manager, veterinary nurse, environmental officer' },
  { route: 'Business and Administration', options: ['Management and Administration'], jobs: 'Office manager, HR assistant, project coordinator' },
  { route: 'Construction', options: ['Building Services Engineering for Construction', 'Design, Surveying and Planning for Construction'], jobs: 'Surveyor, site technician, electrical or plumbing engineer' },
  { route: 'Creative and Design', options: ['Craft and Design', 'Media, Broadcast and Production'], jobs: 'Designer, video producer, content creator' },
  { route: 'Digital', options: ['Digital Data Analytics', 'Digital Software Development', 'Digital Support and Security'], jobs: 'Software developer, data analyst, cyber security technician' },
  { route: 'Education and Early Years', options: ['Education and Early Years'], jobs: 'Teaching assistant, nursery practitioner, early years educator' },
  { route: 'Engineering and Manufacturing', options: ['Design and Development', 'Maintenance, Installation and Repair', 'Engineering, Manufacturing, Processing and Control'], jobs: 'Engineering technician, maintenance engineer, CAD designer' },
  { route: 'Health and Science', options: ['Health', 'Science'], jobs: 'Healthcare assistant, lab technician, pharmacy assistant' },
  { route: 'Legal, Finance and Accounting', options: ['Accounting', 'Finance', 'Legal Services'], jobs: 'Accounts assistant, paralegal, financial adviser' },
  { route: 'Sales, Marketing and Procurement', options: ['Marketing'], jobs: 'Marketing assistant, social media executive, buyer' },
]

// Example universities that list T Levels in their entry requirements.
// Always check the course page, as requirements can change.
const universities = [
  {
    subject: 'Computer science and digital',
    tLevel: 'Digital T Levels',
    unis: [
      { name: 'Brunel University of London', offer: 'Merit' },
      { name: 'Birmingham City University', offer: 'Merit' },
      { name: 'Keele University', offer: 'Merit, any T Level' },
    ],
  },
  {
    subject: 'Health and allied health',
    tLevel: 'Health and Science T Levels',
    unis: [
      { name: 'University of Worcester', offer: 'Most allied health courses' },
    ],
  },
  {
    subject: 'Courses across many subjects',
    tLevel: 'Check each course',
    unis: [
      { name: 'University of Portsmouth', offer: 'Grades listed on each course' },
      { name: 'Aston University', offer: 'A range of degrees' },
    ],
  },
]

const comparison = [
  {
    name: 'T Levels',
    highlight: true,
    points: ['About 80% classroom, 20% placement', 'Focused on one industry', 'Equal to 3 A Levels', 'Leads to work, an apprenticeship or university'],
  },
  {
    name: 'A Levels',
    points: ['Mostly classroom study', 'Usually three separate subjects', 'Mainly assessed by exams', 'Often leads to university'],
  },
  {
    name: 'Apprenticeships',
    points: ['About 80% work, 20% training', 'You are employed and paid a wage', 'Available at many levels', 'Leads to a qualification and a job'],
  },
]

const afterOptions = [
  { title: 'Skilled work', text: 'Go straight into a job in your industry, with real workplace experience on your CV.' },
  { title: 'An apprenticeship', text: 'Move on to a higher or degree apprenticeship and earn while you keep learning.' },
  { title: 'University', text: 'Use your UCAS points to apply for a degree. Many universities accept T Levels.' },
]

const faqs = [
  {
    question: 'Who can take a T Level?',
    answer: 'T Levels are for students aged 16 to 19 in England. Entry requirements are set by each school or college, and many ask for around five GCSEs at grade 4 or above, including English and maths.',
  },
  {
    question: 'Where can I study a T Level?',
    answer: 'T Levels are offered by schools and colleges across England. You can search for providers near you on the official T Levels website.',
  },
  {
    question: 'Do I get paid on my industry placement?',
    answer: 'Industry placements are usually unpaid, because they are part of your course. Some employers choose to pay students or cover costs like travel and lunch.',
  },
  {
    question: 'Can I go to university with a T Level?',
    answer: 'Yes. T Levels earn UCAS points in the same way as A Levels. Check each university\'s entry requirements, as some courses ask for specific subjects.',
  },
  {
    question: 'Can I switch to a T Level from A Levels?',
    answer: 'It depends on your school or college and how far into the year you are. Speak to your careers adviser as early as possible.',
  },
]

function WhatIsTLevel() {
  return (
    <>
      <main>
        <section className="wtl-header" aria-labelledby="wtl-heading">
          <div className="wtl-header-content">
            <p className="eyebrow">T Levels explained</p>
            <h1 id="wtl-heading">What is a <span>T Level?</span></h1>
            <p className="wtl-tagline">
              T Levels are two-year courses that mix classroom learning with a real
              industry placement. Here is how they work, what you can study and where
              they can take you.
            </p>
            <div className="wtl-actions">
              <a className="primary-button" href="/tlevel">T Levels at Amazon</a>
              <a className="secondary-button wtl-secondary-on-dark" href="/information">Explore pathways</a>
            </div>
          </div>
        </section>

        <section className="content-section" aria-labelledby="facts-heading">
          <p className="eyebrow">The basics</p>
          <h2 id="facts-heading">T Levels at a glance</h2>
          <div className="wtl-fact-grid">
            {facts.map((item) => (
              <article className="wtl-fact" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wtl-band" aria-labelledby="parts-heading">
          <div className="content-section">
            <p className="eyebrow">How it works</p>
            <h2 id="parts-heading">The three parts of a T Level</h2>
            <p className="section-intro">
              Every T Level is made up of the same three parts. You need to pass all of
              them to get your overall grade.
            </p>
            <ol className="wtl-parts">
              {parts.map((item, index) => (
                <li className="wtl-part" key={item.title}>
                  <span className="wtl-part-number" aria-hidden="true">{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="content-section" aria-labelledby="grades-heading">
          <p className="eyebrow">Grades and UCAS points</p>
          <h2 id="grades-heading">What your grade is worth</h2>
          <p className="section-intro">
            You get one overall grade for your T Level. Each grade earns UCAS points
            equal to three A Levels.
          </p>
          <ul className="wtl-grades">
            {grades.map((item) => (
              <li className="wtl-grade" key={item.grade}>
                <span className="wtl-grade-name">{item.grade}</span>
                <span className="wtl-grade-points">{item.points}</span>
                <span className="wtl-grade-label">UCAS points</span>
                <span className="wtl-grade-equal">Same as {item.equal} at A Level</span>
              </li>
            ))}
          </ul>

          <h2 className="wtl-subheading" id="unis-heading">Universities that accept T Levels</h2>
          <p className="section-intro">
            Many universities accept T Levels for at least some of their degrees. Here
            are a few examples by subject.
          </p>
          <div className="wtl-unis">
            {universities.map((group) => (
              <article className="wtl-uni-group" key={group.subject}>
                <h3>{group.subject}</h3>
                <span className="wtl-uni-tlevel">{group.tLevel}</span>
                <ul>
                  {group.unis.map((uni) => (
                    <li key={uni.name}>
                      <span className="wtl-uni-name">{uni.name}</span>
                      <span className="wtl-uni-offer">{uni.offer}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="wtl-source">
            Entry requirements change, so always check the course page. See the{' '}
            <a
              href="https://www.gov.uk/government/publications/higher-education-providers-with-t-levels-in-entry-requirements/list-of-higher-education-providers-that-accept-t-levels-for-entry"
              target="_blank"
              rel="noopener noreferrer"
            >
              full list of universities on GOV.UK (opens in a new tab)
            </a>.
          </p>
        </section>

        <section className="wtl-band" aria-labelledby="subjects-heading">
          <div className="content-section">
            <p className="eyebrow">Subjects</p>
            <h2 id="subjects-heading">What you can study</h2>
            <p className="section-intro">
              There are over 20 T Level subjects across 10 subject areas. Open one to see
              its courses and the jobs it can lead to.
            </p>
            <div className="wtl-subjects">
              {subjects.map((item) => (
                <details className="wtl-subject" key={item.route}>
                  <summary>
                    <span>{item.route}</span>
                    <span className="wtl-subject-count">
                      {item.options.length} {item.options.length === 1 ? 'course' : 'courses'}
                    </span>
                  </summary>
                  <div className="wtl-subject-body">
                    <ul>
                      {item.options.map((option) => (
                        <li key={option}>{option}</li>
                      ))}
                    </ul>
                    <p><strong>Example jobs:</strong> {item.jobs}</p>
                  </div>
                </details>
              ))}
            </div>
            <p className="wtl-source">
              Social Care and Sport T Levels are coming from September 2028.
            </p>
          </div>
        </section>

        <section className="content-section" aria-labelledby="compare-heading">
          <p className="eyebrow">Your options after GCSEs</p>
          <h2 id="compare-heading">How T Levels compare</h2>
          <div className="wtl-compare">
            {comparison.map((item) => (
              <article
                className={`wtl-compare-card${item.highlight ? ' wtl-compare-highlight' : ''}`}
                key={item.name}
              >
                <h3>{item.name}</h3>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <h2 className="wtl-subheading">Where a T Level can take you</h2>
          <div className="wtl-after">
            {afterOptions.map((item) => (
              <article className="wtl-after-item" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wtl-band" aria-labelledby="faq-heading">
          <div className="content-section">
            <p className="eyebrow">Questions</p>
            <h2 id="faq-heading">Frequently asked questions</h2>
            <div className="wtl-faq">
              {faqs.map((item) => (
                <details className="wtl-faq-item" key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
            <p className="wtl-source">
              Want to find out more? Visit the{' '}
              <a href="https://www.tlevels.gov.uk/students" target="_blank" rel="noopener noreferrer">
                official T Levels website (opens in a new tab)
              </a>.
            </p>
          </div>
        </section>

        <section className="wtl-cta" aria-labelledby="wtl-cta-heading">
          <div className="wtl-cta-inner">
            <h2 id="wtl-cta-heading">See what a T Level looks like at Amazon</h2>
            <p>Find out about Amazon placements, the skills you will build and the apprenticeships that could follow.</p>
            <div className="wtl-actions">
              <a className="primary-button" href="/tlevel">T Levels at Amazon</a>
              <a className="secondary-button wtl-secondary-on-dark" href="/t-level/advice">Read our advice</a>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default WhatIsTLevel
