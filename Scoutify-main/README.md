# Scoutify — placeholder README

Quick start:
1. Install deps: pnpm install (or npm install)
2. Dev: pnpm dev (or npm run dev)
3. Tests: npm test

What's implemented:
- Next.js + TypeScript + Tailwind scaffold
- ProfileInput form with localStorage persistence
- ModelOutput with Suspense + Skeleton, RadarChart, grades, similar players
- Mock API/resource and Vitest tests (evaluation, profile input, model output)

Next TODOs:
- Polish styles, fonts, logos (place logo.png into /public)
- Add backend integration and production readiness

Asset: see public/ASSET_INSTRUCTIONS.txt for logo placement.

API Contract (frontend expectations)

- Endpoint: POST {API_BASE}/analyze
- Request body: JSON matching ScoutifyInputData
  {
    position: string,
    heightInches: number,
    weight: number,
    fortyYardTime: number,
    vertical: number,
    benchPress: number,
    broadJump: number,
    threeConeTime: number,
    shuttleTime: number
  }

- Response: ScoutifyApiResponse
  {
    grades: { [attributeName: string]: number },
    radarData: {
      user: { speed:number, explosiveness:number, power:number, agility:number },
      comparablePlayer: { name:string, speed:number, explosiveness:number, power:number, agility:number }
    },
    similarPlayers: [ { name, height, weight, school, speed, explosiveness, power, agility, ... } ]
  }

How to enable real API:
- Create a .env.local with NEXT_PUBLIC_SCOUTIFY_API=https://your-backend
- The frontend will call ${API_BASE}/analyze and fall back to the mock provider if the request fails or the env var is not set.


