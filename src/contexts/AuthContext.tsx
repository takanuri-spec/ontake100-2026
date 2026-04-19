import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthCtx { user: User | null; loading: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false) }), [])

  const signIn = async () => { await signInWithPopup(auth, new GoogleAuthProvider()) }
  const signOutFn = async () => { await signOut(auth) }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut: signOutFn }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
