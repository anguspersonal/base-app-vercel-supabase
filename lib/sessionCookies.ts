import type { Session } from '@supabase/supabase-js'

const setCookie = (name: string, value: string, maxAgeSeconds: number) => {
  const expires = new Date(Date.now() + maxAgeSeconds * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; Expires=${expires}; SameSite=Lax`
}

const clearCookie = (name: string) => {
  document.cookie = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

export const persistSessionToCookies = (session: Session | null) => {
  if (typeof document === 'undefined') {
    return
  }

  if (session) {
    setCookie('sb-access-token', session.access_token, session.expires_in ?? 3600)
    setCookie('sb-refresh-token', session.refresh_token, 60 * 60 * 24 * 7)
  } else {
    clearCookie('sb-access-token')
    clearCookie('sb-refresh-token')
  }
}
