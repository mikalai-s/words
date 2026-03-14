export function extractAdminSecret(hash: string): string | null {
  if (!hash || hash === '#') return null
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(withoutHash)
  return params.get('admin')
}
