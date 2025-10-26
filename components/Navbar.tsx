'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { persistSessionToCookies } from '@/lib/sessionCookies'
import { Button } from './Button'
import { ROUTES } from '@/utils/constants'

export function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      persistSessionToCookies(session)
      setLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      persistSessionToCookies(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    persistSessionToCookies(null)
    router.push(ROUTES.HOME)
  }

  const navLinks = useMemo(
    () => [
      { href: ROUTES.HOME, label: 'Home' },
      { href: '/#features', label: 'Features' },
      { href: '/#pricing', label: 'Pricing' },
    ],
    []
  )

  const isActive = (href: string) => {
    if (href === ROUTES.HOME) {
      return pathname === ROUTES.HOME
    }

    if (href.startsWith('/#')) {
      return false
    }

    return pathname === href
  }

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.HOME} className="text-xl font-bold text-gray-900 dark:text-white">
          Base App
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition hover:text-gray-900 dark:hover:text-gray-100 ${
                isActive(link.href) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href={ROUTES.DASHBOARD}
              className={`text-sm font-medium transition hover:text-gray-900 dark:hover:text-gray-100 ${
                pathname?.startsWith(ROUTES.DASHBOARD)
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:inline">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <>
              <Link href={ROUTES.LOGIN} className="hidden text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 sm:inline">
                Log in
              </Link>
              <Link href={ROUTES.LOGIN}>
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
