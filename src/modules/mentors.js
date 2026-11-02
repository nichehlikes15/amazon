// People students can request a coffee chat with.
// Keep names and `times` in sync with MENTORS in backend/app.py
// (the backend checks the request against that list).
// Photos live in public/assets/images, named "<Full name>.png".
// PLACEHOLDERS: `role`, `about`, `topics` and `times` still need checking
// with each person before launch.

const photo = (name) => encodeURI(`/assets/images/${name}.png`)

export const MENTORS = [
  {
    name: 'Bea Galang',
    role: 'Digital T Level student',
    pathway: 'Digital',
    times: ['Monday', 'Wednesday'],
    about: 'Happy to talk about choosing a pathway and what the course is like day to day.',
    topics: ['Choosing a pathway', 'What a placement is like'],
  },
  {
    name: 'Michael Lawrence',
    role: 'Digital T Level student',
    pathway: 'Digital',
    times: ['Monday to Friday'],
    about: 'Feel free to converse with me regarding balancing academics alongside placement hours.',
    topics: ['Time management', 'Organisation', 'Structure'],
  },
  {
    name: 'Nahla Mitchell',
    role: 'Digital T Level student',
    pathway: 'Digital',
    times: ['Wednesday afternoon'],
    about: 'Open to talk about exams and how to use the skills gained in lesson in placement.',
    topics: ['Exam prep', 'Transferring skills'],
  },
  {
    name: 'Oliver Tappin',
    role: 'Digital T Level student at Ada College',
    pathway: 'Digital',
    times: ['Thursday'],
    about: "I can help you get started with coding, plan your first project and share your work on GitHub.",
    topics: ['Starting to code', 'Projects and GitHub', 'The Digital T Level'],
  },
  {
    name: 'Sarah Abwnawar',
    role: 'Digital T Level student',
    pathway: 'Digital',
    times: ['Friday morning'],
    about: 'Happy to talk about applications and what you can do after your T Level.',
    topics: ['Applying and interviews', 'Apprenticeships after T Levels'],
  },
  {
    name: 'Tasniim Dirie',
    role: 'Digital T Level student',
    pathway: 'Digital',
    times: ['Monday afternoon', 'Thursday afternoon'],
    about: 'Open to talk about apprenticeship opportunities.',
    topics: ['Apprenticeship opportunities'],
  },
].map((p) => ({ ...p, firstName: p.name.split(' ')[0], photo: photo(p.name) }))

// Look someone up by the name saved on a chat request.
export function findMentor(name) {
  return MENTORS.find((p) => p.name === name) || null
}

export const CHAT_TOPICS = [
  'Choosing a pathway',
  'What a placement is like',
  'Applying and interviews',
  'Apprenticeships after T Levels',
  'Something else',
]

// Keep in sync with CHAT_STATUSES in backend/app.py.
export const CHAT_STATUSES = ['Requested', 'Confirmed', 'Completed', 'Cancelled']

// Short explanation shown to the student under each status.
export const STATUS_HELP = {
  Requested: 'Waiting for the team to confirm',
  Confirmed: 'Confirmed - the team will add the time and link soon',
  Completed: 'Chat done',
  Cancelled: 'This chat will not go ahead',
}

// "2026-11-03T15:30" -> "Tue 3 Nov 2026, 15:30"
export function formatChatTime(value) {
  if (!value) return null
  const d = new Date(value)
  if (isNaN(d)) return value
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Download a calendar file (.ics) for a confirmed chat. Works with Apple
// Calendar, Google Calendar and Outlook. The time is "floating" (no time
// zone), so it lands at the same clock time it was booked for.
export function downloadChatIcs(chat, minutes = 15) {
  if (!chat.confirmedTime) return
  const start = new Date(chat.confirmedTime)
  if (isNaN(start)) return
  const end = new Date(start.getTime() + minutes * 60000)
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const esc = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const now = new Date()
  const utc = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`
  const details = [
    chat.topic ? `Topic: ${chat.topic}` : '',
    chat.meetingLink ? `Join: ${chat.meetingLink}` : '',
  ].filter(Boolean).join('\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Launchpad//Coffee chats//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:coffee-chat-${chat.id}@launchpad`,
    `DTSTAMP:${utc}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`Coffee chat with ${chat.mentor}`)}`,
    details ? `DESCRIPTION:${esc(details)}` : null,
    chat.meetingLink ? `LOCATION:${esc(chat.meetingLink)}` : null,
    chat.meetingLink ? `URL:${chat.meetingLink}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(`Coffee chat with ${chat.mentor} in 15 minutes`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coffee-chat-${chat.mentor.toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
