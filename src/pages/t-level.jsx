import './t-level.css'

const facts = [
  { title: 'Equal to 3 A Levels', text: 'A T Level is a two-year qualification taken after GCSEs, worth the same as three A Levels.' },
  { title: '80% classroom, 20% placement', text: 'Most of your time is spent learning, with a substantial industry placement built in.' },
  { title: 'Industry placement', text: 'You complete at least 45 days on a real placement with an employer like Amazon.' },
  { title: 'A route to many options', text: 'T Levels can lead to skilled work, a higher apprenticeship, or university.' },
]

const steps = [
  { step: '1', title: 'Explore pathways', text: 'Look at the five subject areas and see what each one involves.' },
  { step: '2', title: 'Take the quiz', text: 'Answer a few questions to find the pathway that fits your interests.' },
  { step: '3', title: 'Register interest', text: 'Let Amazon know you are interested in a placement on your chosen pathway.' },
  { step: '4', title: 'Start your placement', text: 'Join an Amazon team, build real skills, and launch your career.' },
]

function TLevel() {
  return (
    <>
      <main>
        <section className="tl-header" aria-labelledby="tl-heading">
          <div className="tl-header-content">
            <p className="eyebrow">What is a T Level?</p>
            <h1 id="tl-heading">A new way to <span>start your career</span></h1>
            <p className="tl-tagline">
              T Levels combine classroom study with a real industry placement, giving
              you the skills and experience employers are looking for.
            </p>
            <div className="tl-actions">
              <a className="primary-button" href="/information">Explore pathways</a>
              <a className="secondary-button" href="/quiz">Take the career quiz</a>
            </div>
          </div>
        </section>

        <section className="content-section">
          <p className="eyebrow">The basics</p>
          <h2>How T Levels work</h2>
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
        </section>

        <section className="tl-steps">
          <div className="tl-steps-inner">
            <p className="eyebrow">Your journey</p>
            <h2>From curious to placement in four steps</h2>
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
      </main>
    </>
  )
}

export default TLevel
