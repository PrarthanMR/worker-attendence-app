# Coffee Estate Labour Tracker

A mobile-first demo for tracking coffee estate workers, daily attendance, and weekly wages. Data is stored in versioned browser `localStorage` on this device and survives reloads. It may be lost if browser site data is cleared or the device changes; use Backup & Export regularly.

## Run locally

```sh
npm ci
npm run dev
```

Run the production type-check and build with `npm run build`. Run the business-rule tests with `npm test`.

## Local data and backups

- First launch starts with an empty worker list. Later launches restore saved data without replacing it.
- Backup & Export downloads a versioned JSON file. Import validates and previews the file before replacing data.
- Attendance older than 28 days can be moved to the archive after explicit confirmation. Worker profiles, archived wage snapshots, and payment records are retained.
- Weekly wages can be shared through the device share sheet, a WhatsApp link, or clipboard fallback.
- No backend, environment variables, or browser storage beyond `localStorage` are used.

## Deploy to Cloudflare Pages

Connect the GitHub repository to Cloudflare Pages and use these build settings:

- Framework preset: Vite
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (repository root)

No environment variables are required. Vite's default root base path is used. The app does not use URL-based client routing, so no SPA fallback rule is needed.

## Demo features

- English and Kannada interface
- Worker creation, wage editing, and deactivation/reactivation
- Date-based attendance entry with search and bulk actions
- Weekly wage summaries based on the wage captured with each saved attendance record
- All-or-nothing weekly payment status and date/week attendance history
- Versioned local persistence, JSON backup/restore, archive, and weekly report sharing