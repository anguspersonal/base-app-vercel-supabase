# 🧱 **Base App Implementation Plan**

## 🎯 **Goal**

Create a clean, modular, and easily replicable base app using **Next.js + Supabase + Vercel**, with clear conventions for authentication, database access, and deployment.

This app will serve as the foundation for future projects (e.g., EatSafeUK, Omnitracker, StartIn), accelerating setup while maintaining consistency and security.

---

## 🗺️ **Phase 1 — Project Initialization**

### ✅ Step 1. Create Base Repository

* Create GitHub repo: `base-app-vercel-supabase`
* Add README.md (the version above)
* Initialize project:

  ```bash
  npx create-next-app@latest base-app-vercel-supabase --typescript --app
  ```
* Choose:

  * ✅ App Router
  * ✅ TypeScript
  * ✅ ESLint
  * ✅ Tailwind (optional)
  * ❌ No experimental features

### ✅ Step 2. Setup Vercel + Supabase projects

* Create Supabase project → copy URL & keys
* Create Vercel project → link GitHub repo
* Add env vars:

  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```
* Set `.env.example` and `.env.local`

### ✅ Step 3. Initialize Supabase SDK

* Install dependencies:

  ```bash
  npm install @supabase/ssr @supabase/supabase-js
  ```
* Create `lib/supabase/client.ts`:

  ```ts
  import { createBrowserClient } from '@supabase/ssr'

  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  ```
* Create `lib/supabase/server.ts`:

  ```ts
  import { createServerClient } from '@supabase/ssr'
  import { cookies } from 'next/headers'

  export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore write attempts in read-only environments
            }
          },
        },
      }
    )
  }
  ```

---

## 🧩 **Phase 2 — Core Architecture**

### ✅ Step 4. Folder Structure Setup

Implement:

```
/app
  /layout.tsx
  /page.tsx
  /login/page.tsx
  /dashboard/page.tsx
  /auth/callback/route.ts
/lib
  /supabase
    client.ts    # For client components
    server.ts    # For server components
  db.ts          # Database helpers
  auth.ts        # Auth utilities (optional)
/components
  Navbar.tsx
  Button.tsx
/utils
  supabase/proxy.ts  # Middleware for route protection
proxy.ts            # Next.js 16 middleware entry
/styles
  globals.css
/public
```

### ✅ Step 5. Add Authentication UI

* Add `/app/login/page.tsx`:

  ```tsx
  'use client'
  import { createClient } from '@/lib/supabase/client'

  export default function Login() {
    const supabase = createClient()
    const handleSignIn = async () => {
      const redirectTo = `${window.location.origin}/auth/callback`
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      })
    }
    return <button onClick={handleSignIn}>Sign in with Google</button>
  }
  ```

* Add `/app/auth/callback/route.ts`:

  ```ts
  import { createClient } from '@/lib/supabase/server'
  import { redirect } from 'next/navigation'

  export async function GET(request: Request) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    }
    
    redirect('/dashboard')
  }
  ```

* Add `/app/dashboard/page.tsx` as a protected route:

  ```tsx
  import { createClient } from '@/lib/supabase/server'
  import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  return <div>Welcome {user.email}</div>
}
  ```

---

## 🗄️ **Phase 3 — Database Setup**

### ✅ Step 6. Create Default Tables

Run in Supabase SQL editor:

```sql
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

Enable RLS (Row Level Security):

```sql
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);
```

### ✅ Step 7. Add Database Utilities

`lib/db.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getProfile(userId: string, client: SupabaseClient) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function createProfile(
  userId: string, 
  username: string, 
  client: SupabaseClient
) {
  const { data, error } = await client
    .from('profiles')
    .insert({ id: userId, username })
    .select()
    .single()

  if (error) throw error
  return data
}
```

**Note:** Database helpers accept a client parameter to support both server and client-side queries.

---

## 🎨 **Phase 4 — UI & Layout**

### ✅ Step 8. Add Route Protection Middleware

Create `proxy.ts` (Next.js 16 middleware pattern):

```ts
import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

Create `utils/supabase/proxy.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}
```

### ✅ Step 9. Add Basic Layout

* Add `/app/layout.tsx` with a shared Navbar, metadata, and global styles.
* Include conditionally rendered "Login / Logout" buttons.

### ✅ Step 10. Implement Tailwind CSS

Install and configure **Tailwind CSS v4**:

```bash
npm install -D tailwindcss @tailwindcss/postcss
npx tailwindcss init -p
```

**Note:** This project uses Tailwind CSS v4 with modern utilities.

---

## ☁️ **Phase 5 — Deployment & Testing**

### ✅ Step 11. Deploy to Vercel

* Commit to GitHub → automatic deploy
* Configure environment variables on Vercel
* Test auth flow → ensure redirect works correctly
* Add `https://your-domain.com/auth/callback` to Supabase URL Configuration

### ✅ Step 12. Test Database Operations

* Create a dummy profile in Supabase Studio
* Query via your `/dashboard` route
* Validate RLS (Row-Level Security) rules on `profiles` table

---

## 🧱 **Phase 6 — Template Finalization**

### ✅ Step 13. Add Base Components

* Example components:

  * `components/Navbar.tsx`
  * `components/Card.tsx`
  * `components/Button.tsx`
  * `components/Form.tsx`
  * `components/Footer.tsx`
  * `components/Hero.tsx`
  * `components/Layout.tsx`
* Export from `components/index.ts`

### ✅ Step 14. Add Utilities

Add reusables:

```
/utils
  fetcher.ts
  formatDate.ts
  constants.ts
  cn.ts          # Utility for merging class names
```

### ✅ Step 15. Add Scripts for Cloning

In `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "setup": "cp .env.example .env.local && echo '✅ .env.local created'"
}
```

---

## 🔁 **Phase 7 — Reuse Workflow**

### ✅ Step 16. Clone & Reuse Pattern

When starting a new project:

```bash
git clone https://github.com/anguspersonal/base-app-vercel-supabase new-project
cd new-project
rm -rf .git .gitignore
npm install
npm run setup
# Edit .env.local with new Supabase credentials
```

Then:

1. Rename in `package.json`
2. Create new Supabase project → update env vars in `.env.local` and Vercel
3. Push to new GitHub repo → link to Vercel
4. Add new callback URL to Supabase Authentication → URL Configuration

---

## 📈 **Future Enhancements**

| Feature                                   | Purpose                      |
| ----------------------------------------- | ---------------------------- |
| **PWA support**                           | For offline caching          |
| **NextAuth integration**                  | Alternate auth layer         |
| **Neon DB support**                       | Optional serverless Postgres |
| **Edge Functions**                        | For custom server logic      |
| **Automated tests (Playwright + Vitest)** | For CI/CD                    |
| **Base API routes**                       | `/api/users`, `/api/health`  |
| **Vercel Analytics**                      | Built-in user analytics      |

---

## 📋 **Backlog — Future Enhancements**

### 🚀 **High Priority**

#### **PWA Support**
- **Purpose**: Enable offline functionality and app-like experience
- **Tasks**:
  - Add `next-pwa` configuration
  - Create service worker for caching
  - Add web app manifest
  - Implement offline fallback pages
  - Add install prompts for mobile devices
- **Estimated Effort**: 2-3 days
- **Dependencies**: None

#### **Automated Testing Suite**
- **Purpose**: Ensure code quality and prevent regressions
- **Tasks**:
  - Set up Playwright for E2E testing
  - Configure Vitest for unit/integration tests
  - Add test coverage reporting
  - Create CI/CD pipeline with GitHub Actions
  - Write tests for critical user flows (auth, dashboard)
- **Estimated Effort**: 3-4 days
- **Dependencies**: None

#### **API Rate Limiting**
- **Purpose**: Protect against abuse and ensure fair usage
- **Tasks**:
  - Implement rate limiting middleware
  - Add Redis for distributed rate limiting
  - Create rate limit configuration
  - Add rate limit headers and error responses
  - Implement different limits for different endpoints
- **Estimated Effort**: 2-3 days
- **Dependencies**: Redis instance

#### **Monitoring & Analytics**
- **Purpose**: Track performance, errors, and user behavior
- **Tasks**:
  - Integrate Vercel Analytics
  - Add Sentry for error tracking
  - Implement custom analytics events
  - Create performance monitoring dashboard
  - Add uptime monitoring
- **Estimated Effort**: 2-3 days
- **Dependencies**: Sentry account, Vercel Pro plan

### 🔧 **Medium Priority**

#### **Enhanced Authentication**
- **Purpose**: Provide more auth options and better UX
- **Tasks**:
  - Add email/password authentication
  - Implement magic link login
  - Add social providers (GitHub, Discord)
  - Create password reset flow
  - Add two-factor authentication (2FA)
- **Estimated Effort**: 4-5 days
- **Dependencies**: None

#### **Database Enhancements**
- **Purpose**: Improve performance and add advanced features
- **Tasks**:
  - Add database indexes for performance
  - Implement database migrations system
  - Add database backup automation
  - Create database seeding scripts
  - Add database monitoring and alerts
- **Estimated Effort**: 3-4 days
- **Dependencies**: None

#### **Advanced UI Components**
- **Purpose**: Provide more reusable components
- **Tasks**:
  - Add Modal/Dialog component
  - Create Toast notification system
  - Add Loading skeleton components
  - Implement Data table component
  - Add Form validation library integration
