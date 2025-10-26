'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/Card'
import { ROUTES } from '@/utils/constants'

interface DashboardClientProps {
  user: {
    id: string
    email: string
    lastSignInAt: string | null
  }
  profile: {
    id: string
    username: string | null
    created_at: string
  } | null
}

export function DashboardClient({ user, profile }: DashboardClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push(ROUTES.HOME)
  }

  return (
    <div className="bg-gray-50 py-10 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back! Here&apos;s what&apos;s happening with your account.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  <span className="font-medium">Email:</span> {user.email}
                </p>
                <p>
                  <span className="font-medium">User ID:</span> {user.id}
                </p>
                {user.lastSignInAt && (
                  <p>
                    <span className="font-medium">Last sign in:</span>{' '}
                    {new Date(user.lastSignInAt).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your user profile information</CardDescription>
            </CardHeader>
            <CardContent>
              {profile ? (
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    <span className="font-medium">Username:</span> {profile.username ?? '—'}
                  </p>
                  <p>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-gray-500">
                  <p>No profile created yet.</p>
                  <Button size="sm" variant="outline" disabled>
                    Coming soon
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleSignOut}
                >
                  Sign out
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Next steps to customize your base app</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Set up your Supabase project
                    </p>
                    <p>
                      Create a new Supabase project and update your environment variables locally.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Create your database schema
                    </p>
                    <p>
                      Use the Supabase SQL editor to create tables, policies, and sample data for your product.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Deploy to Vercel
                    </p>
                    <p>
                      Connect your GitHub repository, configure secrets, and deploy to production in a few clicks.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
