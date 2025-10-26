# AGENTS.md

Next.js 16 + Supabase authentication starter.

**📋 Implementation Note:** This project has detailed implementation plans in `plan.md` (Phases 8-10). When implementing features, follow the incremental workflow guidelines in the "Implementation Workflow" section below.

## Stack
- **Next.js** 16.0.0 (React 19.2.0, React Compiler enabled)
- **Supabase** Auth with OAuth (Google + Email/Password)
- **TypeScript** strict mode
- **Tailwind CSS** v4
- **Vercel** deployment

## Commands
```bash
npm install           # Install dependencies
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build (must pass)
npx tsc --noEmit     # Type check (run before commit)
```

## Critical Rules

### Authentication
- Use `@supabase/ssr` for SSR-safe cookie handling
- Server components: `createClient()` from `lib/supabase/server.ts`
- Client components: `createClient()` from `lib/supabase/client.ts`
- OAuth redirect: `/auth/callback` (Route Handler)
- Protected routes: Server-side redirect in page or `proxy.ts` middleware

### TypeScript
- **Strict mode enforced** - resolve all type errors before commit
- Use proper types for Supabase queries
- No `any` types without justification

### Next.js Patterns
- Client components: Mark with `'use client'`
- Server components: Keep `.tsx`, no JSX in `.ts` files
- Use `@/` import alias for cleaner imports

### Styling
- Tailwind CSS v4 - modern utilities
- Dark mode support with `dark:` prefix
- Component library: `components/` (Button, Card, Form)

## File Structure
```
/app
  /login            # Public auth page
  /dashboard        # Protected dashboard
  /api/auth/callback  # OAuth callback (route.ts)
/lib
  supabaseClient.ts   # Supabase client
  auth.ts            # Auth helpers
  db.ts              # Database queries
/components          # Reusable UI components
/utils               # Helper functions
proxy.ts             # Route protection middleware
```

## Common Patterns

### Server Component (Protected Page)
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  return <div>Welcome {user.email}</div>
}
```

### Client Component (Auth Actions)
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const supabase = createClient()
  
  const handleLogin = async () => {
    // window.location.origin automatically uses the current domain
    const redirectTo = `${window.location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
  }
}
```

### Database Queries
```typescript
// Pass client instance to db functions
import { getProfile } from '@/lib/db'

const supabase = await createClient()
const profile = await getProfile(userId, supabase)
```

## Pre-Commit Checklist
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] No linter errors
- [ ] Auth flows tested manually

## Common Pitfalls
1. **Missing 'use client'** → Hooks/state won't work in server components
2. **Wrong callback URL** → OAuth will fail, use `/auth/callback` and whitelist it in Supabase dashboard
3. **Forgetting `await`** → Server functions must await `createClient()`
4. **Wrong client import** → Use `lib/supabase/server` in server, `lib/supabase/client` in client
5. **Skipping type check** → Build will fail on Vercel
6. **Redirect URL not whitelisted** → Add `http://localhost:3000/auth/callback` (dev) and `https://your-domain.com/auth/callback` (prod) to Supabase Authentication → URL Configuration

## Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anon key
```

**Note:** OAuth redirects use `window.location.origin` in client components, so no site URL environment variable is needed.

## Next.js 16 + SSR Notes
- **Always `await createClient()`** in server components and route handlers
- **Use correct client**: Server functions use `lib/supabase/server`, client components use `lib/supabase/client`
- **Cookie handling**: `@supabase/ssr` handles cookies automatically with `getAll()`/`setAll()`
- **Route protection**: Use `proxy.ts` middleware (NOT `middleware.ts` - deprecated in Next.js 16)
- Server components must be `async` when calling Supabase

---

## 🚀 Implementation Workflow (plan.md)

### Overview
This project has a detailed implementation plan in `plan.md` covering:
- **Phase 8**: Monetization (Stripe)
- **Phase 9**: Email System (Resend + React Email)
- **Phase 10**: AI Features (OpenAI Chat)

### Critical Rules for Implementation

#### 1. Work One Module at a Time
- **NEVER** implement multiple steps/modules simultaneously
- Complete one logical module (e.g., database schema, API route, UI component) before moving to the next
- Each module should be a complete, testable unit

#### 2. Test Locally Before Proceeding
When practical, always test the module before moving on:
```bash
# After implementing a module, test it:
npm run dev              # Start dev server
npx tsc --noEmit        # Type check
npm run build           # Ensure build passes
```

**Test Examples:**
- API route → Test with Postman/browser
- UI component → View in browser, test interactions
- Database schema → Verify in Supabase dashboard
- Integration → Test end-to-end flow

#### 3. External Setup Steps - STOP and ASK
For steps requiring external setup or credentials, **STOP** and ask the user to complete:

**Examples of STOP steps:**
- ❌ Stripe account creation & API keys
- ❌ Resend account setup & domain verification
- ❌ OpenAI account & API key
- ❌ Supabase table creation (if user prefers manual)
- ❌ Environment variable setup (ask user to add)
- ❌ Webhook endpoint configuration
- ❌ DNS record updates

**How to handle STOP steps:**
```
🛑 STOP: External Setup Required

