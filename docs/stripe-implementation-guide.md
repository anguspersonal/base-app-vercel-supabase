# 💳 Stripe Implementation Guide

> **Detailed implementation guide for Phase 8 of the Base App**
>
> For overview and setup steps, see [docs/plan.md](plan.md#phase-8--monetization-stripe-integration)
>
> For official Stripe documentation, see [docs/stripe-instructions-filtered.md](stripe-instructions-filtered.md)

---

## Quick Reference

**What We're Building:**
- Stripe Checkout (hosted page - easiest, most secure)
- Customer billing portal
- Webhook handling for subscription events
- 3-tier pricing (Free, Pro, Enterprise)

**Key Files Created:**
- `lib/stripe.ts` - Stripe client initialization
- `lib/subscriptions.ts` - Database helpers for subscriptions
- `app/api/stripe/checkout/route.ts` - Create checkout session
- `app/api/stripe/portal/route.ts` - Open customer portal
- `app/api/stripe/webhooks/route.ts` - Handle Stripe events
- `components/PricingCard.tsx` - Pricing UI component
- `app/pricing/page.tsx` - Pricing page
- `app/dashboard/billing/page.tsx` - Billing dashboard

---

## Database Schema

**File:** `supabase/migrations/002_subscriptions.sql`

```sql
-- Plans table (stores your pricing tiers)
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

-- Subscriptions table (tracks user subscriptions)
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null unique,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  plan_id uuid references plans,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Payments table (payment history)
create table payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  subscription_id uuid references subscriptions,
  stripe_payment_intent_id text unique not null,
  amount integer not null, -- cents
  currency text default 'usd' not null,
  status text not null,
  description text,
  receipt_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table payments enable row level security;

-- Policies
create policy "Plans are viewable by everyone"
  on plans for select using (true);

create policy "Users can view own subscription"
  on subscriptions for select using (auth.uid() = user_id);

create policy "Users can view own payments"
  on payments for select using (auth.uid() = user_id);

-- Triggers
create trigger on_subscriptions_updated
  before update on subscriptions
  for each row execute procedure public.handle_updated_at();

create trigger on_plans_updated
  before update on plans
  for each row execute procedure public.handle_updated_at();

-- Insert default plans
insert into plans (name, slug, description, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, features, limits, sort_order) values
('Free', 'free', 'Perfect for getting started', 0, 0, null, null,
 '["Basic features", "Community support", "1 project"]'::jsonb,
 '{"projects": 1, "ai_tokens_per_day": 10000, "storage_gb": 1}'::jsonb, 1),
('Pro', 'pro', 'For professionals and growing teams', 2900, 29000, 'price_xxx_monthly', 'price_xxx_yearly',
 '["All Free features", "Priority support", "10 projects", "Advanced analytics"]'::jsonb,
 '{"projects": 10, "ai_tokens_per_day": 100000, "storage_gb": 10}'::jsonb, 2),
('Enterprise', 'enterprise', 'For large organizations', 9900, 99000, 'price_xxx_monthly', 'price_xxx_yearly',
 '["All Pro features", "24/7 support", "Unlimited projects", "Custom integrations", "SLA"]'::jsonb,
 '{"projects": -1, "ai_tokens_per_day": -1, "storage_gb": 100}'::jsonb, 3);

-- Indexes
create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_stripe_customer_id on subscriptions(stripe_customer_id);
create index idx_payments_user_id on payments(user_id);
create index idx_payments_subscription_id on payments(subscription_id);
```

**After running migration, update Price IDs:**
```sql
UPDATE plans SET 
  stripe_price_id_monthly = 'price_xxx',  -- Your actual Pro monthly Price ID
  stripe_price_id_yearly = 'price_xxx'    -- Your actual Pro yearly Price ID
WHERE slug = 'pro';

UPDATE plans SET 
  stripe_price_id_monthly = 'price_xxx',  -- Your actual Enterprise monthly Price ID
  stripe_price_id_yearly = 'price_xxx'    -- Your actual Enterprise yearly Price ID
WHERE slug = 'enterprise';
```

---

## Utilities & Helpers

### `lib/stripe.ts`

```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
})

export const STRIPE_PLANS = {
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

### `lib/subscriptions.ts`

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
    if (error.code === 'PGRST116') return null
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
    return getFreePlan(client)
  }

  const { data, error} = await client
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

export async function hasActiveSubscription(
  userId: string,
  client: SupabaseClient
): Promise<boolean> {
  const subscription = await getUserSubscription(userId, client)
  return subscription?.status === 'active' || subscription?.status === 'trialing'
}
```

### `utils/featureGates.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscriptions'
import { redirect } from 'next/navigation'
import { ROUTES } from './constants'

export async function requirePlan(
  requiredPlan: 'free' | 'pro' | 'enterprise'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.LOGIN)

  const plan = await getUserPlan(user.id, supabase)

  const planHierarchy = { free: 0, pro: 1, enterprise: 2 }
  const userPlanLevel = planHierarchy[plan?.slug as keyof typeof planHierarchy] || 0
  const requiredPlanLevel = planHierarchy[requiredPlan]

  if (userPlanLevel < requiredPlanLevel) {
    redirect(ROUTES.PRICING)
  }

  return { user, plan }
}
```

---

## API Routes

### `app/api/stripe/checkout/route.ts`

**Purpose:** Create Stripe Checkout Session

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId } = await request.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
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
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase.from('subscriptions').insert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'incomplete',
      })
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${request.headers.get('origin')}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/pricing?canceled=true`,
      subscription_data: { billing_mode: 'flexible' },
      metadata: { user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### `app/api/stripe/portal/route.ts`

**Purpose:** Open Stripe Customer Portal

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { getUserSubscription } from '@/lib/subscriptions'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getUserSubscription(user.id, supabase)

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${request.headers.get('origin')}/dashboard/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### `app/api/stripe/webhooks/route.ts`

**Purpose:** Handle Stripe webhook events

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
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
          .update({ stripe_subscription_id: session.subscription as string, status: 'active' })
          .eq('user_id', userId)
        break
      }

      case 'invoice.paid': {
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
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', invoice.customer as string)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('stripe_customer_id', subscription.customer as string)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id, plan_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!subData) break

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
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
```

---

## Components

### `components/PricingCard.tsx`

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
    <Card className={`relative flex flex-col ${isPopular ? 'border-2 border-black dark:border-white' : 'border border-gray-200 dark:border-gray-800'}`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-black px-4 py-1 text-sm font-medium text-white dark:bg-white dark:text-black">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-2xl font-bold">{name}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>

        <div className="mt-6">
          <span className="text-4xl font-bold">{displayPrice}</span>
          {price > 0 && <span className="text-gray-600 dark:text-gray-400">{interval}</span>}
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
              <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
```

### `components/SubscriptionBadge.tsx`

```tsx
interface SubscriptionBadgeProps {
  planName: string
}

export function SubscriptionBadge({ planName }: SubscriptionBadgeProps) {
  const colors = {
    Free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    Pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colors[planName as keyof typeof colors] || colors.Free}`}>
      {planName}
    </span>
  )
}
```

---

## Pages

### `app/pricing/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { PricingCard } from '@/components/PricingCard'
import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
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
        alert('Error creating checkout session')
        return
      }

      if (url) router.push(url)
    } catch (error) {
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
      priceIdMonthly: '',
      priceIdYearly: '',
      features: ['Basic features', 'Community support', '1 project', '1GB storage', '10K AI tokens/day'],
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'For professionals and growing teams',
      priceMonthly: 2900,
      priceYearly: 29000,
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY!,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY!,
      features: ['All Free features', 'Priority support', '10 projects', '10GB storage', '100K AI tokens/day', 'Advanced analytics'],
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
      features: ['All Pro features', '24/7 support', 'Unlimited projects', '100GB storage', 'Unlimited AI tokens', 'Custom integrations', 'SLA'],
    },
  ]

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Choose the plan that's right for you</p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-12 flex justify-center">
          <div className="relative flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button onClick={() => setBillingInterval('monthly')} className={`relative rounded-md px-6 py-2 text-sm font-medium transition ${billingInterval === 'monthly' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
              Monthly
            </button>
            <button onClick={() => setBillingInterval('yearly')} className={`relative rounded-md px-6 py-2 text-sm font-medium transition ${billingInterval === 'yearly' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
              Yearly
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">Save 17%</span>
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
              onSubscribe={() => handleSubscribe(billingInterval === 'monthly' ? plan.priceIdMonthly : plan.priceIdYearly, plan.slug)}
              loading={loading === plan.slug}
            />
          ))}
        </div>
      </div>
    </Layout>
  )
}
```

### `app/dashboard/billing/page.tsx` & `BillingClient.tsx`

See full implementation in the condensed plan - includes:
- Current plan display with badge
- Manage Billing button (opens Stripe portal)
- Payment history table
- Feature list

---

## Subscription Status Lifecycle

| Status | Description | Action |
|--------|-------------|--------|
| `incomplete` | Subscription created, first payment pending | Wait for payment |
| `incomplete_expired` | First payment failed after all retries | Don't provision access |
| `trialing` | In trial period, no payment yet | Provision access |
| `active` | Payment succeeded, subscription active | ✅ Provision access |
| `past_due` | Payment failed, retrying | ⚠️ Keep access, notify user |
| `canceled` | Subscription canceled | ❌ Revoke access |
| `unpaid` | Payment failed after all retries | ❌ Revoke access |

---

## Testing

### Test Cards

| Scenario | Card Number | Result |
|----------|-------------|--------|
| Success (no auth) | `4242 4242 4242 4242` | Payment succeeds immediately |
| Requires authentication | `4000 0025 0000 3155` | Triggers 3D Secure flow |
| Declined (insufficient funds) | `4000 0000 0000 9995` | Payment fails |

### Webhook Testing with Stripe CLI

```bash
# Install and authenticate
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

---

## Resources

- [Stripe Billing Quickstart](https://docs.stripe.com/billing/quickstart)
- [Build Subscriptions](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Webhook Testing](https://docs.stripe.com/webhooks/test)
- [Stripe CLI](https://docs.stripe.com/stripe-cli)
- [Sample Code](https://github.com/stripe-samples/checkout-single-subscription)

