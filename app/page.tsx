import Link from "next/link";
import { Button } from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { ROUTES } from "@/utils/constants";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Build faster with</span>{' '}
                  <span className="block text-blue-600 dark:text-blue-400 xl:inline">
                    Base App
                  </span>
                </h1>
                <p className="mt-3 text-base text-gray-500 dark:text-gray-400 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  A reusable full-stack starter built with Next.js, Supabase, and Vercel. 
                  Get your project up and running in minutes, not hours.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link href={ROUTES.LOGIN}>
                      <Button size="lg" className="w-full sm:w-auto">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link href="https://github.com/anguspersonal/base-app-vercel-supabase" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="lg" className="w-full sm:w-auto">
                        View on GitHub
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to get started
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 lg:mx-auto">
              Built with modern technologies and best practices for rapid development
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <Card>
                <CardHeader>
                  <CardTitle>🔐 Authentication</CardTitle>
                  <CardDescription>
                    Secure authentication with Supabase Auth and Google OAuth
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Google OAuth integration</li>
                    <li>• JWT session management</li>
                    <li>• Protected routes</li>
                    <li>• User profile management</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🗄️ Database</CardTitle>
                  <CardDescription>
                    PostgreSQL database with real-time subscriptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Supabase PostgreSQL</li>
                    <li>• Real-time subscriptions</li>
                    <li>• Row-level security</li>
                    <li>• Type-safe queries</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>⚡ Performance</CardTitle>
                  <CardDescription>
                    Optimized for speed with Next.js App Router
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Next.js 14+ App Router</li>
                    <li>• Server-side rendering</li>
                    <li>• Automatic code splitting</li>
                    <li>• Image optimization</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🚀 Deployment</CardTitle>
                  <CardDescription>
                    One-click deployment to Vercel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Automatic deployments</li>
                    <li>• Preview deployments</li>
                    <li>• Environment variables</li>
                    <li>• Global CDN</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started Section */}
      <div className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">
              Quick Start
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Get up and running in 5 minutes
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Clone the repository
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Start with our base template and customize it for your needs.
                  </p>
                  <div className="mt-4 bg-gray-900 dark:bg-gray-800 rounded-lg p-4">
                    <code className="text-green-400 text-sm">
                      git clone https://github.com/anguspersonal/base-app-vercel-supabase my-app
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Set up your environment
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Create a Supabase project and configure your environment variables.
                  </p>
                  <div className="mt-4 bg-gray-900 dark:bg-gray-800 rounded-lg p-4">
                    <code className="text-green-400 text-sm">
                      cp .env.example .env.local
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Deploy to Vercel
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Connect your repository to Vercel for automatic deployments.
                  </p>
                  <div className="mt-4">
                    <Link href="https://vercel.com/new" target="_blank" rel="noopener noreferrer">
                      <Button>
                        Deploy to Vercel
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Built with ❤️ using Next.js, Supabase, and Vercel
            </p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              © 2024 Base App. Open source and ready to use.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