Step X requires external setup that you must complete:

1. Go to [service.com] and create an account
2. Navigate to Settings → API Keys
3. Create a new API key
4. Copy the key and add to .env.local:
   STRIPE_SECRET_KEY=your_key_here

Once complete, let me know and I'll continue with Step Y.
```

**DO NOT:**
- Mark the step as complete without user confirmation
- Assume credentials exist
- Use placeholder/dummy credentials
- Skip external setup steps

#### 4. Incremental Commit Strategy
After each working module:
1. Test locally ✅
2. Type check passes ✅
3. Build succeeds ✅
4. **Suggest commit** (but don't execute):
   ```
   ✅ Module Complete: [Name]
   
   Suggested commit:
   git add .
   git commit -m "feat: implement [module name]"
   
   Ready to proceed with next step? [Yes/No]
   ```

#### 5. Module Size Guidelines
**Good module size (1 step or small logical unit):**
- ✅ Single database table with RLS policies
- ✅ One API route
- ✅ One UI component
- ✅ Related helper functions (e.g., all email helpers)
- ✅ One page component with its client component

**Too large (split into smaller modules):**
- ❌ Entire Phase 8 at once
- ❌ All API routes together
- ❌ All UI components together

#### 6. Error Handling & Rollback
If a module fails:
1. **Stop immediately** - don't proceed to next step
2. **Identify the issue** - read error messages
3. **Fix the current module** - don't add more code
4. **Test again** - ensure it works before moving on
5. **If stuck** - ask user for help rather than guessing

#### 7. Dependencies Between Modules
Some modules depend on others:
- Database schema BEFORE API routes
- API routes BEFORE UI components
- Environment variables BEFORE testing integrations

**Always respect dependencies:**
```
Step 20: Database Schema ← Do this first
  ↓
Step 21: API Route ← Then this
  ↓
Step 22: UI Component ← Finally this
```

### Example Workflow

**User:** "Let's implement Phase 8, Step 20 (Database Schema)"

**Agent Response:**
```
✅ Implementing Step 20: Database Schema for Subscriptions

I'll create the database migration file:
- Plans table (3 tiers: Free, Pro, Enterprise)
- Subscriptions table (user subscription tracking)
- Payments table (payment history)
- RLS policies for security
- Indexes for performance

[Implements the code...]

✅ Code created: supabase/migrations/002_subscriptions.sql

🛑 STOP: Manual Database Migration Required

Before proceeding, you need to:
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of supabase/migrations/002_subscriptions.sql
3. Run the SQL
4. Verify tables created successfully

Once complete, we'll test with Step 21 (API routes).
Shall I proceed to Step 21 after you confirm? [Yes/No]
```

**User:** "Yes, migration complete"

**Agent Response:**
```
✅ Proceeding to Step 21: Stripe API Routes

I'll create:
- /api/stripe/checkout/route.ts (create checkout session)
- /api/stripe/portal/route.ts (customer portal)
- /api/stripe/webhooks/route.ts (handle events)

[Implements the code...]

✅ Code created: All 3 API routes

⚠️ Testing Required:
1. Start dev server: npm run dev
2. Test type checking: npx tsc --noEmit
3. Verify build: npm run build

Testing cannot be completed yet because:
- Stripe API keys not configured (Step 17)
- Webhook endpoint needs Stripe CLI

Suggested commit:
git add app/api/stripe
git commit -m "feat: add stripe API routes (checkout, portal, webhooks)"

Ready for Step 22 (UI components) or should we configure Stripe first?
```

### Quick Reference: When to STOP vs Continue

| Situation | Action |
|-----------|--------|
| Creating files/code | ✅ Continue |
| Running tests locally | ✅ Continue |
| Type checking | ✅ Continue |
| Building project | ✅ Continue |
| Installing npm packages | ✅ Continue (with user's memory preference) |
| Database migrations | 🛑 STOP - Ask user to run |
| External API keys | 🛑 STOP - Ask user to configure |
| Account creation | 🛑 STOP - User must do |
| DNS records | 🛑 STOP - User must configure |
| Webhook URLs | 🛑 STOP - User must whitelist |
| Testing external APIs | ⚠️ Continue but note limitations |

### Communication Template

When completing a module:
```
✅ Module Complete: [Module Name]

What was implemented:
- [File 1]: [Description]
- [File 2]: [Description]

Testing performed:
- ✅ Type check passed
- ✅ Build succeeded
- ✅ [Manual test description]

Next step: [Step X - Name]
Dependencies needed: [List any required setup]

Proceed? [Yes/No]
```

### Key Principles
1. **Safety first** - test before moving on
2. **One thing at a time** - focus on current module
3. **Stop at blockers** - don't guess or skip external setup
4. **Communicate clearly** - explain what was done and what's next
5. **Respect the user** - they control external services and commits