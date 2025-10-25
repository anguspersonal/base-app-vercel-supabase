import { createClient } from '@supabase/supabase-js'

import { supabase } from './supabaseClient'

export const getServerSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const getRedirectUrl = () => {
  if (typeof window === 'undefined') {
    return undefined
  }

  return `${window.location.origin}/auth/callback`
}

export const signInWithEmail = async (options: {
  email: string
  password: string
}) => {
  const { data, error } = await supabase.auth.signInWithPassword(options)

  return { data, error }
}

export const signUpWithEmail = async (options: {
  email: string
  password: string
}) => {
  const { data, error } = await supabase.auth.signUp({
    ...options,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  })

  return { data, error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
    },
  })

  return { data, error }
}

export const signInWithMagicLink = async (options: { email: string }) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    ...options,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  })

  return { data, error }
}

export const signInWithPhoneOtp = async (options: { phone: string }) => {
  const { data, error } = await supabase.auth.signInWithOtp(options)

  return { data, error }
}

export const verifyPhoneOtp = async (params: {
  phone: string
  token: string
  type: 'sms' | 'phone_change' | 'recovery'
}) => {
  const { data, error } = await supabase.auth.verifyOtp(params)

  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()

  return { data: null, error }
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()

  return { data, error }
}

export const onAuthStateChange = (
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) => {
  const { data, error } = supabase.auth.onAuthStateChange(callback)

  return { data, error }
}
