import './information.css'

const pathways = [
  {
    id: 'digital',
    name: 'Digital',
    summary: 'Build software, work with data, and keep systems running and secure.',
    study: ['Software development', 'Data analysis', 'Digital support and security'],
    skills: ['Programming', 'Problem solving', 'Working with databases'],
    roles: ['Software developer', 'Data analyst', 'IT support technician'],
  },
  {
    id: 'business',
    name: 'Business',
    summary: 'Plan, organise and lead - the skills behind how a company runs day to day.',
    study: ['Business operations', 'Project management', 'Marketing and finance basics'],
    skills: ['Planning', 'Communication', 'Teamwork and leadership'],
    roles: ['Operations assistant', 'Project coordinator', 'Business analyst'],
  },
  {
    id: 'media',
    name: 'Media',
    summary: 'Tell stories and design content across digital and creative channels.',
    study: ['Content creation', 'Design principles', 'Digital communication'],
    skills: ['Creativity', 'Visual design', 'Writing and editing'],
    roles: ['Content creator', 'Junior designer', 'Social media assistant'],
  },
  {
    id: 'finance',
    name: 'Finance',
    summary: 'Work with numbers, budgets and reporting to help a business make decisions.',
    study: ['Accounting basics', 'Budgeting and reporting', 'Financial analysis'],
    skills: ['Attention to detail', 'Numeracy', 'Working with data'],
    roles: ['Finance assistant', 'Accounts trainee', 'Junior analyst'],
  },
  {
    id: 'engineering',
    name: 'Engineering',
    summary: 'Design, build and test real products and systems. More sub-pathways coming soon.',
    study: ['Design and development', 'Manufacturing basics', 'Testing and maintenance'],
    skills: ['Technical design', 'Hands-on building', 'Problem solving'],
    roles: ['Engineering technician', 'Design assistant', 'Maintenance trainee'],
    comingSoon: true,
  },
]

function Information() {
  const scrollToPathway = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <main>
        {/* Header band */}
        <section className="info-header" aria-labelledby="info-heading">
          <div className="info-header-content">
            <p className="eyebrow">Subjects offered</p>
            <h1 id="info-heading">Explore the <span>T Level</span> pathways</h1>
            <p className="info-tagline">
              Amazon Emerging Talent offers placements across five subject areas.
              Explore what you would study, the skills you would build, and the kinds
              of roles each pathway can lead to.
            </p>
          </div>
        </section>

        {/* Quick nav */}
        <section className="info-nav" aria-label="Jump to a pathway">
          <div className="info-nav-inner">
            {pathways.map((pathway) => (
              <button
                key={pathway.id}
                type="button"
                className="info-nav-pill"
                onClick={() => scrollToPathway(pathway.id)}
              >
                {pathway.name}
              </button>
            ))}
          </div>
        </section>

        {/* Pathway detail sections */}
        <section className="content-section">
          <div className="pathway-detail-list">
            {pathways.map((pathway) => (
              <article className="pathway-detail" id={pathway.id} key={pathway.id}>
                <div className="pathway-detail-head">
                  <h2>{pathway.name}</h2>
                  {pathway.comingSoon && (
                    <span className="coming-soon">More coming soon</span>
                  )}
                </div>
                <p className="pathway-summary">{pathway.summary}</p>

                <div className="pathway-columns">
                  <div className="pathway-col">
                    <h3>What you would study</h3>
                    <ul>
                      {pathway.study.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="pathway-col">
                    <h3>Skills you would build</h3>
                    <ul>
                      {pathway.skills.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="pathway-col">
                    <h3>Where it can lead</h3>
                    <ul>
                      {pathway.roles.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="pathway-detail-actions">
                  <a className="primary-button" href="/quiz">Is this pathway right for me?</a>
                  <a className="secondary-button" href="/profile">Save to my profile</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="info-cta">
          <div className="info-cta-inner">
            <h2>Ready to register your interest?</h2>
            <p>
              Let Amazon know which pathway interests you. It only takes a minute and
              helps the Emerging Talent team plan placements.
            </p>
            <a className="primary-button" href="/profile">Register your interest</a>
          </div>
        </section>
      </main>
    </>
  )
}

export default Information
