# Orvexa — AI SEO Sales Copilot

Next.js 15 (App Router) + Supabase + Firecrawl + Groq/Gemini + Polar.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Run `supabase/schema.sql` in the Supabase SQL editor (tables, grants, RLS).
4. Enable Google in Supabase Auth → Providers with your `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
5. Google Console redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   Supabase Auth → URL Configuration → Site URL: your Vercel domain; Redirect URLs: `https://your-domain.com/auth/callback`.
6. `npm run dev`

## Deploy (GitHub + Vercel)
Push the repo, import into Vercel, add every variable from `.env.example`, deploy. No code changes required.
Polar webhook URL: `https://your-domain.com/api/polar/webhook`.

## Round-robin providers
`FIRECRAWL_API_KEYS`, `GROQ_API_KEYS`, `GEMINI_API_KEYS` accept comma-separated lists. Keys rotate
sequentially per request and fail over automatically on quota/rate-limit/error. Server-side only.