- **Estimated Effort**: 3-4 days
- **Dependencies**: None

#### **API Documentation**
- **Purpose**: Make the API self-documenting
- **Tasks**:
  - Add OpenAPI/Swagger documentation
  - Create interactive API explorer
  - Add API versioning strategy
  - Generate TypeScript types from API
  - Add API testing tools
- **Estimated Effort**: 2-3 days
- **Dependencies**: None

### 🎨 **Low Priority**

#### **Theme System**
- **Purpose**: Allow easy customization of app appearance
- **Tasks**:
  - Create theme provider context
  - Add multiple predefined themes
  - Implement theme switching
  - Add custom CSS variable system
  - Create theme preview component
- **Estimated Effort**: 2-3 days
- **Dependencies**: None

#### **Internationalization (i18n)**
- **Purpose**: Support multiple languages
- **Tasks**:
  - Add next-intl or react-i18next
  - Create translation files
  - Implement language switching
  - Add RTL support
  - Create translation management workflow
- **Estimated Effort**: 3-4 days
- **Dependencies**: None

#### **Advanced Caching**
- **Purpose**: Improve performance and reduce server load
- **Tasks**:
  - Implement Redis caching layer
  - Add CDN configuration
  - Create cache invalidation strategies
  - Add cache warming mechanisms
  - Implement cache monitoring
- **Estimated Effort**: 3-4 days
- **Dependencies**: Redis instance

#### **File Upload & Storage**
- **Purpose**: Handle file uploads and media management
- **Tasks**:
  - Add Supabase Storage integration
  - Create file upload components
  - Implement image optimization
  - Add file type validation
  - Create media gallery component
- **Estimated Effort**: 3-4 days
- **Dependencies**: None

### 🔮 **Future Considerations**

#### **Microservices Architecture**
- **Purpose**: Scale to larger applications
- **Tasks**:
  - Split into microservices
  - Add API gateway
  - Implement service discovery
  - Add distributed logging
  - Create service mesh
- **Estimated Effort**: 2-3 weeks
- **Dependencies**: Kubernetes knowledge

#### **Real-time Features**
- **Purpose**: Add live updates and collaboration
- **Tasks**:
  - Implement WebSocket connections
  - Add real-time notifications
  - Create live collaboration features
  - Add presence indicators
  - Implement real-time chat
- **Estimated Effort**: 1-2 weeks
- **Dependencies**: WebSocket infrastructure

#### **Mobile App**
- **Purpose**: Native mobile experience
- **Tasks**:
  - Create React Native app
  - Share code between web and mobile
  - Add push notifications
  - Implement offline sync
  - Add mobile-specific features
- **Estimated Effort**: 3-4 weeks
- **Dependencies**: React Native knowledge

---

## 🧠 **Success Criteria**

✅ Clean repo that can be cloned and renamed in <5 min
✅ Auth + DB working out of the box
✅ Local and Vercel environments identical
✅ Documented setup steps for collaborators
✅ Extensible with minimal refactoring

---

---

# 💳 **Phase 8 — Monetization (Stripe Integration)**

## 🎯 **Goal**

Implement a complete payment system using Stripe to enable subscription-based monetization with multiple pricing tiers, customer portal, and webhook handling.

This will transform the base app into a production-ready SaaS starter with built-in revenue capabilities.

---

## 📋 **Overview**

**What We're Building:**
- 3-tier pricing (Free, Pro, Enterprise)
- Stripe Checkout integration
- Customer billing portal
- Webhook handling for subscription events
- Usage-based feature gates
- Payment history tracking
- Subscription management UI

**Tech Stack:**
- **Payment Provider:** Stripe
- **SDK:** `stripe` npm package
- **Webhook Security:** Stripe webhook signatures
- **Database:** Supabase (PostgreSQL)

**Estimated Time:** 7-10 days

---

## 🗺️ **Implementation Steps**

### ✅ Step 17. Stripe Account Setup

