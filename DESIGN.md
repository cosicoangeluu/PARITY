# Parity design guide for AI agents

Read this before you write or change any UI in this repository.

Parity's whole interface, not only the landing page, is built from one source: the **animated landing hero** on the design canvas ("Parity Logo & Landing Hero", artboard `Main.dc.html`). Your job is to reproduce that look exactly and apply the same language to every screen of the web app. Do not invent a new style, palette, font or animation.

If something you need is not covered here, pick the closest existing pattern from this file and say in your summary which one you reused. Never add a new color, font, radius or easing curve without the user asking.

---

## 1. Non-negotiables

1. **Use the tokens.** Every color, font, radius, shadow and easing comes from `ui/tokens.css` (section 3). No raw hex values in components.
2. **Dark ink stage everywhere.** Every app screen sits on the Ink stage with grain and faint Mint/Coral orbs (section 6). Only the landing intro starts on paper.
3. **Two fonts only.** Bricolage Grotesque for display, the wordmark and amounts; Geist for everything else.
4. **Cards carry content.** White cards for main content, frosted glass cards for secondary info (section 7). No other card styles.
5. **One main action per screen**, styled as the Paper pill with the round Mint arrow.
6. **Motion uses the keyframes in `ui/motion/keyframes.css`** (section 5), with the same easings and durations. No animation libraries.
7. **Respect reduced motion.** Everything must be fully visible and usable with `prefers-reduced-motion: reduce`.
8. **Phone first.** Design at 390 px wide first; touch targets at least 44 px.
9. **Accessible as drawn.** Real `<button>`, `<a href>`, `<label>` + `<input>`; icon-only buttons get `aria-label`; text contrast at least 4.5:1.
10. **No emoji, no gradient washes behind text, no left-border accent cards, no Inter/Roboto/Arial.**

---

## 2. The logo

**Mark:** a rounded square holding two equal pill-shaped bars.

| Property | Value |
| --- | --- |
| Square fill | Ink `#10202E` (on light) / Paper `#F5F6F1` (on dark) |
| Corner radius | 30% of the square's size |
| Bars | 2, stacked, centered; top Mint, bottom Coral |
| Bar width | 52% of the square |
| Bar height | 13% of the square, fully rounded |
| Gap between bars | 12% of the square |
| Bars on a Paper square | Mint dark `#0B7A5E` top, Coral dark `#D9532C` bottom |

**Wordmark:** `parity`, always lowercase, Bricolage Grotesque weight 800, letter-spacing `-0.045em` at display sizes and `-0.02em` at nav size (22 px, weight 700).

**Meaning:** the two equal bars are everyone's share, made even. Never make the bars unequal except during the leveling animation.

Use the components, never redraw it: `ui/brand/Mark.tsx` (props: `size`, `tone: "dark" | "light"`) and `ui/brand/Wordmark.tsx`.

---

## 3. Tokens (`ui/tokens.css`)

```css
:root {
  /* Color */
  --ink: #10202E;          /* stage, mark, text on light */
  --paper: #F5F6F1;        /* light surfaces, text on dark */
  --intro-paper: #EAE6DA;  /* landing intro background only */
  --mint: #2BC59A;         /* top bar, active dot, arrow button, glow */
  --mint-dark: #0B7A5E;    /* mint on light surfaces, mint text */
  --mint-soft: #E3F5EE;    /* badge background on white cards */
  --coral: #F06A43;        /* bottom bar, glow, avatars */
  --coral-dark: #D9532C;   /* coral on light surfaces */
  --lavender: #B9C4F5;     /* third avatar color */
  --text-on-dark: #F5F6F1;
  --muted-on-dark: #C9D3DC;    /* body text on ink */
  --subtle-on-dark: #9AA8B5;   /* inactive tabs, captions on ink */
  --text-on-light: #10202E;
  --muted-on-light: #5B6875;
  --line-light: #E1E5DA;
  --dashed-light: #B5BDAE;
  --glass-fill: rgba(245, 246, 241, 0.08);
  --glass-line: rgba(245, 246, 241, 0.18);
  --outline-on-dark: rgba(245, 246, 241, 0.3);

  /* Type */
  --font-display: "Bricolage Grotesque", sans-serif;
  --font-body: "Geist", system-ui, sans-serif;

  /* Shape */
  --radius-mark: 30%;
  --radius-card: 22px;
  --radius-pill: 999px;
  --shadow-card: 0 24px 60px rgba(0, 0, 0, 0.35);
  --shadow-pill: 0 18px 40px rgba(0, 0, 0, 0.3);

  /* Motion */
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);    /* entrances */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* bars leveling, underline */
  --ease-window: cubic-bezier(0.76, 0, 0.24, 1); /* window opening */
}
```

