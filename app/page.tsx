import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { Button } from "@/components/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/Card";
import { ROUTES } from "@/utils/constants";

const features = [
  {
    title: "Authentication",
    description: "Secure and flexible sign-in flows powered by Supabase Auth.",
    bullets: [
      "OAuth providers and email magic links",
      "Session management with auth helpers",
      "Protected routes out of the box",
      "Ready-to-extend user profiles",
    ],
  },
  {
    title: "Database",
    description: "Production-ready PostgreSQL with real-time updates.",
    bullets: [
      "Supabase Postgres with row level security",
      "Typed queries and generated APIs",
      "Instant SQL editor and migrations",
      "Realtime channels and listeners",
    ],
  },
  {
    title: "Performance",
    description: "Next.js App Router with streaming and server actions.",
    bullets: [
      "Built on Next.js 16 App Router",
      "SSR, ISR, and edge-ready by default",
      "Automatic code-splitting and bundling",
      "Image, font, and script optimizations",
    ],
  },
  {
    title: "Deployment",
    description: "Ship to production quickly with Vercel.",
    bullets: [
      "Preview deployments on every branch",
      "Environment variable management",
      "Analytics, monitoring, and logging",
      "Global CDN and edge network",
    ],
  },
];

const tiers = [
  {
    name: "Hobby",
    price: "Free",
    description: "Everything you need to explore the stack and build a prototype.",
    features: [
      "Supabase project scaffolding",
      "Email and password auth",
      "Basic dashboard UI",
      "Deploy to Vercel in minutes",
    ],
  },
  {
    name: "Startup",
    price: "$29/mo",
    description: "Extended tooling for teams shipping their first SaaS product.",
    features: [
      "Role-based access patterns",
      "Team and billing scaffolds",
      "Monitoring and logging presets",
      "Priority community support",
    ],
  },
  {
    name: "Enterprise",
    price: "Contact us",
    description: "Custom engagements for established teams with complex needs.",
    features: [
      "Custom onboarding and support",
      "Dedicated success engineer",
      "Architecture reviews",
      "SLA-backed uptime guarantees",
    ],
  },
];

export default function Home() {
  return (
    <Layout>
      <Hero />

      <section
        id="features"
        className="bg-gray-50 py-16 dark:bg-gray-900 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Features
            </h2>
            <p className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to launch faster
            </p>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Crafted with modern tooling, sensible defaults, and extensible patterns so you can focus on solving real customer problems.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:mt-16">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {feature.bullets.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-16 dark:bg-gray-950 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Pricing
            </h2>
            <p className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Start free and scale as you grow
            </p>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Transparent pricing tiers that match your team&apos;s stage and ambition.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className="flex h-full flex-col border border-gray-200 shadow-sm dark:border-gray-800"
              >
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {tier.price}
                    </p>
                    <ul className="mt-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {tier.features.map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <Link href={ROUTES.LOGIN} className="mt-8 block">
                    <Button variant="outline" className="w-full">
                      Choose {tier.name}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to launch your next idea?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Base App gives you a polished foundation with authentication, data access, and deployment built in. Connect your domain, ship features, and focus on your customers.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={ROUTES.LOGIN}>
              <Button size="lg" variant="secondary">
                Start building
              </Button>
            </Link>
            <Link href="https://github.com/anguspersonal/base-app-vercel-supabase" target="_blank" rel="noreferrer">
              <Button size="lg" variant="ghost" className="text-white hover:text-white">
                View the code
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
