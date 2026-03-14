import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaceUsageToggle } from '../PlaceUsageToggle'

describe('PlaceUsageToggle', () => {
  it('displays place name', () => {
    render(<PlaceUsageToggle name="Хатынічы" state={undefined} onChange={() => {}} />)
    expect(screen.getByText('Хатынічы')).toBeInTheDocument()
  })

  it('cycles unknown → used on click', async () => {
    const onChange = vi.fn()
    render(<PlaceUsageToggle name="Хатынічы" state={undefined} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith('used')
  })

  it('cycles used → not_used on click', async () => {
    const onChange = vi.fn()
    render(<PlaceUsageToggle name="Хатынічы" state="used" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith('not_used')
  })

  it('cycles not_used → unknown on click', async () => {
    const onChange = vi.fn()
    render(<PlaceUsageToggle name="Хатынічы" state="not_used" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
