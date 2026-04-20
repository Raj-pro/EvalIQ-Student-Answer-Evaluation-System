import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Teacher from './pages/Teacher.jsx'
import Student from './pages/Student.jsx'
import Results from './pages/Results.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/teacher" element={<Teacher />} />
        <Route path="/student" element={<Student />} />
        <Route path="/results" element={<Results />} />
      </Route>
    </Routes>
  )
}
