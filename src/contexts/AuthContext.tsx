import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { extractAdminSecret } from '../lib/auth'

interface AuthState {
  isAdmin: boolean
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthState>({
  isAdmin: false,
  loading: true,
  error: null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAdmin: false,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const secret =
      extractAdminSecret(window.location.hash) ??
      sessionStorage.getItem('admin_secret')

    if (secret) {
      if (window.location.hash.includes('admin=')) {
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      sessionStorage.setItem('admin_secret', secret)
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!secret) {
        setState({ isAdmin: false, loading: false, error: null })
        return
      }

      try {
        const currentUser = user ?? (await signInAnonymously(auth)).user
        await setDoc(doc(db, 'admins', currentUser.uid), { secret })
        setState({ isAdmin: true, loading: false, error: null })
      } catch (err) {
        sessionStorage.removeItem('admin_secret')
        setState({
          isAdmin: false,
          loading: false,
          error: 'Не ўдалося ўвайсці як адмін',
        })
      }
    })

    return unsubscribe
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
