// On-site prep guides. Each guide has a slug (used in the URL /guides/:slug),
// a title, a short intro, and a list of sections. Kept as plain data so the
// Guide page can render any of them, and resources can link to them by slug.

export const GUIDES = {
  'assessment-centre': {
    title: 'How to pass an assessment centre',
    intro:
      'Assessment centres bring together a few different tasks on one day so employers can see how you think and work with others. Here is what to expect and how to prepare.',
    sections: [
      {
        heading: 'What to expect',
        body: [
          'A mix of activities: a group exercise, a short task or presentation, and usually a one-to-one interview.',
          'Assessors watching how you approach problems and work with other people, not just the final answer.',
          'A relaxed but structured day, often with other candidates there too.',
        ],
      },
      {
        heading: 'Before the day',
        body: [
          'Re-read the role and note the skills they are looking for, so you can show them.',
          'Practise talking through how you solve a problem out loud.',
          'Prepare two or three examples of times you worked in a team or handled a challenge.',
        ],
      },
      {
        heading: 'On the day',
        body: [
          'In group tasks, involve others and share the airtime - assessors look for teamwork, not domination.',
          'Think out loud so they can follow your reasoning.',
          'Stay calm if something goes wrong; how you recover matters more than being perfect.',
        ],
      },
    ],
  },
  'interview-prep': {
    title: 'Interview preparation tips',
    intro:
      'A good interview is mostly preparation. Here is a simple way to get ready and answer common questions well.',
    sections: [
      {
        heading: 'Research first',
        body: [
          'Learn what the employer does and why the role exists.',
          'Match your own skills and interests to what the role needs.',
        ],
      },
      {
        heading: 'Structure your answers',
        body: [
          'Use a simple structure: the situation, what you did, and the result.',
          'Keep answers specific and short - one clear example beats three vague ones.',
        ],
      },
      {
        heading: 'Questions to prepare for',
        body: [
          'Why do you want this pathway or role?',
          'Tell us about a time you worked in a team.',
          'What would you do if you were struggling with a task?',
        ],
      },
    ],
  },
  'great-application': {
    title: 'Writing a great application',
    intro:
      'Your application is your first impression. Here is how to present your skills and experience clearly.',
    sections: [
      {
        heading: 'Keep it clear',
        body: [
          'Write in plain, direct language - no jargon needed.',
          'Answer the question that was actually asked.',
        ],
      },
      {
        heading: 'Show, do not just tell',
        body: [
          'Back up claims with a short example rather than just listing qualities.',
          'Link what you have done to what the role needs.',
        ],
      },
      {
        heading: 'Before you submit',
        body: [
          'Check spelling and grammar - read it out loud to catch mistakes.',
          'Ask someone else to read it through if you can.',
        ],
      },
    ],
  },
}

export function getGuide(slug) {
  return GUIDES[slug] || null
}
