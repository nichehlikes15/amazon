import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Routes, useLocation } from 'react-router-dom'
import { titleFor } from './page-title'

/*
  Site-wide motion
  ----------------
  - Fades each page in when the route changes.
  - Scrolls to the top on a new page (unless the URL has a #hash).
  - Hero content (first header/section of the page) rises in, staggered.
  - Sections, cards and list items fade up as they scroll into view,
    with a small stagger between siblings.

  Pages that already run their own animations (the homepage and the
  pathway rows on Information) are skipped. Add data-no-reveal to any
  element to opt it and its children out.
  Respects the OS "reduce motion" setting and the in-app setting.
*/

const SKIP = '[data-no-reveal], .home, .pw-row, nav, form, .nav-menu, .profile-dropdown, .iv, .pf-saved-grid, .ccl, .advice-carousel-track'
const TARGETS = 'section, article, aside, li, [data-reveal]'
const MAX_STAGGER = 6

function motionAllowed() {
  if (typeof window === 'undefined') return false
  if (document.documentElement.getAttribute('data-reduced-motion') === 'on') return false
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return 'IntersectionObserver' in window
}

// true while animations are allowed. Updates straight away when Reduce motion
// is switched in the accessibility menu or Settings, or on the device.
function useMotionAllowed() {
  const [on, setOn] = useState(motionAllowed)
  useEffect(() => {
    // Wait a frame so the new setting is on <html> before checking it.
    const check = () => requestAnimationFrame(() => setOn(motionAllowed()))
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    window.addEventListener('launchpad-a11y', check)
    mq?.addEventListener?.('change', check)
    return () => {
      window.removeEventListener('launchpad-a11y', check)
      mq?.removeEventListener?.('change', check)
    }
  }, [])
  return on
}

// How long the old page takes to fade out before the new one comes in.
const LEAVE_MS = 240

// Wraps the <Route>s. On a new page the old one fades out, then the new one
// fades in. Hash-only changes (tabs, #digital links) don't trigger a fade.
export function PageTransition({ children }) {
  const location = useLocation()
  const [shown, setShown] = useState(location)
  const [leaving, setLeaving] = useState(false)
  const { pathname, hash } = shown
  const ref = useRef(null)
  const motionOn = useMotionAllowed()
  const lastPath = useRef(null)
  const lastMotion = useRef(motionOn)

  useEffect(() => {
    if (location.pathname === shown.pathname) {
      if (location !== shown) setShown(location)
      return undefined
    }
    if (!motionAllowed()) {
      setShown(location)
      return undefined
    }
    setLeaving(true)
    const t = setTimeout(() => {
      setShown(location)
      setLeaving(false)
    }, LEAVE_MS)
    return () => clearTimeout(t)
  }, [location]) // eslint-disable-line react-hooks/exhaustive-deps

  // New page: back to the top while it's still invisible (keeps #anchor links working).
  useLayoutEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.title = titleFor(pathname)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Same page, and motion was off a moment ago = Reduce motion was just
    // switched back off. Then only content still below the screen animates,
    // and the hero doesn't play again.
    const rearm = lastPath.current === pathname && lastMotion.current === false
    lastPath.current = pathname
    lastMotion.current = motionOn
    const root = ref.current
    if (!root || !motionOn) return undefined

    const seen = new WeakSet()
    const belowScreen = (el) => el.getBoundingClientRect().top > window.innerHeight
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target
            el.classList.add('is-visible')
            io.unobserve(e.target)
            // Hand control back to the element's own styles once it's in.
            const delay = parseFloat(el.style.getPropertyValue('--reveal-delay')) || 0
            setTimeout(() => {
              el.classList.remove('reveal', 'is-visible')
              el.style.removeProperty('--reveal-delay')
            }, (delay + 0.9) * 1000)
          }
        })
      },
      // threshold 0 so very tall sections still trigger; the bottom margin
      // waits until the top edge is a little way into the screen.
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    )

    const hero = () => root.querySelector('main > header, main > section')

    const animateHero = () => {
      const h = hero()
      if (!h || seen.has(h) || h.closest(SKIP)) return
      seen.add(h)
      const inner = h.firstElementChild && h.children.length === 1 ? h.firstElementChild : h
      Array.from(inner.children).forEach((child, i) => {
        seen.add(child)
        child.classList.add('hero-rise')
        child.style.animationDelay = `${0.08 + i * 0.1}s`
        const done = (e) => {
          if (e.target !== child) return
          child.classList.remove('hero-rise')
          child.style.animationDelay = ''
          child.removeEventListener('animationend', done)
        }
        child.addEventListener('animationend', done)
      })
    }

    const tag = (scope) => {
      const h = hero()
      const nodes = scope.querySelectorAll ? scope.querySelectorAll(TARGETS) : []
      const list = scope.matches && scope.matches(TARGETS) ? [scope, ...nodes] : Array.from(nodes)
      list.forEach((el) => {
        if (seen.has(el)) return
        seen.add(el)
        if (h && (el === h || h.contains(el))) return
        if (el.closest(SKIP)) return
        if (rearm && !belowScreen(el)) return
        // Only one level of nesting (section -> card), so content
        // doesn't fade in three times over.
        const parentTarget = el.parentElement && el.parentElement.closest('.reveal')
        if (parentTarget && parentTarget.parentElement && parentTarget.parentElement.closest('.reveal')) return

        const siblings = el.parentElement
          ? Array.from(el.parentElement.children).filter((s) => s.matches(TARGETS))
          : []
        const i = Math.min(Math.max(siblings.indexOf(el), 0), MAX_STAGGER)
        el.style.setProperty('--reveal-delay', `${i * 0.07}s`)
        el.classList.add('reveal')
        io.observe(el)
      })
    }

    if (!rearm) animateHero()
    tag(root)

    // Content that loads later (fetched lists, filters, tabs).
    const mo = new MutationObserver((muts) => {
      if (!rearm) animateHero()
      muts.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && tag(n)))
    })
    mo.observe(root, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      io.disconnect()
      // Reduce motion switched on (or a new page): show anything still waiting
      // to fade in, so nothing is left hidden.
      root.querySelectorAll('.reveal').forEach((el) => {
        el.classList.remove('reveal', 'is-visible')
        el.style.removeProperty('--reveal-delay')
      })
    }
  }, [pathname, motionOn])

  return (
    <div
      className={leaving ? 'page-transition is-leaving' : 'page-transition'}
      key={pathname}
      ref={ref}
      id="main-content"
      tabIndex={-1}
    >
      <Routes location={shown}>{children}</Routes>
    </div>
  )
}
