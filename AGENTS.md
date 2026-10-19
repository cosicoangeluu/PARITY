<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Parity rules

- **UI work:** read `DESIGN.md` first and follow it exactly. The whole app reuses the animated landing hero's look and motion.
- **Money:** all amounts are integer centavos; use `core/money.ts`. Split and settle logic lives only in `core/` and must stay free of Next.js and Supabase imports.
- **Access:** every database read or write goes through `server/access.ts`.
- **Outside services:** only through `adapters/`; everything must stay on free tiers.
