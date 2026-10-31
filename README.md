# cEDH Power Ranker

Next.js app behind [cedhpower.com](https://cedhpower.com). Paste a decklist and it scores
every card pair against tournament pair data. **Lower power = stronger.**

## Setup

```sh
npm install
npm run dev
```

`.env.local`:

| Variable | Used by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server (auth, public reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only: saving decks and re-scoring them |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | server only: pair data and primer files |

Never prefix a secret with `NEXT_PUBLIC_`; those values are shipped to every visitor.

## How it works

- Pair data lives in R2 as `pairData.json` and is served (cached in memory) by `/api/pair-data`.
- Deck scores are computed server-side (`POST /api/decks`). After uploading new pair data,
  admins re-score every deck via `POST /api/decks/recompute`, which also writes a history snapshot.
- Admins are the emails in `src/lib/admin.ts`; admin API routes check the caller's Supabase session.

## Production

Runs under pm2 (`ecosystem.config.cjs`) on port 3333 behind a Cloudflare Tunnel:

```sh
npm run build && pm2 restart cedh-power
```

Database changes live in `scripts/*.sql` and are run by hand in the Supabase SQL editor.
