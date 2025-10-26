# AGENTS.md

Next.js 16 + Supabase authentication starter.

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

<<<<<<< HEAD
### Client-Side Auth Check
```typescript
'use client'
import { supabase } from '@/lib/supabaseClient'

const { data: { session } } = await supabase.auth.getSession()
if (!session) router.push('/login')
```

### OAuth Flow
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`
  }
})
```

### Database Query
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
=======
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
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
2. **Wrong callback URL** → OAuth will fail, use `/auth/callback`
3. **Forgetting `await`** → Server functions must await `createClient()`
4. **Wrong client import** → Use `lib/supabase/server` in server, `lib/supabase/client` in client
5. **Skipping type check** → Build will fail on Vercel
6. **Hardcoded URLs** → Use `process.env.NEXT_PUBLIC_SITE_URL`

## Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anon key
NEXT_PUBLIC_SITE_URL=            # Your site URL (for OAuth redirects)
```

## Next.js 16 + SSR Notes
- **Always `await createClient()`** in server components and route handlers
- **Use correct client**: Server functions use `lib/supabase/server`, client components use `lib/supabase/client`
- **Cookie handling**: `@supabase/ssr` handles cookies automatically with `getAll()`/`setAll()`
- **Route protection**: Use `proxy.ts` middleware (NOT `middleware.ts` - deprecated in Next.js 16)
- Server components must be `async` when calling Supabase
