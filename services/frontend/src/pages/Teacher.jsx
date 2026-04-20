import { useState } from 'react'
import { GraduationCap, Plus, Trash2, CheckCircle2, ChevronRight, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { questionAPI } from '../api/client.js'

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

export default function Teacher() {
  const [step, setStep] = useState('create') // 'create' | 'questions'
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)

  // Test creation
  const [testId, setTestId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [title, setTitle] = useState('')
  const [createdTest, setCreatedTest] = useState(null)

  // Questions
  const [questions, setQuestions] = useState([{ question_text: '', expected_answer: '' }])
  const [savedQuestions, setSavedQuestions] = useState([])

  const setError = (msg) => setAlert({ type: 'error', message: msg })
  const setSuccess = (msg) => setAlert({ type: 'success', message: msg })
  const clearAlert = () => setAlert(null)

  async function handleCreateTest(e) {
    e.preventDefault()
    if (!testId.trim() || !teacherId.trim() || !title.trim()) {
      setError('All fields are required.')
      return
    }
    setLoading(true)
    clearAlert()
    try {
      const res = await questionAPI.post('/tests', {
        test_id: testId.trim(),
        teacher_id: teacherId.trim(),
        title: title.trim(),
      })
      setCreatedTest(res.data)
      setSuccess(`Test "${title}" created successfully! Now add questions below.`)
      setStep('questions')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Failed to create test. Check that the Test ID is unique.')
    } finally {
      setLoading(false)
    }
  }

  function addQuestionRow() {
    setQuestions([...questions, { question_text: '', expected_answer: '' }])
  }

  function removeQuestionRow(i) {
    setQuestions(questions.filter((_, idx) => idx !== i))
  }

  function updateQuestion(i, field, value) {
    const next = [...questions]
    next[i][field] = value
    setQuestions(next)
  }

  async function handleSaveQuestions(e) {
    e.preventDefault()
    const valid = questions.filter(q => q.question_text.trim() && q.expected_answer.trim())
    if (!valid.length) {
      setError('Add at least one question with both fields filled.')
      return
    }
    setLoading(true)
    clearAlert()
    try {
      await questionAPI.post(`/tests/${createdTest.test_id}/questions`, { questions: valid })
      setSavedQuestions([...savedQuestions, ...valid])
      setQuestions([{ question_text: '', expected_answer: '' }])
      setSuccess(`${valid.length} question(s) saved!`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save questions.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center">
          <GraduationCap size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#fafafa]">Teacher Dashboard</h1>
          <p className="text-sm text-[#71717a]">Create a test and add questions</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex items-center gap-1.5 ${step === 'create' ? 'text-indigo-400' : 'text-emerald-400'}`}>
          {step === 'questions' ? <CheckCircle2 size={13} /> : <div className="w-3.5 h-3.5 rounded-full bg-indigo-500" />}
          Create Test
        </div>
        <ChevronRight size={12} className="text-[#52525b]" />
        <div className={`flex items-center gap-1.5 ${step === 'questions' ? 'text-indigo-400' : 'text-[#52525b]'}`}>
          <div className={`w-3.5 h-3.5 rounded-full ${step === 'questions' ? 'bg-indigo-500' : 'bg-[#27272a]'}`} />
          Add Questions
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} />

      {/* Step 1: Create Test */}
      {step === 'create' && (
        <div className="card p-6 space-y-5 animate-slide-up">
          <div>
            <div className="section-title">Create New Test</div>
            <div className="section-sub">Set up a test for your students</div>
          </div>
          <form onSubmit={handleCreateTest} className="space-y-4">
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
                <label className="label">Teacher ID</label>
                <input
                  className="input-field"
                  placeholder="e.g. teacher-1"
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Test Title</label>
              <input
                className="input-field"
                placeholder="e.g. Introduction to Mathematics"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin" />Creating...</> : <>Create Test <ChevronRight size={14} /></>}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Add Questions */}
      {step === 'questions' && createdTest && (
        <div className="space-y-4 animate-slide-up">
          {/* Test info */}
          <div className="card p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#fafafa] truncate">{createdTest.title}</div>
              <div className="text-xs text-[#71717a]">Test ID: <code className="font-mono text-indigo-400">{createdTest.test_id}</code></div>
            </div>
            <div className="text-xs text-[#52525b]">{savedQuestions.length} questions</div>
          </div>

          {/* Question form */}
          <div className="card p-6 space-y-5">
            <div>
              <div className="section-title">Add Questions</div>
              <div className="section-sub">Define questions and their expected answers</div>
            </div>
            <form onSubmit={handleSaveQuestions} className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="bg-[#18181b] border border-[#27272a] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider">Question {i + 1}</span>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestionRow(i)} className="text-[#52525b] hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="label">Question Text</label>
                    <textarea
                      className="textarea-field"
                      rows={2}
                      placeholder="What is the capital of France?"
                      value={q.question_text}
                      onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Expected Answer</label>
                    <textarea
                      className="textarea-field"
                      rows={2}
                      placeholder="Paris is the capital of France..."
                      value={q.expected_answer}
                      onChange={e => updateQuestion(i, 'expected_answer', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <button type="button" onClick={addQuestionRow} className="btn-secondary flex-1">
                  <Plus size={14} /> Add Another
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <>Save Questions <CheckCircle2 size={14} /></>}
                </button>
              </div>
            </form>
          </div>

          {/* Saved questions list */}
          {savedQuestions.length > 0 && (
            <div className="card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-indigo-400" />
                <span className="text-sm font-medium text-[#fafafa]">Saved Questions ({savedQuestions.length})</span>
              </div>
              <div className="space-y-2">
                {savedQuestions.map((q, i) => (
                  <div key={i} className="bg-[#18181b] rounded-lg p-3 space-y-1">
                    <div className="text-xs text-[#52525b] font-medium uppercase tracking-wider">Q{i + 1}</div>
                    <div className="text-sm text-[#fafafa]">{q.question_text}</div>
                    <div className="text-xs text-[#71717a]">Expected: {q.expected_answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
