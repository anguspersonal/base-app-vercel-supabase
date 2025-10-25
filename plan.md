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
  npm install @supabase/supabase-js
  ```
* Create `lib/supabaseClient.ts`:

  ```ts
  import { createClient } from '@supabase/supabase-js'

  export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  ```

---

## 🧩 **Phase 2 — Core Architecture**

### ✅ Step 4. Folder Structure Setup

Implement:

```
/app
  /layout.tsx
  /page.tsx
  /dashboard/page.tsx
/lib
  supabaseClient.ts
  auth.ts
/components
  Navbar.tsx
  Button.tsx
/styles
  globals.css
/public
  logo.svg
```

### ✅ Step 5. Create Auth Helpers

* `lib/auth.ts`:

  ```ts
  import { createServerClient } from '@supabase/auth-helpers-nextjs'
  import { cookies } from 'next/headers'

  export const getServerSupabase = () =>
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    )
  ```

### ✅ Step 6. Add Authentication UI

* Install Auth Helpers:

  ```bash
  npm install @supabase/auth-helpers-nextjs
  ```

* Add `/app/login/page.tsx`:

  ```tsx
  import { createClient } from '@/lib/supabaseClient'

  export default function Login() {
    const supabase = createClient()
    const handleSignIn = async () => {
      await supabase.auth.signInWithOAuth({ provider: 'google' })
    }
    return <button onClick={handleSignIn}>Sign in with Google</button>
  }
  ```

* Add `/app/dashboard/page.tsx` as a protected route that checks session.

---

## 🗄️ **Phase 3 — Database Setup**

### ✅ Step 7. Create Default Tables

Run in Supabase SQL editor:

```sql
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

### ✅ Step 8. Add Database Utilities

`lib/db.ts`:

```ts
import { supabase } from './supabaseClient'

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}
```

---

## 🎨 **Phase 4 — UI & Layout**

### ✅ Step 9. Add Basic Layout

* Add `/app/layout.tsx` with a shared Navbar, metadata, and global styles.
* Include conditionally rendered “Login / Logout” buttons.

### ✅ Step 10. Implement Theming (Optional)

Install and configure **Mantine** or **Tailwind**:

```bash
npm install @mantine/core @mantine/hooks
```

or

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## ☁️ **Phase 5 — Deployment & Testing**

### ✅ Step 11. Deploy to Vercel

* Commit to GitHub → automatic deploy
* Configure environment variables on Vercel
* Test auth flow → ensure redirect works correctly

### ✅ Step 12. Test Database Operations

* Create a dummy profile in Supabase Studio
* Query via your `/dashboard` route
* Validate RLS (Row-Level Security) rules on `profiles` table

---

## 🧱 **Phase 6 — Template Finalization**

### ✅ Step 13. Add Base Components

* Example components:

  * `Navbar.tsx`
  * `Card.tsx`
  * `Form.tsx`
* Export from `components/index.ts`

### ✅ Step 14. Add Utilities

Add reusables:

```
/utils
  fetcher.ts
  formatDate.ts
  constants.ts
```

### ✅ Step 15. Add Scripts for Cloning

In `package.json`:

```json
"scripts": {
  "setup": "cp .env.example .env.local && echo '✅ .env.local created'"
}
```

---

## 🔁 **Phase 7 — Reuse Workflow**

### ✅ Step 16. Clone & Reuse Pattern

When starting a new project:

```bash
git clone https://github.com/angushally/base-app-vercel-supabase new-project
cd new-project
rm -rf .git
npm install
npm run setup
```

Then:

1. Rename in `package.json`
2. Create new Supabase project → update env vars
3. Push to new GitHub repo → link to Vercel

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

--