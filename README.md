# CBM NCC Attendance

Next.js App Router application using Supabase Auth and the Supabase `profiles` table.

## Supabase setup

Copy `.env.local.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` to the project root URL (`https://<project-ref>.supabase.co`) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the project's publishable/anon key. Do not put a service-role key in this app or in any `NEXT_PUBLIC_` variable.

Apply `supabase/migrations/20260930_admin_settings_and_exceptions.sql` to the Supabase project before using shift configuration, excused permissions, or attendance-history status calculations. It creates the singleton `system_settings` row and `attendance_exceptions` table with role-aware row-level security.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
