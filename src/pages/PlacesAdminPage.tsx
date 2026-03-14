import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePlaces } from '../hooks/usePlaces'
import { addPlace, updatePlace, deletePlace } from '../lib/places'
import './PlacesAdminPage.css'

interface PlaceForm {
  name: string
  region: string
  lat: string
  lng: string
}

const emptyForm: PlaceForm = { name: '', region: '', lat: '', lng: '' }

export function PlacesAdminPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { places, loading } = usePlaces()
  const [form, setForm] = useState<PlaceForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isAdmin) {
    navigate('/')
    return null
  }

  if (loading) return <div className="loading">Загрузка...</div>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    const data = {
      name: form.name.trim(),
      region: form.region.trim(),
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
    }

    setSaving(true)
    try {
      if (editingId) {
        await updatePlace(editingId, data)
      } else {
        await addPlace(data)
      }
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const startEdit = (id: string) => {
    const place = places.find((p) => p.id === id)
    if (!place) return
    setEditingId(id)
    setForm({
      name: place.name,
      region: place.region,
      lat: place.lat?.toString() ?? '',
      lng: place.lng?.toString() ?? '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Выдаліць месца?')) return
    await deletePlace(id)
  }

  return (
    <div className="places-admin">
      <Link to="/" className="back-link">← назад</Link>
      <h1>Месцы</h1>

      <form className="place-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Назва *"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="form-input"
          required
        />
        <input
          type="text"
          placeholder="Рэгіён"
          value={form.region}
          onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
          className="form-input"
        />
        <div className="coord-row">
          <input
            type="number"
            step="any"
            placeholder="Шырата"
            value={form.lat}
            onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
            className="form-input"
          />
          <input
            type="number"
            step="any"
            placeholder="Даўгата"
            value={form.lng}
            onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
            className="form-input"
          />
        </div>
        <button type="submit" className="submit-btn" disabled={saving}>
          {editingId ? 'Абнавіць' : 'Дадаць'}
        </button>
        {editingId && (
          <button
            type="button"
            className="cancel-btn"
            onClick={() => { setForm(emptyForm); setEditingId(null) }}
          >
            Скасаваць
          </button>
        )}
      </form>

      <div className="places-list-admin">
        {places.map((place) => (
          <div key={place.id} className="place-item">
            <div>
              <strong>{place.name}</strong>
              {place.region && <span className="place-region"> — {place.region}</span>}
              {place.lat != null && place.lng != null && (
                <span className="place-coords"> ({place.lat}, {place.lng})</span>
              )}
            </div>
            <div className="place-actions">
              <button onClick={() => startEdit(place.id)}>✏️</button>
              <button onClick={() => handleDelete(place.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