**Create Stripe Account:**
1. Go to [stripe.com](https://stripe.com) and create account
2. Complete business information
3. Enable test mode for development

**Create Products & Prices:**
1. In Stripe Dashboard → Products → Add Product
2. Create three products:
   - **Free Plan** ($0/month)
   - **Pro Plan** ($29/month or $290/year)
   - **Enterprise Plan** ($99/month or $990/year)
3. For each product, create both monthly and yearly prices
4. Copy all Price IDs (e.g., `price_xxx`)

**Get API Keys:**
1. Developers → API Keys
2. Copy:
   - **Publishable key** (`pk_test_xxx`)
   - **Secret key** (`sk_test_xxx`)

**Setup Webhook Endpoint:**
1. Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://your-domain.com/api/stripe/webhooks`
3. Listen to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy **Webhook signing secret** (`whsec_xxx`)

---

### ✅ Step 18. Install Dependencies

```bash
npm install stripe @stripe/stripe-js
```

**Packages:**
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe.js loader

---

### ✅ Step 19. Update Environment Variables

Add to `.env.local`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_FREE=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx
```

Add to `.env.example`:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRICE_FREE=
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY=
```

---

### ✅ Step 20. Database Schema

Create `supabase/migrations/002_subscriptions.sql`:

```sql
-- Plans table
create table plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  price_monthly integer not null default 0, -- cents
  price_yearly integer not null default 0, -- cents
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Subscriptions table
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null unique,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  plan_id uuid references plans,
  status text not null, -- active, canceled, past_due, trialing, incomplete
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Payments table
create table payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  subscription_id uuid references subscriptions,
  stripe_payment_intent_id text unique not null,
  amount integer not null, -- cents
  currency text default 'usd' not null,
  status text not null, -- succeeded, pending, failed
  description text,
  receipt_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table payments enable row level security;

-- Plans are viewable by everyone
create policy "Plans are viewable by everyone"
  on plans for select
  using (true);

-- Users can view their own subscription
create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Users can view their own payments
create policy "Users can view own payments"
  on payments for select
  using (auth.uid() = user_id);

-- Create trigger for updated_at on subscriptions
create trigger on_subscriptions_updated
  before update on subscriptions
  for each row execute procedure public.handle_updated_at();

-- Create trigger for updated_at on plans
create trigger on_plans_updated
  before update on plans
  for each row execute procedure public.handle_updated_at();

-- Insert default plans
insert into plans (name, slug, description, price_monthly, price_yearly, features, limits, sort_order) values
(
  'Free',
  'free',
  'Perfect for getting started',
  0,
  0,
  '["Basic features", "Community support", "1 project"]'::jsonb,
  '{"projects": 1, "ai_tokens_per_day": 10000, "storage_gb": 1}'::jsonb,
  1
),
(
  'Pro',
  'pro',
  'For professionals and growing teams',
  2900,
  29000,
  '["All Free features", "Priority support", "10 projects", "Advanced analytics"]'::jsonb,
  '{"projects": 10, "ai_tokens_per_day": 100000, "storage_gb": 10}'::jsonb,
  2
),
(
  'Enterprise',
  'enterprise',
  'For large organizations',
  9900,
  99000,
  '["All Pro features", "24/7 support", "Unlimited projects", "Custom integrations", "SLA"]'::jsonb,
  '{"projects": -1, "ai_tokens_per_day": -1, "storage_gb": 100}'::jsonb,
  3
);

-- Create indexes
create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_stripe_customer_id on subscriptions(stripe_customer_id);
create index idx_payments_user_id on payments(user_id);
create index idx_payments_subscription_id on payments(subscription_id);
```

Run in Supabase SQL Editor.

---

### ✅ Step 21. Create Stripe Utilities

Create `lib/stripe.ts`:

```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

export const STRIPE_PLANS = {
  free: {
    name: 'Free',
    priceMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE!,
  },
  pro: {
    name: 'Pro',
    priceMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY!,
    priceYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY!,
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY!,
    priceYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY!,
  },
} as const
```

Create `lib/subscriptions.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export type PlanSlug = 'free' | 'pro' | 'enterprise'

export interface Plan {
  id: string
  name: string
  slug: PlanSlug
  description: string | null
  price_monthly: number
  price_yearly: number
  features: string[]
  limits: Record<string, number>
  is_active: boolean
  sort_order: number
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  plan_id: string | null
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export async function getUserSubscription(
  userId: string,
  client: SupabaseClient
): Promise<Subscription | null> {
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data
}

export async function getUserPlan(
  userId: string,
  client: SupabaseClient
): Promise<Plan | null> {
  const subscription = await getUserSubscription(userId, client)

  if (!subscription || !subscription.plan_id) {
    // Return free plan
    return getFreePlan(client)
  }

  const { data, error } = await client
    .from('plans')
    .select('*')
    .eq('id', subscription.plan_id)
    .single()

  if (error) throw error
  return data
}

export async function getFreePlan(client: SupabaseClient): Promise<Plan> {
  const { data, error } = await client
    .from('plans')
    .select('*')
    .eq('slug', 'free')
    .single()

  if (error) throw error
  return data
}

export async function getAllPlans(client: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await client
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function createOrUpdateSubscription(
  userId: string,
  subscriptionData: Partial<Subscription>,
  client: SupabaseClient
) {
  const { data, error } = await client
    .from('subscriptions')
    .upsert({
      user_id: userId,
      ...subscriptionData,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function hasActiveSubscription(
  userId: string,
  client: SupabaseClient
): Promise<boolean> {
  const subscription = await getUserSubscription(userId, client)
  return subscription?.status === 'active' || subscription?.status === 'trialing'
}

export async function canAccessFeature(
  userId: string,
  feature: string,
  client: SupabaseClient
): Promise<boolean> {
  const plan = await getUserPlan(userId, client)
  if (!plan) return false

  // Check feature limits
  const limit = plan.limits[feature]
  if (limit === undefined) return true // No limit defined
  if (limit === -1) return true // Unlimited

  // For countable features, you'd need to check usage
  // This is a simplified version
  return limit > 0
}
```

---

### ✅ Step 22. Create Stripe API Routes

Create `app/api/stripe/checkout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, mode = 'subscription' } = await request.json()

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Create subscription record
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'incomplete',
      })
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get('origin')}/dashboard/billing?success=true`,
      cancel_url: `${request.headers.get('origin')}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

Create `app/api/stripe/portal/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { getUserSubscription } from '@/lib/subscriptions'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getUserSubscription(user.id, supabase)

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${request.headers.get('origin')}/dashboard/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

Create `app/api/stripe/webhooks/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id

        if (!userId) break

        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: session.subscription as string,
            status: 'active',
          })
          .eq('user_id', userId)

        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get user from customer ID
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id, plan_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!subData) break

        // Get plan from price ID
        const priceId = subscription.items.data[0].price.id
        const { data: plan } = await supabase
          .from('plans')
          .select('id')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single()

        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            plan_id: plan?.id || subData.plan_id,
            status: subscription.status,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          })
          .eq('stripe_customer_id', customerId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('id, user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!subData) break

        await supabase.from('payments').insert({
          user_id: subData.user_id,
          subscription_id: subData.id,
          stripe_payment_intent_id: invoice.payment_intent as string,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          description: invoice.description || 'Subscription payment',
          receipt_url: invoice.hosted_invoice_url,
        })

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', customerId)

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
```

---

### ✅ Step 23. Create Pricing Components

Create `components/PricingCard.tsx`:

```tsx
'use client'

import { Button } from './Button'
import { Card } from './Card'
import { Check } from 'lucide-react'

interface PricingCardProps {
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: string[]
  isPopular?: boolean
  isCurrentPlan?: boolean
  billingInterval: 'monthly' | 'yearly'
  onSubscribe: () => void
  loading?: boolean
}

export function PricingCard({
  name,
  description,
  priceMonthly,
  priceYearly,
  features,
  isPopular = false,
  isCurrentPlan = false,
  billingInterval,
  onSubscribe,
  loading = false,
}: PricingCardProps) {
  const price = billingInterval === 'monthly' ? priceMonthly : priceYearly
  const displayPrice = price === 0 ? 'Free' : `$${price / 100}`
  const interval = billingInterval === 'monthly' ? '/mo' : '/yr'

  return (
    <Card
      className={`relative flex flex-col ${
        isPopular
          ? 'border-2 border-black dark:border-white'
          : 'border border-gray-200 dark:border-gray-800'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-black px-4 py-1 text-sm font-medium text-white dark:bg-white dark:text-black">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-2xl font-bold">{name}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>

        <div className="mt-6">
          <span className="text-4xl font-bold">{displayPrice}</span>
          {price > 0 && (
            <span className="text-gray-600 dark:text-gray-400">{interval}</span>
          )}
        </div>

        <Button
          className="mt-6 w-full"
          variant={isPopular ? 'primary' : 'outline'}
          onClick={onSubscribe}
          disabled={isCurrentPlan || loading}
          loading={loading}
        >
          {isCurrentPlan ? 'Current Plan' : 'Subscribe'}
        </Button>

        <ul className="mt-6 space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 shrink-0 text-green-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
```

Create `components/SubscriptionBadge.tsx`:

```tsx
interface SubscriptionBadgeProps {
  planName: string
}

export function SubscriptionBadge({ planName }: SubscriptionBadgeProps) {
  const colors = {
    Free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    Pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Enterprise:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        colors[planName as keyof typeof colors] || colors.Free
      }`}
    >
      {planName}
    </span>
  )
}
```

---

### ✅ Step 24. Create Pricing Page

Create `app/pricing/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { PricingCard } from '@/components/PricingCard'
import { Button } from '@/components/Button'
import { loadStripe } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>(
    'monthly'
  )
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const handleSubscribe = async (priceId: string, planSlug: string) => {
    setLoading(planSlug)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      const { url, error } = await response.json()

      if (error) {
        console.error(error)
        alert('Error creating checkout session')
        return
      }

      if (url) {
        router.push(url)
      }
    } catch (error) {
      console.error(error)
      alert('Error creating checkout session')
    } finally {
      setLoading(null)
    }
  }

  const plans = [
    {
      name: 'Free',
      slug: 'free',
      description: 'Perfect for getting started',
      priceMonthly: 0,
      priceYearly: 0,
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE!,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE!,
      features: [
        'Basic features',
        'Community support',
        '1 project',
        '1GB storage',
        '10K AI tokens/day',
      ],
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'For professionals and growing teams',
      priceMonthly: 2900,
      priceYearly: 29000,
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY!,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY!,
      features: [
        'All Free features',
        'Priority support',
        '10 projects',
        '10GB storage',
        '100K AI tokens/day',
        'Advanced analytics',
      ],
      isPopular: true,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'For large organizations',
      priceMonthly: 9900,
      priceYearly: 99000,
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY!,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY!,
      features: [
        'All Pro features',
        '24/7 support',
        'Unlimited projects',
        '100GB storage',
        'Unlimited AI tokens',
        'Custom integrations',
        'SLA',
      ],
    },
  ]

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Choose the plan that's right for you
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-12 flex justify-center">
          <div className="relative flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`relative rounded-md px-6 py-2 text-sm font-medium transition ${
                billingInterval === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`relative rounded-md px-6 py-2 text-sm font-medium transition ${
                billingInterval === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard
              key={plan.slug}
              name={plan.name}
              description={plan.description}
              priceMonthly={plan.priceMonthly}
              priceYearly={plan.priceYearly}
              features={plan.features}
              isPopular={plan.isPopular}
              billingInterval={billingInterval}
              onSubscribe={() =>
                handleSubscribe(
                  billingInterval === 'monthly'
                    ? plan.priceIdMonthly
                    : plan.priceIdYearly,
                  plan.slug
                )
              }
              loading={loading === plan.slug}
            />
          ))}
        </div>
      </div>
    </Layout>
  )
}
```

---

### ✅ Step 25. Create Billing Dashboard Page

Create `app/dashboard/billing/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { createClient } from '@/lib/supabase/server'
import { getUserSubscription, getUserPlan } from '@/lib/subscriptions'
import { ROUTES } from '@/utils/constants'
import { BillingClient } from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  const [subscription, plan] = await Promise.all([
    getUserSubscription(user.id, supabase),
    getUserPlan(user.id, supabase),
  ])

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <Layout>
      <BillingClient
        subscription={subscription}
        plan={plan}
        payments={payments || []}
      />
    </Layout>
  )
}
```

Create `app/dashboard/billing/BillingClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { SubscriptionBadge } from '@/components/SubscriptionBadge'
import { formatDate } from '@/utils/formatDate'
import Link from 'next/link'
import { ROUTES } from '@/utils/constants'

interface BillingClientProps {
  subscription: any
  plan: any
  payments: any[]
}

export function BillingClient({
  subscription,
  plan,
  payments,
}: BillingClientProps) {
  const [loading, setLoading] = useState(false)

  const handleManageBilling = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const { url } = await response.json()

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error(error)
      alert('Error opening billing portal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">Billing & Subscription</h1>

      {/* Current Plan */}
      <Card className="mt-8 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Current Plan</h2>
            <div className="mt-2 flex items-center gap-3">
              <SubscriptionBadge planName={plan?.name || 'Free'} />
              {subscription?.status && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Status: {subscription.status}
                </span>
              )}
            </div>
            {subscription?.current_period_end && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {subscription.cancel_at_period_end
                  ? 'Cancels on'
                  : 'Renews on'}{' '}
                {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {subscription?.stripe_customer_id && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                loading={loading}
              >
                Manage Billing
              </Button>
            )}
            <Link href="/pricing">
              <Button>Upgrade Plan</Button>
            </Link>
          </div>
        </div>

        {/* Plan Features */}
        {plan?.features && (
          <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-800">
            <h3 className="font-medium">Plan Features</h3>
            <ul className="mt-3 space-y-2">
              {plan.features.map((feature: string, index: number) => (
                <li
                  key={index}
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  • {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Payment History */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Payment History</h2>
        <Card className="mt-4">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              No payment history yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {payment.description}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        ${payment.amount / 100} {payment.currency.toUpperCase()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            payment.status === 'succeeded'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {payment.receipt_url && (
                          <a
                            href={payment.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
```

---

### ✅ Step 26. Update Constants

Update `utils/constants.ts`:

```typescript
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  PRICING: '/pricing',
  BILLING: '/dashboard/billing',
} as const
```

---

### ✅ Step 27. Add Feature Gates Utility

Create `utils/featureGates.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscriptions'
import { redirect } from 'next/navigation'
import { ROUTES } from './constants'

export async function requirePlan(
  requiredPlan: 'free' | 'pro' | 'enterprise'
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  const plan = await getUserPlan(user.id, supabase)

  const planHierarchy = {
    free: 0,
    pro: 1,
    enterprise: 2,
  }

  const userPlanLevel = planHierarchy[plan?.slug as keyof typeof planHierarchy] || 0
  const requiredPlanLevel = planHierarchy[requiredPlan]

  if (userPlanLevel < requiredPlanLevel) {
    redirect(ROUTES.PRICING)
  }

  return { user, plan }
}

export async function checkFeatureLimit(
  feature: string,
  currentUsage: number
): Promise<{ allowed: boolean; limit: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false, limit: 0 }
  }

  const plan = await getUserPlan(user.id, supabase)
  const limit = plan?.limits[feature] || 0

  if (limit === -1) {
    // Unlimited
    return { allowed: true, limit: -1 }
  }

  return {
    allowed: currentUsage < limit,
    limit,
  }
}
```

---

### ✅ Step 28. Update Navbar with Plan Badge

Update `components/Navbar.tsx` to show plan:

```tsx
// Add to imports
import { SubscriptionBadge } from './SubscriptionBadge'

// In the component, add state for plan
const [userPlan, setUserPlan] = useState<string | null>(null)

// In getSession, fetch plan:
useEffect(() => {
  const getSession = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user ?? null)
    
    if (user) {
      // Fetch plan
      const { data: plan } = await supabase
        .from('subscriptions')
        .select('plans(name)')
        .eq('user_id', user.id)
        .single()
      
      setUserPlan(plan?.plans?.name || 'Free')
    }
    
    setLoading(false)
  }

  getSession()
  // ... rest of the code
}, [supabase])

// In the UI, after user email:
{user && userPlan && (
  <SubscriptionBadge planName={userPlan} />
)}
```

---

### ✅ Step 29. Testing Checklist

**Local Testing:**
- [ ] Stripe test keys configured
- [ ] Webhook endpoint receiving events (use Stripe CLI)
- [ ] Can navigate to pricing page
- [ ] Can click subscribe and redirect to Stripe Checkout
- [ ] After successful checkout, redirected to dashboard
- [ ] Subscription shows in database
- [ ] Billing page shows current plan
- [ ] Can open customer portal
- [ ] Can upgrade/downgrade plans
- [ ] Payment history displays correctly

**Stripe CLI for Local Webhooks:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
# Copy webhook signing secret to .env.local
```

**Production Testing:**
- [ ] Update webhook endpoint in Stripe Dashboard
- [ ] Test with real payment (use $0.50 test)
- [ ] Verify emails sent (receipts)
- [ ] Test subscription lifecycle (create, update, cancel)
- [ ] Test failed payments
- [ ] Test webhook security

---

### ✅ Step 30. Documentation Updates

Update `README.md` with Stripe section:

```markdown
### Stripe Integration

This template includes a complete Stripe subscription system:

1. **Setup Stripe:**
   - Create products and prices in Stripe Dashboard
   - Copy price IDs to `.env.local`
   - Configure webhook endpoint

2. **Local Development:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhooks
   ```

3. **Production:**
   - Add webhook endpoint in Stripe Dashboard
   - Set environment variables in Vercel
   - Test with live mode

**Features:**
- Multiple pricing tiers
- Monthly/yearly billing
- Customer portal
- Payment history
- Feature gates
```

---

## 🧠 **Success Criteria**

✅ Users can view pricing plans
✅ Users can subscribe to paid plans
✅ Stripe webhooks update subscription status
✅ Users can manage billing through customer portal
✅ Payment history tracked in database
✅ Feature gates work based on plan
✅ All Stripe events handled properly
✅ Production-ready with error handling

---

---

# 📧 **Phase 9 — Email System (Resend + React Email)**

## 🎯 **Goal**

Implement a complete email system using Resend for transactional emails with beautiful, responsive templates built with React Email.

This will enable automated email notifications for authentication, payments, and user engagement.

---

## 📋 **Overview**

**What We're Building:**
- Email service integration with Resend
- React Email templates (TSX-based)
- Transactional email triggers
- Email preferences management
- Unsubscribe functionality
- Email tracking and monitoring

**Tech Stack:**
- **Email Provider:** Resend
- **Template Engine:** React Email
- **Email Types:** Transactional + Marketing
- **Database:** Supabase (email preferences)

**Estimated Time:** 4-5 days

---

## 🗺️ **Implementation Steps**

### ✅ Step 31. Resend Account Setup

**Create Resend Account:**
1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email
3. No credit card required for free tier

**Add Domain:**
1. Dashboard → Domains → Add Domain
2. Enter your domain (e.g., `yourdomain.com`)
3. Add DNS records (SPF, DKIM, DMARC):
   ```
   Type: TXT
   Name: @
   Value: [provided by Resend]
   
   Type: TXT
   Name: resend._domainkey
   Value: [provided by Resend]
   ```
4. Wait for verification (5-30 minutes)

**Get API Key:**
1. Dashboard → API Keys → Create API Key
2. Name it (e.g., "Production" or "Development")
3. Copy the API key (`re_xxx`)

**For Development:**
- Use `onboarding@resend.dev` as sender
- Can only send to your own email
- No domain verification needed

---

### ✅ Step 32. Install Dependencies

```bash
npm install resend react-email @react-email/components
npm install -D @react-email/tailwind
```

**Packages:**
- `resend` - Resend SDK
- `react-email` - React Email core
- `@react-email/components` - Pre-built email components
- `@react-email/tailwind` - Tailwind support for emails

---

### ✅ Step 33. Update Environment Variables

Add to `.env.local`:

```env
# Resend
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Base App
```

Add to `.env.example`:

```env
# Resend (Phase 9 - Email System)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Base App
```

---

### ✅ Step 34. Database Schema for Email Preferences

Create `supabase/migrations/003_email_preferences.sql`:

```sql
-- Email preferences table
create table email_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null unique,
  marketing_emails boolean default true,
  product_updates boolean default true,
  security_alerts boolean default true, -- Always true, can't be disabled
  unsubscribed_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Email logs (for tracking)
create table email_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  email_type text not null,
  recipient_email text not null,
  subject text not null,
  status text not null, -- sent, failed, bounced
  error_message text,
  resend_id text,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table email_preferences enable row level security;
alter table email_logs enable row level security;

-- Users can view/update their own email preferences
create policy "Users can view own email preferences"
  on email_preferences for select
  using (auth.uid() = user_id);

create policy "Users can update own email preferences"
  on email_preferences for update
  using (auth.uid() = user_id);

-- Users can view their own email logs
create policy "Users can view own email logs"
  on email_logs for select
  using (auth.uid() = user_id);

-- Create trigger for updated_at
create trigger on_email_preferences_updated
  before update on email_preferences
  for each row execute procedure public.handle_updated_at();

-- Create function to auto-create email preferences
create or replace function public.handle_new_user_email_preferences()
returns trigger as $$
begin
  insert into public.email_preferences (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create email preferences on user signup
create trigger on_auth_user_created_email_preferences
  after insert on auth.users
  for each row execute procedure public.handle_new_user_email_preferences();

-- Create indexes
create index idx_email_logs_user_id on email_logs(user_id);
create index idx_email_logs_created_at on email_logs(created_at);
create index idx_email_preferences_user_id on email_preferences(user_id);
```

Run in Supabase SQL Editor.

---

### ✅ Step 35. Create Email Service

Create `lib/emails.ts`:

```typescript
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set - emails will not be sent')
}

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const FROM_NAME = process.env.RESEND_FROM_NAME || 'Base App'

export type EmailType = 
  | 'welcome'
  | 'password_reset'
  | 'email_verification'
  | 'payment_receipt'
  | 'subscription_created'
  | 'subscription_canceled'
  | 'trial_ending'

interface SendEmailOptions {
  to: string
  subject: string
  react: React.ReactElement
  userId?: string
  emailType: EmailType
}

export async function sendEmail({
  to,
  subject,
  react,
  userId,
  emailType,
}: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      react,
    })

    // Log email
    if (userId) {
      const supabase = await createClient()
      await supabase.from('email_logs').insert({
        user_id: userId,
        email_type: emailType,
        recipient_email: to,
        subject,
        status: error ? 'failed' : 'sent',
        error_message: error?.message,
        resend_id: data?.id,
      })
    }

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send exception:', error)
    return { success: false, error }
  }
}

export async function canSendEmail(
  userId: string,
  emailType: EmailType
): Promise<boolean> {
  // Security alerts always allowed
  if (emailType === 'password_reset' || emailType === 'email_verification') {
    return true
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('email_preferences')
    .select('marketing_emails, product_updates, unsubscribed_at')
    .eq('user_id', userId)
    .single()

  if (!data) return true // Default to sending if no preferences set
  if (data.unsubscribed_at) return false

  // Check specific preferences
  if (emailType === 'welcome' || emailType === 'trial_ending') {
    return data.product_updates
  }

  if (
    emailType === 'payment_receipt' ||
    emailType === 'subscription_created' ||
    emailType === 'subscription_canceled'
  ) {
    return true // Always send transactional emails
  }

  return true
}
```

---

### ✅ Step 36. Create Email Templates

Create folder structure:
```
/emails/
  ├── components/
  │   ├── EmailLayout.tsx
  │   └── EmailButton.tsx
  ├── WelcomeEmail.tsx
  ├── PasswordResetEmail.tsx
  ├── PaymentReceiptEmail.tsx
  ├── SubscriptionCanceledEmail.tsx
  └── TrialEndingEmail.tsx
```

Create `emails/components/EmailLayout.tsx`:

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components'

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Base App</Text>
          </Section>
          
          <Section style={content}>{children}</Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Base App. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href={`${process.env.NEXT_PUBLIC_SITE_URL}/settings/email`} style={link}>
                Email Preferences
              </Link>
              {' • '}
              <Link href={`${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe`} style={link}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px 40px',
}

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const content = {
  padding: '0 40px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const footer = {
  padding: '0 40px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
}

const link = {
  color: '#556cd6',
  textDecoration: 'underline',
}
```

Create `emails/components/EmailButton.tsx`:

```tsx
import { Button } from '@react-email/components'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button href={href} style={button}>
      {children}
    </Button>
  )
}

const button = {
  backgroundColor: '#000000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '24px 0',
}
```

Create `emails/WelcomeEmail.tsx`:

```tsx
import { EmailLayout } from './components/EmailLayout'
import { EmailButton } from './components/EmailButton'
import { Text, Heading } from '@react-email/components'

interface WelcomeEmailProps {
  name: string
  dashboardUrl: string
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to Base App!">
      <Heading style={h1}>Welcome to Base App! 🎉</Heading>
      
      <Text style={text}>Hi {name || 'there'},</Text>
      
      <Text style={text}>
        Thank you for signing up! We're excited to have you on board.
      </Text>

      <Text style={text}>
        Get started by exploring your dashboard and setting up your first project.
      </Text>

      <EmailButton href={dashboardUrl}>Go to Dashboard</EmailButton>

      <Text style={text}>
        If you have any questions, feel free to reply to this email. We're here to help!
      </Text>

      <Text style={text}>
        Best regards,
        <br />
        The Base App Team
      </Text>
    </EmailLayout>
  )
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  color: '#000000',
}

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#525f7f',
  margin: '0 0 16px',
}
```

Create `emails/PasswordResetEmail.tsx`:

```tsx
import { EmailLayout } from './components/EmailLayout'
import { EmailButton } from './components/EmailButton'
import { Text, Heading } from '@react-email/components'

