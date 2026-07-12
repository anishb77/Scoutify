# scoutify-frontend

Next.js (App Router) frontend for Scoutify.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your FastAPI backend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project layout

- `app/layout.jsx` — root HTML shell + global styles (replaces the old `index.html` / `main.jsx`)
- `app/page.jsx` — renders the app
- `components/App.jsx` — the Scoutify UI (form, radar chart, roadmap, comps), talking to the FastAPI `/scout` route
- `app/globals.css` — global tokens/reset (ported from `src/index.css`)

## Building for hosting

```bash
npm run build
npm run start
```

`next build` produces a standard Next.js server build, which is what makes this deployable on hosts like Vercel, or behind any Node process — unlike the previous Vite setup, which only produced a static `dist/` bundle you had to serve yourself.

Set `NEXT_PUBLIC_API_URL` in your hosting provider's environment settings to the deployed FastAPI URL (from `../main.py`).