Fonts load in `app/layout.tsx` with `next/font/google` (`Bricolage_Grotesque` weights 500–800, `Geist` 400–600) and are exposed as `--font-display` and `--font-body`.

### Type scale

| Role | Font | Size | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Hero wordmark | Display | `clamp(60px, calc(6.6vw + 36px), 148px)`, line-height 0.9, never wraps (`white-space: nowrap`) | 800 | -0.045em |
| Tagline / screen title | Display | `clamp(28px, 3.4vw, 40px)`, line-height 1.1 | 600 | -0.02em |
| Section title | Display | 22px | 700 | -0.02em |
| Big amount | Display | 26px, `tabular-nums` | 700 | 0 |
| Body | Body | 18px landing / 16px app, line-height 1.55 | 400 | 0 |
| UI text, list rows | Body | 15px | 400–600 | 0 |
| Labels, badges, captions | Body | 13–14px | 400–600 | 0 |

All money uses `font-variant-numeric: tabular-nums` and `formatMoney()` from `core/money.ts`.

---

## 4. The landing intro (landing page only)

Plays once per browser session; returning visitors and all app screens skip it (a session flag sets `data-intro="skip"` on `<html>` and the CSS variable `--intro-offset` to `0s`). Every hero delay below is written as `calc(var(--intro-offset, 3.3s) + Xs)` so skipping shifts the whole hero forward.

