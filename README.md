# Parity

Split it fair. Settle it fast.

Parity is a free, accountless group expense tracker for the Philippines. Make a Group, share one link, add expenses or **scan a receipt** and let everyone tick what they had. Parity works out the fewest transfers and tracks every payment (GCash, Maya, bank, cash) until it's confirmed.

Everything runs on free plans: Next.js on Vercel Hobby, Supabase Free, Gemini Flash-Lite free tier, OCR.space free API, Tesseract.js in the browser, and GitHub Actions.

---

## What's inside

| Feature | Where |
| --- | --- |
| Landing page with the animated intro | `app/page.tsx`, `features/landing/` |
| Create a Group, pick your name (name lock), join requests | `features/groups/` |
| Expenses, transfers, income; equal, shares, %, fixed and default shares | `features/expenses/`, `core/split.ts` |
| Fewest-transfers settle-up | `core/settle.ts`, `app/g/[token]/settle` |
| Scan & Split: long receipts in parts, overlap merging, total check, retake a part | `features/scan/`, `core/receipt.ts` |
| Claim link: who had what, live; leftovers; Senior/PWD discounts; finalize | `app/b/[token]`, `core/bill.ts` |
| Payments: "I paid" with reference number or photo, payee confirms or rejects | `features/payments/` |
| Organizer key, backup organizer link, replace link, lock Group | `server/access.ts`, `app/g/[token]/people` |
| Activity log and 30-day trash | `features/activity/`, `app/g/[token]/activity` |
| CSV export (opens in Excel) | `app/g/[token]/export` |
| Daily keep-alive + cleanup, weekly backup | `.github/workflows/`, `app/api/cron` |

The design rules for every screen are in **[DESIGN.md](DESIGN.md)**. AI coding agents are pointed to it from `AGENTS.md`.

### Folder map

```
app/            Routes only (thin). Fonts are self-hosted in app/fonts.
features/       One folder per feature: actions.ts (server actions), queries.ts, components
core/           Pure money math: no Next.js or Supabase imports. Fully unit-tested.
adapters/       Every outside service behind one file: receipt readers, exchange rates, Turnstile
server/         access.ts (the one access gate), db.ts, rate limiting, storage, realtime
ui/             Design tokens, motion keyframes, shared components (Mark, AppStage, buttons…)
lib/            Browser helpers: device "My groups" list, image compression, live refresh
supabase/       SQL migrations (schema, Row Level Security, storage buckets)
```

---

## Set it up (about 20 minutes, ₱0)

You need Node.js 22+, a GitHub account, and these free accounts: Supabase, Vercel, Google AI Studio, OCR.space. Cloudflare Turnstile is optional.

### 1. Supabase (database, storage, realtime)

1. Create a project at [supabase.com](https://supabase.com) on the **Free** plan. Pick the Singapore region (closest to the Philippines).
2. Open **SQL Editor**, paste the whole of `supabase/migrations/20261019000000_init.sql`, and run it. This creates the tables, locks them with Row Level Security, and makes three private storage buckets.
3. In **Project Settings → API Keys**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable / `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Secret / `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server only, never share it**)

### 2. Receipt reading (both optional)

- **Gemini:** [Google AI Studio](https://aistudio.google.com) → Get API key → `GEMINI_API_KEY`. The free tier covers Flash-Lite. Google may use free-tier inputs to improve its models; the scan screen tells users this.
- **OCR.space:** [ocr.space/ocrapi/freekey](https://ocr.space/ocrapi/freekey) → `OCR_SPACE_API_KEY` (25,000 requests a month, 500 a day).

Without either key, receipts are read on the user's phone with Tesseract.js (free, slower, less accurate).

### 3. Run it locally

```bash
cp .env.example .env.local   # fill in the values from steps 1 and 2
npm install
npm run dev                  # http://localhost:3000
```

Useful commands:

```bash
npm test          # money math tests (Vitest)
npm run check     # lint + types + tests
npm run build     # production build
```

### 4. Deploy to Vercel (Hobby, free)

1. Push this folder to a GitHub repository.
2. In [Vercel](https://vercel.com), **Add New → Project**, import the repo, keep the defaults.
3. Add every variable from `.env.example` under **Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to your Vercel address, e.g. `https://parity.vercel.app`.
4. Deploy.

Keep Parity **non-commercial** (no ads, payments or tips): that is what Vercel's free Hobby plan allows. If that ever changes, Cloudflare's free plan allows commercial use.

### 5. Keep it alive for years (GitHub Actions, free)

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value | Used by |
| --- | --- | --- |
| `SITE_URL` | Your Vercel address | Daily keep-alive |
| `CRON_SECRET` | Same random string as in Vercel | Daily keep-alive |
| `SUPABASE_DB_URL` | Supabase → Connect → Session pooler URI | Weekly backup |
| `BACKUP_REPO` | A new **private** repo, e.g. `you/parity-backups` | Weekly backup |
| `BACKUP_TOKEN` | Fine-grained token with Contents read/write on that repo | Weekly backup |

- **Keep alive** pings `/api/cron` every day so the free Supabase project never pauses, and deletes payment-proof photos 30 days after a payment is decided.
- **Weekly backup** saves a compressed database dump to your private backup repo and keeps the last 12.
- **CI** runs lint, types, tests and a build on every push.

### 6. Optional: Turnstile bot check

Cloudflare → Turnstile → add a site → put the keys in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Without them, the check is skipped.

---

## How access works without accounts

- **Group link:** an unguessable token in the URL. Anyone with it can open the Group.
- **Name lock:** the first phone to pick a name is tied to it with an httpOnly cookie. Nobody else can act as that person unless the organizer resets it.
- **Organizer key:** the phone that creates a Group holds a secret key (only its hash is stored). The People screen shows a **backup organizer link** to restore access on a new phone.
- **Replace link:** if a link leaks, the organizer makes a new one and the old one stops working.
- **Database:** Row Level Security is on for every table with no public policies, so the browser key can't read anything. All reads and writes go through `server/access.ts` with the secret key.

Payments are never verified automatically (there's no free GCash/Maya API for that). Only the person who received the money can confirm it; the organizer can step in after 7 days.

---

## Free-tier limits to watch

| Service | Free limit | What Parity does |
| --- | --- | --- |
| Supabase | 500 MB database, 1 GB storage, pauses after 7 idle days | Stores text only; photos deleted after payment; daily ping |
| Vercel Hobby | 100 GB transfer, 1M function calls, 4 CPU-hours a month | Static landing page, small images, heavy work in the browser |
| Gemini | Free-tier rate limits, changed often | Falls back to OCR.space, then Tesseract.js; per-Group daily scan cap |
| OCR.space | 25,000 requests a month, 500 a day, 1 MB per image | Photos compressed under 1 MB on the phone |

Free tiers change; recheck them once a year.

---

## Before launch

- Test the receipt reader on about 20 real receipts (Jollibee, Mang Inasal, grocery, sari-sari) and tune `core/receipt.ts`.
- Add an end-to-end test (Playwright) of the full flow: create Group → scan → claim → finalize → pay → confirm.
- Decide how long to keep idle Groups (`delete_idle_groups()` exists in the migration but isn't scheduled).