interface PasswordResetEmailProps {
  resetUrl: string
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Heading style={h1}>Reset your password</Heading>
      
      <Text style={text}>
        We received a request to reset your password. Click the button below to create a new password.
      </Text>

      <EmailButton href={resetUrl}>Reset Password</EmailButton>

      <Text style={text}>
        This link will expire in 1 hour for security reasons.
      </Text>

      <Text style={text}>
        If you didn't request this, you can safely ignore this email. Your password won't be changed.
      </Text>

      <Text style={text}>
        Best regards,
        <br />
        The Base App Team
      </Text>
    </EmailLayout>
  )
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  color: '#000000',
}

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#525f7f',
  margin: '0 0 16px',
}
```

Create `emails/PaymentReceiptEmail.tsx`:

```tsx
import { EmailLayout } from './components/EmailLayout'
import { Text, Heading, Hr, Section } from '@react-email/components'

interface PaymentReceiptEmailProps {
  amount: number
  currency: string
  date: string
  plan: string
  receiptUrl: string
}

export function PaymentReceiptEmail({
  amount,
  currency,
  date,
  plan,
  receiptUrl,
}: PaymentReceiptEmailProps) {
  return (
    <EmailLayout preview={`Payment receipt for $${amount / 100}`}>
      <Heading style={h1}>Payment Receipt</Heading>
      
      <Text style={text}>
        Thank you for your payment. Here are the details:
      </Text>

      <Section style={detailsBox}>
        <Text style={detailRow}>
          <strong>Plan:</strong> {plan}
        </Text>
        <Text style={detailRow}>
          <strong>Amount:</strong> ${amount / 100} {currency.toUpperCase()}
        </Text>
        <Text style={detailRow}>
          <strong>Date:</strong> {date}
        </Text>
      </Section>

      <Text style={text}>
        <a href={receiptUrl} style={link}>
          View Receipt →
        </a>
      </Text>

      <Hr style={hr} />

      <Text style={text}>
        You can manage your subscription anytime from your billing dashboard.
      </Text>

      <Text style={text}>
        Best regards,
        <br />
        The Base App Team
      </Text>
    </EmailLayout>
  )
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  color: '#000000',
}

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#525f7f',
  margin: '0 0 16px',
}

const detailsBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '5px',
  padding: '20px',
  margin: '24px 0',
}

const detailRow = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#525f7f',
  margin: '0 0 8px',
}

const link = {
  color: '#556cd6',
  textDecoration: 'underline',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}
```

Create `emails/SubscriptionCanceledEmail.tsx`:

```tsx
import { EmailLayout } from './components/EmailLayout'
import { EmailButton } from './components/EmailButton'
import { Text, Heading } from '@react-email/components'

interface SubscriptionCanceledEmailProps {
  name: string
  planName: string
  endDate: string
  reactivateUrl: string
}

export function SubscriptionCanceledEmail({
  name,
  planName,
  endDate,
  reactivateUrl,
}: SubscriptionCanceledEmailProps) {
  return (
    <EmailLayout preview="Your subscription has been canceled">
      <Heading style={h1}>Subscription Canceled</Heading>
      
      <Text style={text}>Hi {name},</Text>
      
      <Text style={text}>
        Your <strong>{planName}</strong> subscription has been canceled.
      </Text>

      <Text style={text}>
        You'll continue to have access to all features until <strong>{endDate}</strong>.
      </Text>

      <Text style={text}>
        Changed your mind? You can reactivate your subscription anytime before {endDate}.
      </Text>

      <EmailButton href={reactivateUrl}>Reactivate Subscription</EmailButton>

      <Text style={text}>
        We're sorry to see you go. If there's anything we could have done better, 
        please let us know by replying to this email.
      </Text>

      <Text style={text}>
        Best regards,
        <br />
        The Base App Team
      </Text>
    </EmailLayout>
  )
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  color: '#000000',
}

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#525f7f',
  margin: '0 0 16px',
}
```

Create `emails/TrialEndingEmail.tsx`:

```tsx
import { EmailLayout } from './components/EmailLayout'
import { EmailButton } from './components/EmailButton'
import { Text, Heading } from '@react-email/components'

interface TrialEndingEmailProps {
  name: string
  daysLeft: number
  upgradeUrl: string
}

export function TrialEndingEmail({
  name,
  daysLeft,
  upgradeUrl,
}: TrialEndingEmailProps) {
  return (
    <EmailLayout preview={`Your trial ends in ${daysLeft} days`}>
      <Heading style={h1}>Your trial is ending soon</Heading>
      
      <Text style={text}>Hi {name},</Text>
      
      <Text style={text}>
        Your trial period will end in <strong>{daysLeft} days</strong>.
      </Text>

      <Text style={text}>
        To continue enjoying all the features without interruption, 
        upgrade to a paid plan today.
      </Text>

      <EmailButton href={upgradeUrl}>Upgrade Now</EmailButton>

      <Text style={text}>
        <strong>What happens if I don't upgrade?</strong>
        <br />
        You'll be automatically moved to our Free plan, which includes basic features.
      </Text>

      <Text style={text}>
        Questions? Reply to this email and we'll help you choose the right plan.
      </Text>

      <Text style={text}>
        Best regards,
        <br />
        The Base App Team
      </Text>
    </EmailLayout>
  )
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  color: '#000000',
}

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#525f7f',
  margin: '0 0 16px',
}
```

---

### ✅ Step 37. Create Email Helper Functions

Create `lib/emailHelpers.ts`:

```typescript
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'
import { PaymentReceiptEmail } from '@/emails/PaymentReceiptEmail'
import { SubscriptionCanceledEmail } from '@/emails/SubscriptionCanceledEmail'
import { TrialEndingEmail } from '@/emails/TrialEndingEmail'
import { sendEmail, canSendEmail } from './emails'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function sendWelcomeEmail(to: string, name: string, userId: string) {
  const canSend = await canSendEmail(userId, 'welcome')
  if (!canSend) return { success: false, reason: 'user_preferences' }

  return sendEmail({
    to,
    subject: 'Welcome to Base App! 🎉',
    react: WelcomeEmail({
      name,
      dashboardUrl: `${SITE_URL}/dashboard`,
    }),
    userId,
    emailType: 'welcome',
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: 'Reset your password',
    react: PasswordResetEmail({ resetUrl }),
    emailType: 'password_reset',
  })
}

export async function sendPaymentReceiptEmail(
  to: string,
  userId: string,
  amount: number,
  currency: string,
  plan: string,
  receiptUrl: string
) {
  return sendEmail({
    to,
    subject: `Payment receipt for $${amount / 100}`,
    react: PaymentReceiptEmail({
      amount,
      currency,
      date: new Date().toLocaleDateString(),
      plan,
      receiptUrl,
    }),
    userId,
    emailType: 'payment_receipt',
  })
}

