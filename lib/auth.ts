import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const getServerSupabase = () => {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value ?? null
  const refreshToken = cookieStore.get('sb-refresh-token')?.value ?? null

  const decodedAccessToken = accessToken ? decodeURIComponent(accessToken) : null
  const decodedRefreshToken = refreshToken ? decodeURIComponent(refreshToken) : null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  return { supabase, accessToken: decodedAccessToken, refreshToken: decodedRefreshToken }
}
