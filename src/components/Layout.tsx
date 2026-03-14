import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

export function Layout() {
  const { isAdmin, error } = useAuth()

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="header-title">
          <span className="header-icon">📖</span>
          <span>Слоўнік</span>
        </Link>
        <nav className="header-nav">
          {isAdmin && (
            <>
              <Link to="/word/new" className="nav-link">+ Дадаць</Link>
              <Link to="/admin/places" className="nav-link">Месцы</Link>
            </>
          )}
          {isAdmin && <span className="admin-badge">адмін</span>}
        </nav>
      </header>
      {error && <div className="toast-error">{error}</div>}
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
