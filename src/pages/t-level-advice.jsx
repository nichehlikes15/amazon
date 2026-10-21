import './t-level-advice.css'

const studentAdvice = [
  { title: 'Get the most out of your placement', text: 'Ask questions, take notes, and treat every task as a chance to learn something new.' },
  { title: 'Connect with people at work', text: 'Introduce yourself to your team, find a buddy or mentor, and stay curious about what everyone does.' },
  { title: 'Build good habits early', text: 'Be on time, communicate clearly, and ask for feedback so you keep improving.' },
]

const schoolAdvice = [
  { title: 'Setting up placements', text: 'Learn how to plan and arrange T Level placements with employers like Amazon.' },
  { title: 'Managing placements', text: 'Keep track of student progress, employer contacts and paperwork in one place.' },
  { title: 'Collaborating with Amazon', text: 'Find out how your school or college can work with Amazon on T Level opportunities.' },
]

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
          <div className="advice-grid">
            {studentAdvice.map((item) => (
              <article className="advice-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="advice-band">
          <div className="content-section" id="schools" aria-labelledby="schools-heading">
            <p className="eyebrow">For schools</p>
            <h2 id="schools-heading">School advice</h2>
            <p className="section-intro">
              How to set up and manage T Level placements, and how to collaborate with Amazon.
            </p>
            <div className="advice-grid">
              {schoolAdvice.map((item) => (
                <article className="advice-card" key={item.title}>
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

export default TLevelAdvice
