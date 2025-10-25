export const APP_NAME = 'Base App'
export const APP_DESCRIPTION = 'A reusable full-stack starter with Next.js, Supabase, and Vercel'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
} as const

export const API_ROUTES = {
  HEALTH: '/api/health',
  USERS: '/api/users',
} as const

export const SUPABASE_TABLES = {
  PROFILES: 'profiles',
} as const