| Time | Element | Animation |
| --- | --- | --- |
| 0 s | Background | Intro paper `#EAE6DA` with SVG grain (`feTurbulence`, baseFrequency 0.85, opacity 0.35, multiply) |
| 0.15–0.85 s | Intro mark (80 px, centered) | `pop`: from a dot (scale 0.08, round) to the rounded square |
| 0.35–1.55 s | `P A R I T Y` under the mark (22 px, 0.32em tracking) | `letterIn` per letter, 0.1 s apart: from blur 6px + 4px down to sharp |
| 0.9–1.9 s | Bars | `barA` / `barB`: start uneven (top 1.5× wide shifted left, bottom 0.5× shifted right), slide level |
| 2.05–2.4 s | Wordmark, bars | Fade out |
| 2.42 s | Stage | Appears exactly over the mark (clip-path the mark's size) |
| 2.45–3.65 s | Stage | `open`: rounded window (inset 16% 4% 4% 4%, round 140px) then full screen, `--ease-window` |
| 2.6 s | Intro layer | Hidden |
| 2.9–4.5 s | Orbs | Fade in, then drift forever |
| 3.3 s | Nav | `fadeDown` |
| 3.4 s | Badge "Free forever · No sign-up · GCash & Maya ready" | `fadeUp` |
| 3.45 s | Light mark | `fadeUp` |
| 3.5–3.85 s | Hero letters `parity` | `rise` from behind a mask, 0.07 s apart |
| 4.2 / 4.32 s | Mint then Coral underline (6 px, max 320 px) | `draw` from left |
| 4.3 / 4.45 s | Tagline, body | `fadeUp` |
| 4.6 s | Buttons | `fadeUp` |
| 4.5 / 4.75 / 5.0 s | Receipt card, transfer card, Paid badge | `cardIn`, then `bob` loop starting ~0.9 s later |
| 5.2 s | "Scroll to discover" + pulsing Mint dot | `fadeUp`, `pulse` loop |

The key idea: **the Ink square of the mark becomes the window that opens into the app.** Keep that continuity; the stage's starting clip-path must match the intro mark exactly.

---

## 5. Motion (`ui/motion/keyframes.css`)

```css
@keyframes pop { 0% { transform: scale(.08); border-radius: 50% } 60% { border-radius: 50% } 100% { transform: none; border-radius: 30% } }
@keyframes barA { from { transform: translateX(-10px) scaleX(1.5) } to { transform: none } }
@keyframes barB { from { transform: translateX(10px) scaleX(.5) } to { transform: none } }
@keyframes letterIn { from { opacity: 0; filter: blur(6px); transform: translateY(4px) } to { opacity: 1; filter: blur(0); transform: none } }
@keyframes open { 0% { clip-path: inset(calc(50% - 40px) calc(50% - 40px) round 24px) } 45% { clip-path: inset(16% 4% 4% 4% round 140px) } 100% { clip-path: inset(0 0 0 0 round 0) } }
@keyframes rise { from { transform: translateY(105%) } to { transform: translateY(0) } }
@keyframes draw { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
@keyframes fadeDown { from { opacity: 0; transform: translateY(-12px) } to { opacity: 1; transform: none } }
@keyframes cardIn { from { opacity: 0; translate: 0 40px; scale: .96 } to { opacity: 1; translate: 0 0; scale: 1 } }
@keyframes bob { 0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)) } 50% { transform: translateY(-6px) rotate(var(--r, 0deg)) } }
@keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(43,197,154,.5) } 50% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(43,197,154,0) } }
@keyframes driftA { 0%, 100% { transform: translate(0,0) scale(1) } 50% { transform: translate(4%,-3%) scale(1.06) } }
@keyframes driftB { 0%, 100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-4%,-2%) scale(1.05) } }
```

| Pattern | Use it for | Duration / easing |
| --- | --- | --- |
| `fadeUp` stagger | Anything entering a screen, top to bottom, 60–80 ms apart | 0.6–0.8 s, `--ease-out` |
| `cardIn` | Cards appearing (lists, new expense, new claim) | 0.6–0.9 s, `--ease-out` |
| `bob` | Landing cards only. App cards stay still. | 6 s loop |
| `rise` | Big display text, e.g. a screen's total amount | 0.9 s, `--ease-out` |
| `draw` (Mint + Coral double underline) | Celebrating a finished state: bill Fully paid, Group settled | 0.8 s, `--ease-in-out` |
| `open` (window) | Opening a card into its detail view; opening the scan camera full screen | 0.5–0.6 s in the app, `--ease-window` |
| `pulse` Mint dot | Live or waiting states: claiming open, payment pending | 2.4 s loop |
| Hover lift | Buttons and tappable cards: `translateY(-2px)` | 0.25 s, `--ease-out` |

Rules: in the app, screen-to-screen motion stays between 0.3 and 0.5 s. Never animate width/height/top/left; use transform, opacity and clip-path. Every keyframe is disabled under `prefers-reduced-motion: reduce`, with final states shown.

---

## 6. The stage (every screen)

- Background `--ink`, full height.
- Grain: an inline SVG `feTurbulence` (baseFrequency 0.9) at opacity 0.18, `mix-blend-mode: overlay`, `pointer-events: none`.
- Two orbs, each `95vmax` circles, bottom at `-68vmax`, centered at 38% (Mint) and 62% (Coral) of the width. Fill `radial-gradient(circle at 50% 35%, color .55 → .18 at 38% → 0 at 62%)`, `blur(30px)`, `mix-blend-mode: screen`, drifting on 14 s and 16 s loops.
- In the app, orbs are dimmed to 60% opacity so content keeps contrast. Never place text directly on the brightest part of an orb without a card behind it.

Component: `features/landing/Stage.tsx` for the landing; `ui/AppStage.tsx` for app screens (same stage, dimmed orbs, no intro).

---

## 7. Components

| Component | Look | Use for |
| --- | --- | --- |
| **White card** `.card` | `#FFF`, radius 22px, padding 20px, `--shadow-card`, text Ink | Main content: item lists, claims, expense rows, forms |
| **Glass card** `.glass` | `--glass-fill`, 1px `--glass-line`, radius 22px, `backdrop-filter: blur(14px)`, text Paper | Balances, settle-up suggestions, summaries |
| **Status pill** `.pill` | Pill radius, 13–15px | `Paid` (Mint dark circle + check), `Pending` (pulsing Mint dot), `Not paid` (outline), `Rejected` (Coral dark), `Unclaimed` (1px dashed) |
| **Count badge** | `--mint-soft` background, `--mint-dark` text, 13px | "2 of 3 claimed" |
| **Avatar** | 26–36px circle, initials 12px/600 Ink; Mint, Coral, Lavender in rotation; stacked with -8px overlap and a 2px white ring | Who claimed / paid |
| **Primary action** | Paper pill (min-height 44–52px, 600 weight, Ink text) + round Mint 44px button with arrow icon | The one main action per screen |
| **Secondary action** | Pill, transparent `rgba(245,246,241,.06)`, 1px `--outline-on-dark`, Paper text | Other actions |
| **Tabs** | 14px, inactive `--subtle-on-dark`; active Paper 600 with an 8px Mint dot before it | Section navigation |
| **Inputs** | On white cards: 1px `--line-light`, radius 14px, 16px text, 44px min height, focus ring 2px Mint | Forms |
| **Dashed row** | 1px dashed `--dashed-light` | Empty or unclaimed slots |

Icons: inline stroke SVGs, 2–2.4px stroke, round caps and joins, `currentColor`, `aria-hidden="true"`.

---

## 8. Layout and navigation

- **Desktop header** (like the landing nav): section tabs on the left, the Parity mark + wordmark centered, the primary action on the right.
- **Phone:** header shows the mark, the Group name and a menu; tabs move to a **bottom tab bar** (Overview, Expenses, Scan, Settle, People) with the Mint dot on the active tab. The screen's primary action is pinned above the tab bar, within thumb reach.
- Content column max 1200px (landing) / 720px (app screens), 24px side padding (16px under 400px wide).
- Spacing steps: 4, 8, 12, 16, 20, 24, 28, 32, 40, 56px.
- One column on phones; on wide screens a content column plus a summary column (glass cards) may sit side by side, wrapping under 900px.

---

## 9. Mapping the hero to app screens

| Hero element | App use |
| --- | --- |
| Receipt card (items, avatars, "2 of 3 claimed", dashed "Unclaimed") | Scan & Split review and claim screens, expense detail |
| Transfer card (glass, "B → A ₱286.67", "via GCash") | Settle-up suggestions, balances |
| Paid badge pill | Payment status, bill status |
| Big wordmark `rise` | A screen's headline number, e.g. "You owe ₱286.67" |
| Double underline `draw` | Bill Fully paid, Group settled |
| Window `open` | Card → detail view, camera full screen |
| Pulsing Mint dot | Claiming live, payment pending, waiting for confirmation |
| "Scroll to discover" | Landing only |

---

## 10. Copy voice

Short, warm, plain English with Filipino-friendly examples (sisig, halo-halo, GCash). Sentence case. Amounts always formatted as `₱1,286.50`. Name people, not roles: "Ben pays Ana", "confirmed by Ana".

---

## 11. Checklist before you finish a UI change

- [ ] Only tokens from `ui/tokens.css`; no raw hex in components
- [ ] Display text in Bricolage Grotesque, everything else in Geist
- [ ] On the Ink stage, using white or glass cards correctly
- [ ] One primary action, Paper pill + Mint arrow
- [ ] Entrances use the listed keyframes and easings; reduced motion shows everything
- [ ] Works at 390px wide; touch targets at least 44px
- [ ] Real buttons/links/labels; contrast at least 4.5:1
- [ ] Matches the canvas artboard when compared side by side
