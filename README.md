# 🧱 Base App — Vercel + Supabase + Next.js

A reusable **full-stack starter** built with [Next.js](https://nextjs.org), [Supabase](https://supabase.com), and deployed on [Vercel](https://vercel.com).  
Designed for rapid prototyping and scalable production apps with minimal setup.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/angushally/base-app-vercel-supabase)

---

## 🚀 Overview

**Tech Stack**
- **Frontend:** Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- **Backend:** Next.js API routes + Supabase Edge Functions (serverless)
- **Database:** Supabase (PostgreSQL, hosted)
- **Auth:** Supabase Auth (JWT sessions + Google OAuth)
- **Storage:** Supabase Storage (file buckets)
- **Deployment:** Vercel (auto deploys from GitHub)
- **Environment Management:** `.env.local` and `.env.example`

**Core Goals**
1. ✅ Zero-config deploy to Vercel
2. ✅ Secure, extensible Supabase integration
3. ✅ Reusable project architecture (for any future app)
4. ✅ Clear local-to-production parity

---

## 🧩 Folder Structure

```
base-app-vercel-supabase/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── health/              # Health check endpoint
│   ├── dashboard/               # Protected dashboard page
│   ├── login/                   # Authentication page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout with Navbar
│   └── page.tsx                 # Homepage
├── components/                   # Reusable UI components
│   ├── Button.tsx               # Button component
│   ├── Card.tsx                 # Card components
│   ├── Form.tsx                 # Form components
│   ├── Navbar.tsx               # Navigation component
│   └── index.ts                 # Component exports
├── lib/                         # Core utilities
│   ├── auth.ts                  # Server-side auth helpers
│   ├── db.ts                    # Database utilities
│   └── supabaseClient.ts        # Client-side Supabase
├── utils/                       # Utility functions
│   ├── cn.ts                    # Class name utility
│   ├── constants.ts             # App constants
│   ├── fetcher.ts               # API fetch utilities
│   └── formatDate.ts            # Date formatting
├── supabase/                    # Database schema
│   └── schema.sql               # SQL schema and policies
├── .env.example                 # Environment variables template
├── .env.local                   # Local environment variables
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/angushally/base-app-vercel-supabase my-app
cd my-app
rm -rf .git  # Remove git history to start fresh
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up Environment Variables

```bash
npm run setup
# or manually copy
cp .env.example .env.local
```

Then edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`
3. Enable Google OAuth in Authentication > Providers
4. Copy your project URL and keys to `.env.local`

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

---

## 🚀 Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/angushally/base-app-vercel-supabase)

### Option 2: Manual Deploy

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add your environment variables in Vercel dashboard
4. Deploy! 🎉

---

## 🧩 Features

### ✅ Authentication
- Google OAuth integration
- JWT session management
- Protected routes
- User profile management
- Automatic user creation

### ✅ Database
- PostgreSQL with Supabase
- Real-time subscriptions
- Row-level security (RLS)
- Type-safe queries
- Automatic migrations

### ✅ UI Components
- Reusable component library
- Tailwind CSS styling
- Dark mode support
- Responsive design
- Loading states

### ✅ Developer Experience
- TypeScript support
- ESLint configuration
- Hot reloading
- Environment management
- Health check endpoint

---

## 🛠️ Customization

### Adding New Pages

1. Create a new file in `app/` directory
2. Export a default React component
3. Add route to `utils/constants.ts` if needed

### Adding New Components

1. Create component in `components/` directory
2. Export from `components/index.ts`
3. Import and use in your pages

### Database Changes

1. Modify `supabase/schema.sql`
2. Run SQL in Supabase dashboard
3. Update TypeScript types if needed

---

## 📚 API Reference

### Health Check
```
GET /api/health
```

Returns server status and uptime information.

### Authentication
- `supabase.auth.signInWithOAuth()` - Sign in with Google
- `supabase.auth.signOut()` - Sign out
- `supabase.auth.getSession()` - Get current session

### Database
- `getProfile(userId)` - Get user profile
- `createProfile(userId, username)` - Create user profile
- `updateProfile(userId, updates)` - Update user profile

---

## 🔧 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run setup    # Copy .env.example to .env.local
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) for the amazing React framework
- [Supabase](https://supabase.com) for the backend-as-a-service
- [Vercel](https://vercel.com) for seamless deployment
- [Tailwind CSS](https://tailwindcss.com) for utility-first styling

---

## 📞 Support

If you have any questions or need help, please:

1. Check the [Issues](https://github.com/angushally/base-app-vercel-supabase/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Happy coding! 🚀**
