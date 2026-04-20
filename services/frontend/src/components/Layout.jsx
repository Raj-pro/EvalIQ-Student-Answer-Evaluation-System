import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Animated background layers */}
      <div className="bg-orbs" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <div className="bg-beam" aria-hidden="true" />

      <Navbar />
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
