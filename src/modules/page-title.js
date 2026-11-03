// Browser tab titles for each page. Pages with their own data (an
// opportunity, a guide) set a more specific title themselves.

const SITE = 'Launchpad'

const TITLES = [
  ['/', 'Launch your future'],
  ['/opportunities', 'Opportunities'],
  ['/tlevel', 'T Levels'],
  ['/t-level/advice', 'T Level advice'],
  ['/information', 'Pathways'],
  ['/quiz', 'Career quiz'],
  ['/about-us', 'About us'],
  ['/alumni/coffee-chats', 'Coffee chats'],
  ['/alumni', 'Alumni'],
  ['/profile', 'My profile'],
  ['/settings', 'Settings'],
  ['/login', 'Sign in'],
  ['/signup', 'Create account'],
  ['/forgot-password', 'Reset your password'],
  ['/reset-password', 'Choose a new password'],
  ['/register-interest', 'Register interest'],
  ['/admin', 'Admin'],
  ['/interview', 'Interview practice'],
  ['/parents', 'Parents and carers'],
  ['/safeguarding', 'Staying safe'],
  ['/terms', 'Terms of use'],
  ['/logbook', 'My logbook'],
  ['/community', 'Question board'],
  ['/help', 'Help'],
  ['/accessibility', 'Accessibility'],
  ['/privacy', 'Privacy'],
]

export function titleFor(pathname) {
  const exact = TITLES.find(([path]) => path === pathname)
  if (exact) return `${exact[1]} | ${SITE}`
  if (pathname.startsWith('/opportunities/')) return `Opportunity | ${SITE}`
  if (pathname.startsWith('/guides/')) return `Guide | ${SITE}`
  return `Page not found | ${SITE}`
}

// Plain page name for a path, e.g. '/tlevel' -> 'T Levels' ('/' is 'Home').
export function pageName(pathname) {
  if (pathname === '/') return 'Home'
  const exact = TITLES.find(([path]) => path === pathname)
  if (exact) return exact[1]
  if (pathname.startsWith('/opportunities/')) return 'An opportunity'
  if (pathname.startsWith('/guides/')) return 'A guide'
  return pathname
}

export function setPageTitle(text) {
  document.title = text ? `${text} | ${SITE}` : SITE
}
