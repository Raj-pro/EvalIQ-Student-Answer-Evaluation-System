import { Link } from 'react-router-dom'
import { GraduationCap, BookOpen, BarChart3, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react'

const features = [
  { icon: Zap, title: 'AI-Powered Scoring', desc: 'TF-IDF and cosine similarity evaluate answers with ML precision.' },
  { icon: Shield, title: 'Secure & Isolated', desc: 'Microservices architecture ensures each component is independently scalable.' },
  { icon: TrendingUp, title: 'Instant Feedback', desc: 'Students get graded results with detailed breakdowns in seconds.' },
]

export default function Home() {
  return (
    <div className="animate-fade-in space-y-16">
      {/* Hero */}
      <div className="text-center space-y-6 pt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium">
          <Zap size={12} />
          ML-Powered Evaluation System
        </div>
        <h1 className="text-5xl font-bold text-[#fafafa] tracking-tight leading-tight">
          Evaluate answers with
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400"> intelligence</span>
        </h1>
        <p className="text-lg text-[#71717a] max-w-xl mx-auto leading-relaxed">
          Create tests, collect student responses, and get instant AI-powered evaluation with detailed scoring and grade breakdowns.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/teacher" className="btn-primary text-sm px-6 py-3">
            Get started as Teacher
            <ArrowRight size={14} />
          </Link>
          <Link to="/student" className="btn-secondary text-sm px-6 py-3">
            Take a test
          </Link>
        </div>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            to: '/teacher',
            icon: GraduationCap,
            title: 'Teacher',
            desc: 'Create tests and questions. Define expected answers for automated scoring.',
            color: 'indigo',
            action: 'Create test →',
          },
          {
            to: '/student',
            icon: BookOpen,
            title: 'Student',
            desc: 'Load your test by ID and submit answers. Instant confirmation when done.',
            color: 'emerald',
            action: 'Take test →',
          },
          {
            to: '/results',
            icon: BarChart3,
            title: 'Results',
            desc: 'View detailed AI evaluation results with per-question scores and grades.',
            color: 'purple',
            action: 'View results →',
          },
        ].map(({ to, icon: Icon, title, desc, color, action }) => (
          <Link key={to} to={to} className="card-hover p-6 group block animate-slide-up">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
              color === 'indigo' ? 'bg-indigo-500/15' :
              color === 'emerald' ? 'bg-emerald-500/15' : 'bg-purple-500/15'
            }`}>
              <Icon size={18} className={
                color === 'indigo' ? 'text-indigo-400' :
                color === 'emerald' ? 'text-emerald-400' : 'text-purple-400'
              } />
            </div>
            <h3 className="font-semibold text-[#fafafa] mb-2">{title}</h3>
            <p className="text-sm text-[#71717a] leading-relaxed mb-4">{desc}</p>
            <span className={`text-xs font-medium ${
              color === 'indigo' ? 'text-indigo-400' :
              color === 'emerald' ? 'text-emerald-400' : 'text-purple-400'
            }`}>{action}</span>
          </Link>
        ))}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3 p-4 rounded-xl">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-[#27272a] flex items-center justify-center">
              <Icon size={14} className="text-[#a1a1aa]" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#fafafa] mb-1">{title}</div>
              <div className="text-xs text-[#71717a] leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
