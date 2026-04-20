import { useState } from 'react'
import { BookOpen, Search, Send, CheckCircle2, Loader2, AlertCircle, ChevronRight } from 'lucide-react'
import { studentAPI } from '../api/client.js'

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

export default function Student() {
  const [step, setStep] = useState('load') // 'load' | 'answer' | 'submitted'
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)

  const [testId, setTestId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [testData, setTestData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submissionId, setSubmissionId] = useState(null)

  const setError = (msg) => setAlert({ type: 'error', message: msg })
  const setSuccess = (msg) => setAlert({ type: 'success', message: msg })
  const clearAlert = () => setAlert(null)

  async function handleLoadTest(e) {
    e.preventDefault()
    if (!testId.trim() || !studentId.trim()) {
      setError('Both Test ID and Student ID are required.')
      return
    }
    setLoading(true)
    clearAlert()
    try {
      const res = await studentAPI.get(`/tests/${testId.trim()}`)
      setTestData(res.data)
      const initAnswers = {}
      res.data.questions.forEach(q => { initAnswers[q.question_id] = '' })
      setAnswers(initAnswers)
      setStep('answer')
    } catch (err) {
      if (err.response?.status === 404) setError('Test not found. Check the Test ID.')
      else setError('Failed to load test. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const unanswered = testData.questions.filter(q => !answers[q.question_id]?.trim())
    if (unanswered.length) {
      setError(`Please answer all questions. ${unanswered.length} unanswered.`)
      return
    }
    setLoading(true)
    clearAlert()
    try {
      const payload = {
        test_id: testData.test.test_id,
        student_id: studentId.trim(),
        answers: testData.questions.map(q => ({
          question_id: q.question_id,
          student_answer: answers[q.question_id],
        })),
      }
      const res = await studentAPI.post('/submissions', payload)
      setSubmissionId(res.data.submission_id)
      setSuccess('Answers submitted successfully!')
      setStep('submitted')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit answers.')
    } finally {
      setLoading(false)
    }
  }

  const answeredCount = Object.values(answers).filter(a => a.trim()).length
  const totalCount = testData?.questions?.length || 0
  const progress = totalCount ? Math.round((answeredCount / totalCount) * 100) : 0

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
          <BookOpen size={18} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#fafafa]">Student Portal</h1>
          <p className="text-sm text-[#71717a]">Load a test and submit your answers</p>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} />

      {/* Step 1: Load test */}
      {step === 'load' && (
        <div className="card p-6 space-y-5 animate-slide-up">
          <div>
            <div className="section-title">Load Test</div>
            <div className="section-sub">Enter your Test ID and Student ID to begin</div>
          </div>
          <form onSubmit={handleLoadTest} className="space-y-4">
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
              {loading ? <><Loader2 size={14} className="animate-spin" />Loading...</> : <><Search size={14} />Load Test</>}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Answer questions */}
      {step === 'answer' && testData && (
        <div className="space-y-4 animate-slide-up">
          {/* Test header */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[#fafafa]">{testData.test.title}</div>
                <div className="text-xs text-[#71717a] mt-0.5">
                  Test ID: <code className="font-mono text-indigo-400">{testData.test.test_id}</code>
                  {' '}· Student: <code className="font-mono text-emerald-400">{studentId}</code>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#52525b]">{answeredCount}/{totalCount} answered</div>
                <div className="mt-1 h-1.5 w-24 bg-[#27272a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {testData.questions.map((q, i) => (
              <div key={q.question_id} className="card p-5 space-y-3 animate-slide-up">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 shrink-0 rounded-md bg-[#27272a] flex items-center justify-center text-xs font-mono font-medium text-[#a1a1aa]">
                    {i + 1}
                  </div>
                  <div className="text-sm text-[#fafafa] leading-relaxed">{q.question_text}</div>
                </div>
                <div className="pl-9">
                  <label className="label">Your Answer</label>
                  <textarea
                    className="textarea-field"
                    rows={3}
                    placeholder="Type your answer here..."
                    value={answers[q.question_id] || ''}
                    onChange={e => setAnswers({ ...answers, [q.question_id]: e.target.value })}
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={loading || answeredCount < totalCount}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" />Submitting...</>
                : <><Send size={14} />Submit All Answers</>
              }
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Submitted */}
      {step === 'submitted' && (
        <div className="card p-8 text-center space-y-4 animate-slide-up">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-lg font-semibold text-[#fafafa]">Answers Submitted!</div>
            <div className="text-sm text-[#71717a] mt-1">Your submission has been recorded successfully.</div>
          </div>
          <div className="bg-[#18181b] rounded-lg p-3 inline-flex flex-col items-center gap-1">
            <div className="text-xs text-[#52525b]">Submission ID</div>
            <div className="font-mono text-sm text-indigo-400">#{submissionId}</div>
          </div>
          <div className="text-sm text-[#71717a]">
            Share your Test ID <code className="font-mono text-indigo-400">{testId}</code> and Student ID{' '}
            <code className="font-mono text-emerald-400">{studentId}</code> to view your results.
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <a href="/results" className="btn-primary text-sm">
              <ChevronRight size={14} /> View Results
            </a>
            <button
              onClick={() => { setStep('load'); setAlert(null); setTestData(null) }}
              className="btn-secondary text-sm"
            >
              Take Another Test
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
