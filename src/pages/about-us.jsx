import './about-us.css'

const values = [
  {
    title: 'Customer obsession',
    text: 'We start with students and work backwards, building everything around what they need to take their next step.',
  },
  {
    title: 'Open to everyone',
    text: 'Launchpad is for any student, whatever stage they are at, with accessibility built in from the start.',
  },
  {
    title: 'Learn and be curious',
    text: 'We help students explore pathways, try new things, and discover where their interests could take them.',
  },
]

const stats = [
  { number: '27,446', label: 'T Level learners in England in 2025-26' },
  { number: '21', label: 'T Level pathways available nationally' },
  { number: '5', label: 'subject areas offered through Amazon' },
]

function AboutUs() {
  return (
    <>
      <main>
        <section className="about-header" aria-labelledby="about-heading">
          <div className="about-header-content">
            <p className="eyebrow">About us</p>
            <h1 id="about-heading">Helping students <span>launch</span> their careers</h1>
            <p className="about-tagline">
              Launchpad is built with the Amazon Emerging Talent Programs team to help
              students discover T Levels, find placements, and connect with the people
              who can help them get started.
            </p>
          </div>
        </section>

        <section className="content-section">
          <p className="eyebrow">Our mission</p>
          <h2>Making the path into tech and business simpler</h2>
          <p className="section-intro">
            Choosing what to do after GCSEs is a big decision. We bring clear
            information, honest advice and real connections together in one place, so
            every student can make a confident choice about their future.
          </p>
          <div className="value-grid">
            {values.map((value) => (
              <article className="value-card" key={value.title}>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-stats">
          <div className="about-stats-inner">
            {stats.map((stat) => (
              <div className="about-stat" key={stat.label}>
                <span className="about-stat-number">{stat.number}</span>
                <p>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

export default AboutUs
