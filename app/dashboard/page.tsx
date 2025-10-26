import { redirect } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { ROUTES } from '@/utils/constants'
import { getServerSupabase } from '@/lib/auth'
import { getProfile } from '@/lib/db'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const { supabase, accessToken, refreshToken } = getServerSupabase()

  if (!accessToken || !refreshToken) {
    redirect(ROUTES.LOGIN)
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

  if (error || !session) {
    redirect(ROUTES.LOGIN)
  }

  let profile: Awaited<ReturnType<typeof getProfile>> | null = null

  try {
    profile = await getProfile(session.user.id, supabase)
  } catch (error) {
    profile = null
  }

  return (
    <Layout>
      <DashboardClient
        user={{
          id: session.user.id,
          email: session.user.email ?? '',
          lastSignInAt: session.user.last_sign_in_at ?? null,
        }}
        profile={profile}
      />
    </Layout>
  )
}
