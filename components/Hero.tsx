import Link from 'next/link'
import { Button } from './Button'
import { ROUTES } from '@/utils/constants'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-12 px-4 pb-16 pt-20 sm:px-6 md:flex-row md:pt-24 lg:px-8 lg:pb-24">
        <div className="w-full md:w-1/2">
          <div className="space-y-6 text-center md:text-left">
            <span className="inline-flex items-center rounded-full border border-blue-100 px-3 py-1 text-sm font-medium text-blue-600 dark:border-blue-900 dark:text-blue-300">
              Launch faster with Base App
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Build production-ready SaaS experiences in days, not weeks
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              A modern starter template that blends Next.js, Supabase, and Vercel so you can focus on shipping features your customers love.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link className="sm:w-auto" href={ROUTES.LOGIN}>
                <Button size="lg" className="w-full">
                  Sign up for free
                </Button>
              </Link>
              <Link className="sm:w-auto" href={ROUTES.LOGIN}>
                <Button size="lg" variant="outline" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link className="sm:ml-2 sm:w-auto" href="/#features">
                <Button size="lg" variant="ghost" className="w-full">
                  Learn more
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <div className="relative rounded-3xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase text-gray-400">Stack</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">Next.js 16</p>
                <p>App Router + Server Actions</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase text-gray-400">Authentication</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">Supabase Auth</p>
                <p>OAuth & Email magic links</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase text-gray-400">Database</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">Postgres</p>
                <p>Type-safe queries & RLS</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase text-gray-400">Deploy</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">Vercel</p>
                <p>Global edge network</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
