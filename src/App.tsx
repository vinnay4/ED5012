import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Activity } from 'lucide-react'
import Landing from './pages/Landing'
import Analyze from './pages/Analyze'
import Session from './pages/Session'
import { ErrorBoundary } from './components/ErrorBoundary'

const Method = lazy(() => import('./pages/Method'))
const Validation = lazy(() => import('./pages/Validation'))
const Study = lazy(() => import('./pages/Study'))
const Present = lazy(() => import('./pages/Present'))

const NAV = [
  { to: '/analyze', label: 'Analyse' },
  { to: '/method', label: 'Human factors' },
  { to: '/validation', label: 'Validation' },
  { to: '/study', label: 'Study' },
  { to: '/present', label: 'Present' },
]

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight text-white ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-300 to-brand-600 shadow-[0_0_20px_-4px_rgba(61,214,239,0.7)]">
        <Activity className="h-4.5 w-4.5 text-ink-950" strokeWidth={2.6} />
      </span>
      FormDrift
    </span>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const bare = pathname.startsWith('/present')
  return (
    <div className="flex min-h-screen flex-col">
      {!bare && (
        <header className="no-print sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
            <NavLink to="/" aria-label="FormDrift home">
              <Logo />
            </NavLink>
            <nav className="ml-auto flex items-center gap-1 overflow-x-auto text-sm">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition ${isActive ? 'bg-white/[0.08] text-white' : 'text-ink-300 hover:text-white'}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
      )}
      <main className="flex-1">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<div className="p-10 text-center text-ink-400">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/session/:id" element={<Session />} />
              <Route path="/method" element={<Method />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/study" element={<Study />} />
              <Route path="/present" element={<Present />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!bare && (
        <footer className="no-print border-t border-white/[0.06] py-8 text-sm text-ink-400">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>FormDrift · ED5012 Advanced Applications of Human Factors in Design · IIT Madras · Intelligent Sports</span>
            <span>Runs entirely on your device. No video leaves the browser.</span>
          </div>
        </footer>
      )}
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ScrollTop />
      <Shell />
    </HashRouter>
  )
}
