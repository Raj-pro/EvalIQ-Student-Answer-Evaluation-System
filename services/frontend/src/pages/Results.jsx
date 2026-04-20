import { useState } from 'react'
import { BarChart3, Search, Loader2, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import { mlAPI, questionAPI } from '../api/client.js'
import Badge from '../components/Badge.jsx'

function ScoreCircle({ score }) {
  const pct = (score / 10) * 100
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = score >= 9 ? '#10b981' : score >= 7 ? '#6366f1' : score >= 4 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="-rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#27272a" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[#fafafa]">{score.toFixed(1)}</span>
        <span className="text-xs text-[#71717a]">/ 10</span>
      </div>
    </div>
  )
}

function SimilarityBar({ value }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-[#71717a] w-9 text-right">{pct}%</span>
    </div>
  )
}

function Alert({ type, message }) {
  if (!message) return null
  const isError = type === 'error'
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-lg text-sm border ${
      isError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    }`}>
      {isError ? <AlertCircle size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
      {message}
    </div>
  )
}

export default function Results() {
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)
  const [testId, setTestId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [evalResult, setEvalResult] = useState(null)
  const [questions, setQuestions] = useState([])

  async function handleEvaluate(e) {
    e.preventDefault()
    if (!testId.trim() || !studentId.trim()) {
      setAlert({ type: 'error', message: 'Both Test ID and Student ID are required.' })
      return
    }
    setLoading(true)
    setAlert(null)
    setEvalResult(null)

    try {
      const [evalRes, qRes] = await Promise.all([
        mlAPI.post('/evaluate-submission', { test_id: testId.trim(), student_id: studentId.trim() }),
        questionAPI.get(`/tests/${testId.trim()}`),
      ])
      setEvalResult(evalRes.data)
      setQuestions(qRes.data.questions || [])
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      if (status === 404) setAlert({ type: 'error', message: 'Submission not found. Make sure the student has submitted answers.' })
      else setAlert({ type: 'error', message: detail || 'Evaluation failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  function getQuestion(qid) {
    return questions.find(q => q.question_id === qid)
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center">
          <BarChart3 size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#fafafa]">Evaluation Results</h1>
          <p className="text-sm text-[#71717a]">AI-powered scoring and grade breakdown</p>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6 space-y-4 animate-slide-up">
        <div>
          <div className="section-title">Evaluate Submission</div>
          <div className="section-sub">Enter the test and student identifiers</div>
        </div>
        <form onSubmit={handleEvaluate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Test ID</label>
              <input
                className="input-field"
                placeholder="e.g. math-101"
                value={testId}
                onChange={e => setTestId(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Student ID</label>
              <input
                className="input-field"
                placeholder="e.g. student-42"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <><Loader2 size={14} className="animate-spin" />Evaluating...</> : <><Search size={14} />Evaluate</>}
          </button>
        </form>
      </div>

      <Alert type={alert?.type} message={alert?.message} />

      {/* Results */}
      {evalResult && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary card */}
          <div className="card p-6">
            <div className="flex items-center gap-6">
              <ScoreCircle score={evalResult.total_score} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge rank={evalResult.rank} />
                </div>
                <div className="text-2xl font-bold text-[#fafafa]">
                  {evalResult.total_score.toFixed(2)}<span className="text-sm font-normal text-[#71717a]"> / 10</span>
                </div>
                <div className="text-sm text-[#71717a]">
                  {evalResult.results.length} question{evalResult.results.length !== 1 ? 's' : ''} evaluated
                </div>
                <div className="text-xs text-[#52525b] space-y-0.5">
                  <div>Test: <code className="font-mono text-indigo-400">{evalResult.test_id}</code></div>
                  <div>Student: <code className="font-mono text-emerald-400">{evalResult.student_id}</code></div>
                </div>
              </div>
            </div>
          </div>

          {/* Per-question breakdown */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-purple-400" />
              <span className="text-sm font-medium text-[#fafafa]">Question Breakdown</span>
            </div>
            <div className="space-y-3">
              {evalResult.results.map((r, i) => {
                const q = getQuestion(r.question_id)
                return (
                  <div key={r.question_id} className="bg-[#18181b] rounded-lg p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="w-5 h-5 shrink-0 rounded bg-[#27272a] flex items-center justify-center text-xs font-mono text-[#a1a1aa]">
                          {i + 1}
                        </div>
                        <div className="text-sm text-[#a1a1aa] leading-relaxed truncate">
                          {q?.question_text || `Question ${r.question_id}`}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-[#fafafa]">{r.score.toFixed(1)}<span className="text-xs text-[#52525b]">/10</span></div>
                      </div>
                    </div>
                    <div className="pl-7 space-y-1">
                      <div className="text-xs text-[#52525b]">Similarity score</div>
                      <SimilarityBar value={r.similarity} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
