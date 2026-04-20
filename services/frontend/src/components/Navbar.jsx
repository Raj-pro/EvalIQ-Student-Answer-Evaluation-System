import { Link, useLocation } from 'react-router-dom'
import { Brain, GraduationCap, BookOpen, BarChart3 } from 'lucide-react'

const teacherLinks = [
  { to: '/teacher', label: 'Teacher', icon: GraduationCap },
  { to: '/results', label: 'Results', icon: BarChart3 },
]

const studentLinks = [
  { to: '/student', label: 'Student', icon: BookOpen },
  { to: '/results', label: 'Results', icon: BarChart3 },
]

const allLinks = [
  { to: '/teacher', label: 'Teacher', icon: GraduationCap },
  { to: '/student', label: 'Student', icon: BookOpen },
  { to: '/results', label: 'Results', icon: BarChart3 },
]

export default function Navbar() {
  const location = useLocation()

  const links = location.pathname.startsWith('/teacher')
    ? teacherLinks
    : location.pathname.startsWith('/student')
    ? studentLinks
    : location.pathname.startsWith('/results')
    ? [{ to: '/results', label: 'Results', icon: BarChart3 }]
    : allLinks

  return (
    <header className="border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-semibold text-[#fafafa] text-sm">EvalIQ</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#27272a] text-[#fafafa]'
                    : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
