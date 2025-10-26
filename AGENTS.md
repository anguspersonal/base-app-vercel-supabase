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
