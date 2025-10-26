import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>&copy; {new Date().getFullYear()} Base App. All rights reserved.</p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link className="transition hover:text-gray-900 dark:hover:text-gray-100" href="/#features">
            Features
          </Link>
          <Link className="transition hover:text-gray-900 dark:hover:text-gray-100" href="/#pricing">
            Pricing
          </Link>
          <Link className="transition hover:text-gray-900 dark:hover:text-gray-100" href="/login">
            Sign in
          </Link>
          <Link className="transition hover:text-gray-900 dark:hover:text-gray-100" href="https://github.com/anguspersonal/base-app-vercel-supabase" target="_blank" rel="noreferrer">
            GitHub
          </Link>
        </nav>
      </div>
    </footer>
  )
}