export async function sendSubscriptionCanceledEmail(
  to: string,
  userId: string,
  name: string,
  planName: string,
  endDate: string
) {
  const canSend = await canSendEmail(userId, 'subscription_canceled')
  if (!canSend) return { success: false, reason: 'user_preferences' }

  return sendEmail({
    to,
    subject: 'Your subscription has been canceled',
    react: SubscriptionCanceledEmail({
      name,
      planName,
      endDate,
      reactivateUrl: `${SITE_URL}/dashboard/billing`,
    }),
    userId,
    emailType: 'subscription_canceled',
  })
}

export async function sendTrialEndingEmail(
  to: string,
  userId: string,
  name: string,
  daysLeft: number
) {
  const canSend = await canSendEmail(userId, 'trial_ending')
  if (!canSend) return { success: false, reason: 'user_preferences' }

  return sendEmail({
    to,
    subject: `Your trial ends in ${daysLeft} days`,
    react: TrialEndingEmail({
      name,
      daysLeft,
      upgradeUrl: `${SITE_URL}/pricing`,
    }),
    userId,
    emailType: 'trial_ending',
  })
}
```

---

### ✅ Step 38. Integrate Emails with Existing Features

**Update Stripe Webhook** (`app/api/stripe/webhooks/route.ts`):

Add email imports and update the webhook handler:

```typescript
// Add to imports
import { sendPaymentReceiptEmail, sendSubscriptionCanceledEmail } from '@/lib/emailHelpers'

// In invoice.payment_succeeded case, add:
case 'invoice.payment_succeeded': {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!subData) break

  await supabase.from('payments').insert({
    user_id: subData.user_id,
    subscription_id: subData.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    description: invoice.description || 'Subscription payment',
    receipt_url: invoice.hosted_invoice_url,
  })

  // Send payment receipt email
  const { data: user } = await supabase.auth.admin.getUserById(subData.user_id)
  if (user.user && invoice.hosted_invoice_url) {
    await sendPaymentReceiptEmail(
      user.user.email!,
      subData.user_id,
      invoice.amount_paid,
      invoice.currency,
      invoice.lines.data[0]?.description || 'Subscription',
      invoice.hosted_invoice_url
    )
  }

  break
}

// In customer.subscription.deleted case, add:
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id, plan:plans(name), current_period_end')
    .eq('stripe_customer_id', customerId)
    .single()

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  // Send cancellation email
  if (subData) {
    const { data: user } = await supabase.auth.admin.getUserById(subData.user_id)
    if (user.user) {
      await sendSubscriptionCanceledEmail(
        user.user.email!,
        subData.user_id,
        user.user.user_metadata.full_name || 'there',
        subData.plan?.name || 'Pro',
        new Date(subData.current_period_end).toLocaleDateString()
      )
    }
  }

  break
}
```

---

### ✅ Step 39. Create Email Preferences UI

Create `app/dashboard/settings/email/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/utils/constants'
import { EmailPreferencesClient } from './EmailPreferencesClient'

export default async function EmailPreferencesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  const { data: preferences } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <Layout>
      <EmailPreferencesClient preferences={preferences} />
    </Layout>
  )
}
```

Create `app/dashboard/settings/email/EmailPreferencesClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { useRouter } from 'next/navigation'

interface EmailPreferencesClientProps {
  preferences: any
}

export function EmailPreferencesClient({ preferences }: EmailPreferencesClientProps) {
  const [loading, setLoading] = useState(false)
  const [marketingEmails, setMarketingEmails] = useState(preferences?.marketing_emails ?? true)
  const [productUpdates, setProductUpdates] = useState(preferences?.product_updates ?? true)
  const router = useRouter()

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketing_emails: marketingEmails,
          product_updates: productUpdates,
        }),
      })

      if (response.ok) {
        router.refresh()
        alert('Preferences saved!')
      }
    } catch (error) {
      console.error(error)
      alert('Error saving preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold">Email Preferences</h1>

      <Card className="mt-8 p-6">
        <h2 className="text-xl font-semibold">Email Notifications</h2>
        
        <div className="mt-6 space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={marketingEmails}
              onChange={(e) => setMarketingEmails(e.target.checked)}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Marketing emails</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Receive news, tips, and special offers
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={productUpdates}
              onChange={(e) => setProductUpdates(e.target.checked)}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Product updates</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Get notified about new features and improvements
              </div>
            </div>
          </label>

          <div className="flex items-start gap-3 opacity-50">
            <input type="checkbox" checked disabled className="mt-1" />
            <div>
              <div className="font-medium">Security alerts</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Important account security notifications (cannot be disabled)
              </div>
            </div>
          </div>
        </div>

        <Button className="mt-6" onClick={handleSave} loading={loading}>
          Save Preferences
        </Button>
      </Card>
    </div>
  )
}
```

---

### ✅ Step 40. Create Email Preferences API

Create `app/api/email-preferences/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { marketing_emails, product_updates } = await request.json()

    const { error } = await supabase
      .from('email_preferences')
      .update({
        marketing_emails,
        product_updates,
      })
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### ✅ Step 41. Add Email Preview Dev Tool

Create `package.json` script for email preview:

```json
"scripts": {
  "email": "email dev -p 3001"
}
```

Run `npm run email` to preview emails at `http://localhost:3001`

---

### ✅ Step 42. Testing Checklist

**Setup:**
- [ ] Resend API key configured
- [ ] Domain verified (or using `onboarding@resend.dev` for dev)
- [ ] FROM_EMAIL and FROM_NAME set

**Template Testing:**
- [ ] Run `npm run email` to preview all templates
- [ ] Test each template with different data
- [ ] Verify mobile responsiveness
- [ ] Check dark mode rendering

**Integration Testing:**
- [ ] Welcome email sent on signup
- [ ] Password reset email works
- [ ] Payment receipt email sent after payment
- [ ] Subscription cancellation email sent
- [ ] Email preferences save correctly

**Production Testing:**
- [ ] Verify domain DNS records
- [ ] Send test emails to multiple providers (Gmail, Outlook, Yahoo)
- [ ] Check spam scores
- [ ] Verify unsubscribe link works
- [ ] Monitor email logs in database

---

### ✅ Step 43. Documentation Updates

Update environment variables section in `README.md`:

```markdown
### Email System (Resend)

1. **Setup Resend:**
   - Create account at [resend.com](https://resend.com)
   - Add and verify your domain
   - Create API key

2. **Configuration:**
   ```env
   RESEND_API_KEY=re_xxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   RESEND_FROM_NAME=Base App
   ```

3. **Preview Emails:**
   ```bash
   npm run email
   ```
   Open http://localhost:3001 to preview all email templates

4. **Email Types:**
   - Welcome email (on signup)
   - Password reset
   - Payment receipts
   - Subscription changes
   - Trial ending notifications
```

---

## 🧠 **Success Criteria**

✅ Resend integration working
✅ Beautiful email templates with React Email
✅ Transactional emails sent automatically
✅ Email preferences management
✅ Email logging for tracking
✅ Unsubscribe functionality
✅ Mobile-responsive emails
✅ Production-ready with error handling

---

---

# 🤖 **Phase 10 — AI Features (OpenAI Chat)**

## 🎯 **Goal**

Implement a complete AI chat system using OpenAI's API with streaming responses, conversation management, and usage tracking.

This adds AI-powered assistance to your app with proper rate limiting and cost management.

---

## 📋 **Overview**

**What We're Building:**
- OpenAI API integration
- Real-time streaming chat interface
- Conversation history management
- Token usage tracking
- Rate limiting per plan tier
- Cost calculation
- System prompts management

**Tech Stack:**
- **AI Provider:** OpenAI (GPT-4, GPT-3.5-turbo)
- **Streaming:** Server-Sent Events (SSE)
- **Database:** Supabase (conversations, messages, usage)
- **Rate Limiting:** Plan-based limits

**Estimated Time:** 7-10 days

---

## 🗺️ **Implementation Steps**

### ✅ Step 44. OpenAI Account Setup

**Create OpenAI Account:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up and verify email
3. Add payment method (required for API access)

**Get API Key:**
1. Dashboard → API Keys → Create new secret key
2. Copy the key (`sk-xxx`)
3. Never commit this key!

**Set Usage Limits:**
1. Dashboard → Usage limits
2. Set monthly budget (e.g., $50)
3. Enable email alerts at 80%

**Optional - Organization:**
1. Settings → Organization
2. Copy Organization ID for multi-tenant setups

---

### ✅ Step 45. Install Dependencies

```bash
npm install openai ai
```

**Packages:**
- `openai` - Official OpenAI SDK
- `ai` - Vercel AI SDK for streaming

---

### ✅ Step 46. Update Environment Variables

Add to `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_ORG_ID= # Optional
OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview
```

Add to `.env.example`:

```env
# OpenAI (Phase 10 - AI Features)
OPENAI_API_KEY=
OPENAI_ORG_ID=
OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview
```

---

### ✅ Step 47. Database Schema for AI Chat

Create `supabase/migrations/004_ai_chat.sql`:

