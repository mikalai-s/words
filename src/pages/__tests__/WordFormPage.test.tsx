import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mock Firebase and hooks
vi.mock('../../config/firebase', () => ({
  db: {},
  auth: {},
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: true, loading: false, error: null }),
}))

vi.mock('../../hooks/useWords', () => ({
  useWords: () => ({ words: [], loading: false, error: null }),
}))

vi.mock('../../hooks/usePlaces', () => ({
  usePlaces: () => ({ places: [], loading: false, error: null }),
}))

vi.mock('../../lib/words', () => ({
  addWord: vi.fn(),
  updateWord: vi.fn(),
}))

import { WordFormPage } from '../WordFormPage'

describe('WordFormPage validation', () => {
  const renderForm = () =>
    render(
      <MemoryRouter initialEntries={['/word/new']}>
        <WordFormPage />
      </MemoryRouter>,
    )

  it('shows error when submitting empty form', async () => {
    renderForm()
    await userEvent.click(screen.getByText('Захаваць'))
    expect(screen.getByText('Слова і значэнне абавязковыя')).toBeInTheDocument()
  })

  it('shows error when only word is filled', async () => {
    renderForm()
    const inputs = screen.getAllByRole('textbox')
    await userEvent.type(inputs[0], 'бульба')
    await userEvent.click(screen.getByText('Захаваць'))
    expect(screen.getByText('Слова і значэнне абавязковыя')).toBeInTheDocument()
  })
})
