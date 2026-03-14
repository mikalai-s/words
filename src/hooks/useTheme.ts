import { useEffect } from 'react'

export function useTheme() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function apply(dark: boolean) {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    }
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
}
