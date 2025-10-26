import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/utils/constants'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const errorDescription = searchParams.get('error_description') ?? searchParams.get('error')
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? ROUTES.DASHBOARD

  if (errorDescription || !code) {
    const redirectTarget = `${origin}${ROUTES.LOGIN}?error=${encodeURIComponent(
      errorDescription ?? 'missing_code'
    )}`
    return NextResponse.redirect(redirectTarget)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Error exchanging auth code for session', error)
    const redirectTarget = `${origin}${ROUTES.LOGIN}?error=auth_code_exchange`
    return NextResponse.redirect(redirectTarget)
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const destination = forwardedHost && !isLocal
    ? `https://${forwardedHost}${next}`
    : `${origin}${next}`

  return NextResponse.redirect(destination)
}