```sql
-- Conversations table
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  title text,
  system_prompt text,
  model text not null default 'gpt-3.5-turbo',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Messages table
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_prompt integer,
  tokens_completion integer,
  model text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- AI usage tracking
create table ai_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  conversation_id uuid references conversations on delete cascade,
  model text not null,
  tokens_prompt integer not null,
  tokens_completion integer not null,
  tokens_total integer not null,
  cost_usd decimal(10,6) not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table conversations enable row level security;
alter table messages enable row level security;
alter table ai_usage enable row level security;

-- Users can view/manage their own conversations
create policy "Users can view own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

-- Users can view/manage their own messages
create policy "Users can view own messages"
  on messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on messages for insert
  with check (auth.uid() = user_id);

-- Users can view their own usage
create policy "Users can view own ai usage"
  on ai_usage for select
  using (auth.uid() = user_id);

-- Create trigger for updated_at on conversations
create trigger on_conversations_updated
  before update on conversations
  for each row execute procedure public.handle_updated_at();

-- Create indexes
create index idx_conversations_user_id on conversations(user_id);
create index idx_conversations_created_at on conversations(created_at desc);
create index idx_messages_conversation_id on messages(conversation_id);
create index idx_messages_created_at on messages(created_at);
create index idx_ai_usage_user_id on ai_usage(user_id);
create index idx_ai_usage_created_at on ai_usage(created_at desc);

-- Function to automatically generate conversation titles
create or replace function generate_conversation_title()
returns trigger as $$
begin
  if new.title is null then
    new.title = 'New Conversation ' || to_char(new.created_at, 'YYYY-MM-DD HH24:MI');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_conversation_insert_generate_title
  before insert on conversations
  for each row execute procedure generate_conversation_title();
```

Run in Supabase SQL Editor.

---

### ✅ Step 48. Create OpenAI Utilities

Create `lib/openai.ts`:

```typescript
import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
})

export const AI_MODELS = {
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    id: 'gpt-4-turbo-preview',
    contextWindow: 128000,
    costPer1kPrompt: 0.01,
    costPer1kCompletion: 0.03,
  },
  'gpt-4': {
    name: 'GPT-4',
    id: 'gpt-4',
    contextWindow: 8192,
    costPer1kPrompt: 0.03,
    costPer1kCompletion: 0.06,
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    id: 'gpt-3.5-turbo',
    contextWindow: 16385,
    costPer1kPrompt: 0.0005,
    costPer1kCompletion: 0.0015,
  },
} as const

export type AIModel = keyof typeof AI_MODELS

export function calculateCost(
  model: AIModel,
  tokensPrompt: number,
  tokensCompletion: number
): number {
  const modelConfig = AI_MODELS[model]
  const promptCost = (tokensPrompt / 1000) * modelConfig.costPer1kPrompt
  const completionCost = (tokensCompletion / 1000) * modelConfig.costPer1kCompletion
  return promptCost + completionCost
}

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for Base App. You provide clear, concise, and accurate responses to user questions. Be friendly and professional.`
```

Create `lib/chat.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateCost, type AIModel } from './openai'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export async function getConversation(
  conversationId: string,
  client: SupabaseClient
) {
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (error) throw error
  return data
}

export async function getConversationMessages(
  conversationId: string,
  client: SupabaseClient
): Promise<Message[]> {
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getUserConversations(
  userId: string,
  client: SupabaseClient
) {
  const { data, error } = await client
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data
}

export async function createConversation(
  userId: string,
  model: AIModel,
  systemPrompt: string | null,
  client: SupabaseClient
) {
  const { data, error } = await client
    .from('conversations')
    .insert({
      user_id: userId,
      model,
      system_prompt: systemPrompt,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveMessage(
  conversationId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  tokensPrompt: number | null,
  tokensCompletion: number | null,
  model: string | null,
  client: SupabaseClient
) {
  const { data, error } = await client
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
      tokens_prompt: tokensPrompt,
      tokens_completion: tokensCompletion,
      model,
    })
    .select()
    .single()

  if (error) throw error

  // Update conversation updated_at
  await client
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data
}

export async function trackAIUsage(
  userId: string,
  conversationId: string,
  model: AIModel,
  tokensPrompt: number,
  tokensCompletion: number,
  client: SupabaseClient
) {
  const tokensTotal = tokensPrompt + tokensCompletion
  const costUsd = calculateCost(model, tokensPrompt, tokensCompletion)

  const { error } = await client.from('ai_usage').insert({
    user_id: userId,
    conversation_id: conversationId,
    model,
    tokens_prompt: tokensPrompt,
    tokens_completion: tokensCompletion,
    tokens_total: tokensTotal,
    cost_usd: costUsd,
  })

  if (error) throw error
}

export async function getDailyTokenUsage(
  userId: string,
  client: SupabaseClient
): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await client
    .from('ai_usage')
    .select('tokens_total')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())

  if (error) throw error

  return data.reduce((sum, record) => sum + record.tokens_total, 0)
}

export async function canUseAI(
  userId: string,
  client: SupabaseClient
): Promise<{ allowed: boolean; usage: number; limit: number }> {
  const { getUserPlan } = await import('./subscriptions')
  const plan = await getUserPlan(userId, client)
  
  const limit = plan?.limits?.ai_tokens_per_day || 10000
  const usage = await getDailyTokenUsage(userId, client)

  return {
    allowed: limit === -1 || usage < limit,
    usage,
    limit,
  }
}
```

---

### ✅ Step 49. Create Chat API Route

Create `app/api/chat/route.ts`:

```typescript
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { openai, AI_MODELS, DEFAULT_SYSTEM_PROMPT, type AIModel } from '@/lib/openai'
import {
  getConversationMessages,
  saveMessage,
  trackAIUsage,
  canUseAI,
  createConversation,
} from '@/lib/chat'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationId, model = 'gpt-3.5-turbo' } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check rate limits
    const { allowed, usage, limit } = await canUseAI(user.id, supabase)
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Daily token limit reached',
          usage,
          limit,
        },
        { status: 429 }
      )
    }

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const conversation = await createConversation(
        user.id,
        model as AIModel,
        DEFAULT_SYSTEM_PROMPT,
        supabase
      )
      convId = conversation.id
    }

    // Get conversation history
    const messages = await getConversationMessages(convId, supabase)

    // Save user message
    await saveMessage(convId, user.id, 'user', message, null, null, null, supabase)

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Call OpenAI with streaming
    const response = await openai.chat.completions.create({
      model: AI_MODELS[model as AIModel].id,
      messages: openaiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    })

    // Convert to stream
    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        // Save assistant message
        await saveMessage(
          convId,
          user.id,
          'assistant',
          completion,
          null, // We'll need to calculate tokens
          null,
          model,
          supabase
        )

        // Track usage (approximate)
        const estimatedPromptTokens = JSON.stringify(openaiMessages).length / 4
        const estimatedCompletionTokens = completion.length / 4

        await trackAIUsage(
          user.id,
          convId,
          model as AIModel,
          Math.round(estimatedPromptTokens),
          Math.round(estimatedCompletionTokens),
          supabase
        )
      },
    })

    return new StreamingTextResponse(stream, {
      headers: {
        'X-Conversation-Id': convId,
      },
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### ✅ Step 50. Create Conversations API Routes

Create `app/api/conversations/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserConversations } from '@/lib/chat'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversations = await getUserConversations(user.id, supabase)

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

Create `app/api/conversations/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConversation, getConversationMessages } from '@/lib/chat'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversation = await getConversation(params.id, supabase)
    const messages = await getConversationMessages(params.id, supabase)

    return NextResponse.json({ conversation, messages })
  } catch (error) {
    console.error('Get conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await supabase
      .from('conversations')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### ✅ Step 51. Create Chat UI Components

Create `components/chat/ChatInterface.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { Card } from '../Card'
import { Button } from '../Button'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  conversationId?: string
  initialMessages?: Message[]
}

export function ChatInterface({ conversationId, initialMessages = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(conversationId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      // Get conversation ID from headers
      const convId = response.headers.get('X-Conversation-Id')
      if (convId && !currentConversationId) {
        setCurrentConversationId(convId)
      }

      // Stream the response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = (await reader?.read()) || {}
        if (done) break

        const chunk = decoder.decode(value)
        assistantMessage += chunk

        setMessages((prev) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1].content = assistantMessage
          return newMessages
        })
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error.message}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Card className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <h3 className="text-lg font-semibold">Start a conversation</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Ask me anything! I'm here to help.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      <div className="mt-4">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
```

Create `components/chat/ChatMessage.tsx`:

```tsx
import { cn } from '@/utils/cn'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant'
    content: string
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
```

Create `components/chat/ChatInput.tsx`:

```tsx
'use client'

import { Button } from '../Button'
import { Send } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message... (Shift+Enter for new line)"
        className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-black focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:focus:border-white"
        rows={1}
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !value.trim()} loading={isLoading}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
```

Create `components/chat/ConversationList.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '../Button'
import { Card } from '../Card'
import { Plus, Trash2 } from 'lucide-react'
import { formatRelativeTime } from '@/utils/formatDate'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      const { conversations } = await response.json()
      setConversations(conversations)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Delete this conversation?')) return

    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      setConversations((prev) => prev.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <Link href="/dashboard/chat">
          <Button size="sm" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            No conversations yet
          </div>
        ) : (
          conversations.map((conversation) => {
            const isActive = pathname === `/dashboard/chat/${conversation.id}`
            return (
              <Link
                key={conversation.id}
                href={`/dashboard/chat/${conversation.id}`}
                className={`group flex items-center justify-between rounded-lg p-3 transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  isActive ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <div className="flex-1 truncate">
                  <div className="truncate text-sm font-medium">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {formatRelativeTime(conversation.updated_at)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(conversation.id, e)}
                  className="opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </Link>
            )
          })
        )}
      </div>
    </Card>
  )
}
```

---

### ✅ Step 52. Create Chat Dashboard Pages

Create `app/dashboard/chat/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/utils/constants'
import { ChatClient } from './ChatClient'

