import { describe, it, expect } from 'vitest'
import { extractAdminSecret } from '../auth'

describe('extractAdminSecret', () => {
  it('extracts secret from hash with admin= prefix', () => {
    expect(extractAdminSecret('#admin=my-secret-123')).toBe('my-secret-123')
  })

  it('returns null when hash has no admin param', () => {
    expect(extractAdminSecret('#other=value')).toBeNull()
  })

  it('returns null for empty hash', () => {
    expect(extractAdminSecret('')).toBeNull()
  })

  it('returns null for hash with only #', () => {
    expect(extractAdminSecret('#')).toBeNull()
  })

  it('handles secret with special characters', () => {
    expect(extractAdminSecret('#admin=a-b_c.d!e')).toBe('a-b_c.d!e')
  })

  it('extracts secret when other hash params present', () => {
    expect(extractAdminSecret('#foo=bar&admin=secret&baz=qux')).toBe('secret')
  })
})
