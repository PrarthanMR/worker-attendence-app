# Coffee Estate Labour Tracker

A mobile-first demo for tracking coffee estate workers, daily attendance, and weekly wages. The app uses sample data held in React state only; changes reset when the page reloads.

## Run locally

```sh
npm ci
npm run dev
```

Run the production type-check and build with `npm run build`. Run the business-rule tests with `npm test`.

## Deploy to Cloudflare Pages

Connect the GitHub repository to Cloudflare Pages and use these build settings:

- Framework preset: Vite
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (repository root)

No environment variables are required. The app uses in-memory demo data, so changes reset when the page is reloaded. Vite's default root base path is used. The app does not use URL-based client routing, so no SPA fallback rule is needed.

## Demo features

- English and Kannada interface
- Worker creation, wage editing, and deactivation/reactivation
- Date-based attendance entry with search and bulk actions
- Weekly wage summaries based on the wage captured with each saved attendance record
- All-or-nothing weekly payment status and date/week attendance history