export default async function ChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  return (
    <Layout>
      <ChatClient />
    </Layout>
  )
}
```

Create `app/dashboard/chat/ChatClient.tsx`:

```tsx
'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { ConversationList } from '@/components/chat/ConversationList'

export function ChatClient() {
  return (
    <div className="mx-auto h-[calc(100vh-200px)] max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">AI Chat</h1>

      <div className="grid h-full gap-6 lg:grid-cols-[300px,1fr]">
        <div className="hidden lg:block">
          <ConversationList />
        </div>

        <ChatInterface />
      </div>
    </div>
  )
}
```

Create `app/dashboard/chat/[id]/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { createClient } from '@/lib/supabase/server'
import { getConversation, getConversationMessages } from '@/lib/chat'
import { ROUTES } from '@/utils/constants'
import { ConversationClient } from './ConversationClient'

export default async function ConversationPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  const conversation = await getConversation(params.id, supabase)
  const messages = await getConversationMessages(params.id, supabase)

  return (
    <Layout>
      <ConversationClient
        conversationId={conversation.id}
        initialMessages={messages}
      />
    </Layout>
  )
}
```

Create `app/dashboard/chat/[id]/ConversationClient.tsx`:

```tsx
'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { ConversationList } from '@/components/chat/ConversationList'

interface ConversationClientProps {
  conversationId: string
  initialMessages: any[]
}

export function ConversationClient({
  conversationId,
  initialMessages,
}: ConversationClientProps) {
  return (
    <div className="mx-auto h-[calc(100vh-200px)] max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">AI Chat</h1>

      <div className="grid h-full gap-6 lg:grid-cols-[300px,1fr]">
        <div className="hidden lg:block">
          <ConversationList />
        </div>

        <ChatInterface
          conversationId={conversationId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  )
}
```

---

### ✅ Step 53. Add Usage Dashboard

Create `app/dashboard/usage/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscriptions'
import { getDailyTokenUsage } from '@/lib/chat'
import { ROUTES } from '@/utils/constants'
import { UsageClient } from './UsageClient'

export default async function UsagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  const [plan, dailyUsage, usageHistory] = await Promise.all([
    getUserPlan(user.id, supabase),
    getDailyTokenUsage(user.id, supabase),
    supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <Layout>
      <UsageClient
        plan={plan}
        dailyUsage={dailyUsage}
        usageHistory={usageHistory.data || []}
      />
    </Layout>
  )
}
```

Create `app/dashboard/usage/UsageClient.tsx`:

```tsx
'use client'

import { Card } from '@/components/Card'
import { formatDate } from '@/utils/formatDate'

interface UsageClientProps {
  plan: any
  dailyUsage: number
  usageHistory: any[]
}

export function UsageClient({ plan, dailyUsage, usageHistory }: UsageClientProps) {
  const limit = plan?.limits?.ai_tokens_per_day || 10000
  const usagePercent = limit === -1 ? 0 : (dailyUsage / limit) * 100

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">AI Usage</h1>

      {/* Daily Usage */}
      <Card className="mt-8 p-6">
        <h2 className="text-xl font-semibold">Today's Usage</h2>

        <div className="mt-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">
                {dailyUsage.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                of {limit === -1 ? 'Unlimited' : limit.toLocaleString()} tokens
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Plan: {plan?.name || 'Free'}
              </div>
            </div>
          </div>

          {limit !== -1 && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div
                  className="h-full bg-black transition-all dark:bg-white"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {usagePercent.toFixed(1)}% used
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Usage History */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Usage History</h2>

        <Card className="mt-4">
          {usageHistory.length === 0 ? (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              No usage history yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {usageHistory.map((usage) => (
                    <tr key={usage.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {formatDate(usage.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {usage.model}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {usage.tokens_total.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        ${usage.cost_usd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
```

---

### ✅ Step 54. Install Required Icons

```bash
npm install lucide-react
```

---

### ✅ Step 55. Update Constants

Update `utils/constants.ts`:

```typescript
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  PRICING: '/pricing',
  BILLING: '/dashboard/billing',
  CHAT: '/dashboard/chat',
  USAGE: '/dashboard/usage',
} as const
```

---

### ✅ Step 56. Testing Checklist

**Setup:**
- [ ] OpenAI API key configured
- [ ] Usage limits set in OpenAI dashboard
- [ ] Database migrations run

**Functionality Testing:**
- [ ] Can start new conversation
- [ ] Messages stream in real-time
- [ ] Conversation history persists
- [ ] Can switch between conversations
- [ ] Can delete conversations
- [ ] Rate limiting works correctly
- [ ] Usage tracking updates
- [ ] Cost calculation accurate

**UI Testing:**
- [ ] Chat interface responsive
- [ ] Markdown rendering works
- [ ] Code blocks display correctly
- [ ] Streaming animation smooth
- [ ] Conversation list updates
- [ ] Loading states show

**Integration Testing:**
- [ ] Plan-based limits enforced
- [ ] Free users limited correctly
- [ ] Pro users have higher limits
- [ ] Enterprise users unlimited
- [ ] Usage resets daily
- [ ] Error handling works

---

### ✅ Step 57. Add Rate Limit Warning Component

Create `components/chat/RateLimitWarning.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '../Card'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../Button'

interface RateLimitWarningProps {
  usage: number
  limit: number
}

export function RateLimitWarning({ usage, limit }: RateLimitWarningProps) {
  const percent = (usage / limit) * 100

  if (limit === -1 || percent < 80) return null

  return (
    <Card className="mb-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
            {percent >= 100
              ? 'Daily Limit Reached'
              : 'Approaching Daily Limit'}
          </h3>
          <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
            {percent >= 100
              ? 'You've used all your tokens for today. Upgrade your plan for more.'
              : `You've used ${percent.toFixed(0)}% of your daily token limit.`}
          </p>
          {percent >= 90 && (
            <Link href="/pricing" className="mt-2 inline-block">
              <Button size="sm" variant="outline">
                Upgrade Plan
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
```

---

### ✅ Step 58. Documentation Updates

Update `README.md` with AI Chat section:

```markdown
### AI Chat (OpenAI)

This template includes an AI-powered chat interface:

1. **Setup OpenAI:**
   - Create account at [platform.openai.com](https://platform.openai.com)
   - Add payment method
   - Create API key
   - Set usage limits

2. **Configuration:**
   ```env
   OPENAI_API_KEY=sk-xxx
   OPENAI_ORG_ID= # Optional
   OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview
   ```

3. **Features:**
   - Real-time streaming responses
   - Conversation history
   - Multiple AI models (GPT-4, GPT-3.5)
   - Token usage tracking
   - Cost calculation
   - Plan-based rate limiting

4. **Usage Limits:**
   - Free: 10,000 tokens/day
   - Pro: 100,000 tokens/day
   - Enterprise: Unlimited

5. **Cost Management:**
   - Track token usage in real-time
   - Set budgets in OpenAI dashboard
   - Monitor costs per conversation
```

---

## 🧠 **Success Criteria**

✅ OpenAI integration working
✅ Real-time streaming chat interface
✅ Conversation management (create, view, delete)
✅ Token usage tracking
✅ Cost calculation accurate
✅ Plan-based rate limiting enforced
✅ Usage dashboard showing history
✅ Mobile-responsive chat UI
✅ Markdown rendering in messages
✅ Production-ready with error handling

---

## 📈 **Final Summary**

Congratulations! After completing all 3 phases, you now have:

### **Phase 8 - Monetization ✅**
- Complete Stripe subscription system
- 3-tier pricing (Free, Pro, Enterprise)
- Customer billing portal
- Payment webhooks
- Subscription management

### **Phase 9 - Email System ✅**
- Resend integration
- Beautiful React Email templates
- Transactional emails (welcome, receipts, etc.)
- Email preferences management
- Email tracking

### **Phase 10 - AI Features ✅**
- OpenAI chat integration
- Streaming responses
- Conversation management
- Usage tracking & cost calculation
- Plan-based rate limiting

---

## 🚀 **Your Complete SaaS Starter**

You now have a production-ready SaaS starter with:
- ✅ Authentication (Google OAuth + Email/Password)
- ✅ Database (Supabase with RLS)
- ✅ Payments (Stripe subscriptions)
- ✅ Emails (Resend + React Email)
- ✅ AI Chat (OpenAI with streaming)
- ✅ Beautiful UI (Tailwind CSS + Dark mode)
- ✅ Type-safe (TypeScript strict mode)
- ✅ Production-ready (Error handling, rate limiting)

**Total Implementation Time:** ~3-4 weeks

**What's Next?**
- Clone this for new projects
- Customize AI system prompts
- Add more email templates
- Create additional subscription tiers
- Build your specific features on top

---

**Happy Building! 🎉**