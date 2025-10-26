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
- Use `@supabase/supabase-js` client (client-side auth)
- Client instance: `lib/supabaseClient.ts`
- OAuth redirect: `/api/auth/callback` (Route Handler)
- Protected routes: Check session in `useEffect` or use `proxy.ts` middleware

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
```

## Pre-Commit Checklist
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] No linter errors
- [ ] Auth flows tested manually

## Common Pitfalls
1. **Missing 'use client'** → Hooks/state won't work in server components
2. **Wrong callback URL** → OAuth will fail, use `/api/auth/callback`
3. **Skipping type check** → Build will fail on Vercel
4. **Hardcoded URLs** → Use `process.env.NEXT_PUBLIC_SITE_URL`

## Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anon key
NEXT_PUBLIC_SITE_URL=            # Your site URL (for OAuth redirects)
```
