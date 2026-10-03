import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { authApi } from './api/auth'
import Navbar from './components/Navbar'
import AuthScreen from './components/AuthScreen'
import WorkspaceShell from './components/WorkspaceShell'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    authApi.me(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setUser(result) })
      .catch((issue) => { if (!controller.signal.aborted) setError(issue.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    function expired() { setUser(null); window.location.assign('#') }
    window.addEventListener('taskflow:unauthorized', expired)
    return () => window.removeEventListener('taskflow:unauthorized', expired)
  }, [])

  async function logout() {
    await authApi.logout()
    window.location.assign('#')
    setUser(null)
  }

  if (user) return <WorkspaceShell key={user.id} user={user} onLogout={logout} />
  return (
    <div className="app-page">
      <Navbar />
      {loading ? <div className="page-loading"><LoaderCircle className="animate-spin" size={22} />Menyiapkan ruang kerjamu...</div> : error ? (
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <p role="alert" className="error-message">{error}</p>
          <button type="button" className="primary-button mt-5" onClick={() => { setError(''); setLoading(true); setAttempt((value) => value + 1) }}>Coba lagi</button>
        </main>
      ) : <AuthScreen onAuthenticated={setUser} />}
    </div>
  )
}
