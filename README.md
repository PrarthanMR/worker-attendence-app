# Coffee Estate Labour Tracker

A mobile-first demo for tracking coffee estate workers, daily attendance, and weekly wages. The app uses sample data held in React state only; changes reset when the page reloads.

## Run locally

```sh
npm install
npm run dev
```

Run the production type-check and build with `npm run build`.
Run the business-rule tests with `npm test`.

## Demo features

- English and Kannada interface
- Worker creation, wage editing, and deactivation/reactivation
- Date-based attendance entry with search and bulk actions
- Weekly wage summaries based on the wage captured with each saved attendance record
- All-or-nothing weekly payment status and date/week attendance history