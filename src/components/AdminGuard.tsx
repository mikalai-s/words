import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null
  return <>{children}</>
}
