import { redirect } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { ROUTES } from '@/utils/constants'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(ROUTES.LOGIN)
  }

  let profile: Awaited<ReturnType<typeof getProfile>> | null = null

  try {
    profile = await getProfile(user.id, supabase)
  } catch (error) {
    profile = null
  }

  return (
    <Layout>
      <DashboardClient
        user={{
          id: user.id,
          email: user.email ?? '',
          lastSignInAt: user.last_sign_in_at ?? null,
        }}
        profile={profile}
      />
    </Layout>
  )
}
