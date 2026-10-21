import './alummi.css'

const stories = [
  { name: 'Amara', pathway: 'Digital', quote: 'My placement showed me what software development is really like. I learned more in a month than I expected to all year.' },
  { name: 'Jay', pathway: 'Business', quote: 'I worked alongside a real team and left with the confidence to apply for an apprenticeship.' },
  { name: 'Priya', pathway: 'Finance', quote: 'Seeing how a big company handles its numbers made my classroom work finally click.' },
]

const steps = [
  { title: 'Explore', text: 'Discover the pathways and find where your interests fit.' },
  { title: 'Experience', text: 'Complete a placement and build real, practical skills.' },
  { title: 'Progress', text: 'Move on to skilled work, an apprenticeship, or further study.' },
]

function Alummi() {
  return (
    <>
      <main>
        <section className="alummi-header" aria-labelledby="alummi-heading">
          <div className="alummi-header-content">
            <p className="eyebrow">Career journey</p>
            <h1 id="alummi-heading">Where Launchpad can <span>take you</span></h1>
            <p className="alummi-tagline">
              Hear from students who have completed their placements, and see how your
              own journey could unfold.
            </p>
            <div className="alummi-actions">
              <a className="primary-button" href="/alummi/coffee-chats">Book a coffee chat</a>
            </div>
          </div>
        </section>

        <section className="content-section">
          <p className="eyebrow">Your journey</p>
          <h2>Three steps to launch</h2>
          <div className="journey-grid">
            {steps.map((item, index) => (
              <article className="journey-card" key={item.title}>
                <span className="journey-step">Step {index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="stories-band">
          <div className="content-section">
            <p className="eyebrow">Student stories</p>
            <h2>Hear from real students</h2>
            <div className="story-grid">
              {stories.map((story) => (
                <article className="story-card" key={story.name}>
                  <p className="story-quote">&ldquo;{story.quote}&rdquo;</p>
                  <p className="story-name">{story.name}</p>
                  <p className="story-pathway">{story.pathway} pathway</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default Alummi
