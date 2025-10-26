'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Layout } from '@/components/Layout'
import { supabase } from '@/lib/supabaseClient'
import { persistSessionToCookies } from '@/lib/sessionCookies'
import { ROUTES } from '@/utils/constants'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [message, setMessage] = useState('Signing you in...')

  const code = searchParams.get('code')
  const errorDescription =
    searchParams.get('error_description') ?? searchParams.get('error')

  useEffect(() => {
    if (errorDescription) {
      setStatus('error')
      setMessage(errorDescription)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('No authorization code found in the callback URL.')
      return
    }

    const handleExchange = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession({
        authCode: code,
      })

      if (error || !data.session) {
        setStatus('error')
        setMessage(error?.message ?? 'Unable to complete sign in.')
        return
      }

      persistSessionToCookies(data.session)
      setStatus('success')
      setMessage('Sign in successful! Redirecting...')
      router.replace(ROUTES.DASHBOARD)
    }

    handleExchange()
  }, [code, errorDescription, router])

  return (
    <Layout showFooter={false} showNavbar={false}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {status === 'error' ? 'Authentication Error' : 'Completing Sign In'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
          {status === 'error' && (
            <button
              type="button"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              onClick={() => router.replace(ROUTES.LOGIN)}
            >
              Return to login
            </button>
          )}
        </div>
      </div>
    </Layout>
  )
}
