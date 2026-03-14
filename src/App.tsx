import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useTheme } from './hooks/useTheme'
import { Layout } from './components/Layout'
import { SearchPage } from './pages/SearchPage'
import { WordDetailPage } from './pages/WordDetailPage'
import { WordFormPage } from './pages/WordFormPage'
import { PlacesAdminPage } from './pages/PlacesAdminPage'

export default function App() {
  useTheme()
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<SearchPage />} />
            <Route path="/word/new" element={<WordFormPage />} />
            <Route path="/word/:id" element={<WordDetailPage />} />
            <Route path="/word/:id/edit" element={<WordFormPage />} />
            <Route path="/admin/places" element={<PlacesAdminPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
