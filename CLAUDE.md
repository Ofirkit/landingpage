# CLAUDE.md — UXUIKIT landing page

Context for continuing work without the original chat. `README.md` holds the placeholder checklist; this file holds the decisions.

## 1. Overview

- Hebrew (RTL) service page for **UXUIKIT** (Ofir): design and website builds for **startups**.
- Offer: design in Figma; builds in **Framer, Webflow or code with Claude Code**. The copy must stay tool-neutral; never imply Framer-only.
- Tone: a **professional business card, not a hard-sell page.** Readers mostly arrive warm (personal referrals and Ofir's YouTube channels). Core message: *a partner, not a vendor*.
- Stack: static `index.html` + `styles.css` + `script.js`. No build step and no framework. Lenis 1.3.26 (MIT) is vendored in `assets/vendor/`.
- Preview locally: `python3 -m http.server`. Work happens on branch `claude/hebrew-design-landing-page-stb5yj`.

## 2. Structure (all in `index.html`, top to bottom)

| Section | id / class | Notes |
|---|---|---|
| Header | `.site-header` | Logo · pill nav (איך אני עובד, המלצות, חבילות, שאלות) · "לקביעת שיחה" button. "עבודות" was removed from the nav on purpose. |
| Hero | `.hero` | Headline "אתרים שתהיו גאים לשלוח ___" with a rotating last word, then subheading, one CTA, and a status row: "מקבל פרויקטים חדשים" (green dot) and "מעל 10 שנות ניסיון" (blue dot). |
| Work gallery | `#work`, inside the hero | Two rows scrolling in opposite directions; placeholder tiles for now. |
| How I work | `#how` | 6 principles, each "bold word + one line" (the brief's wording). |
| About | `#about` | Short text, portrait `assets/ofir-portrait.webp`, YouTube links. |
| Testimonials | `#testimonials` | In this order: Shani Gilad, Ran Alter, Shai Keren. |
| Process | `#process` | 4 steps. |
| Packages | `#packages` | Landing page · full marketing site · from Figma to a live site · monthly maintenance (600 ₪ for 2 h, 1,200 ₪ for 4 h; these prices are real). |
| Fit | `#fit` | "מתאים אם" / "פחות מתאים אם". |
| FAQ | `#faq` | `<details>` items. |
| Final CTA | `#contact` | Booking button and a `mailto:` link. |
| Bottom blur | `.bottom-blur` | Fixed progressive blur at the bottom of the viewport. |

JS (`script.js`): gallery clone loop → Lenis → headline rotator → sticky header → mobile menu → reveal-on-scroll.

## 3. Design decisions

- **Palette:** based on uxuikit.com. The hero is flat `#111111` and fades into the page (`#030308`). Lower sections are near-black with subtle navy and violet radial glows. All tokens are in `:root` in `styles.css`.
- **Buttons:** every primary CTA is **white with dark text, 6px radius and a soft white glow**, used consistently everywhere. The old purple accent (`--accent`) now only appears in focus rings and details.
- **Font:** Noto Sans Hebrew. Headings are 700 and everything else 400; no other weights.
- **Hero headline:** 64px with line-height 1.1. On desktop it breaks into 3 lines (`.br-desk`); on smaller screens into 2 (`.br-mob`).
- **Breakpoints:**
  - ≥1024px: two-column hero, with the headline on the right and the supporting copy and CTA on the left.
  - ≤960px: hamburger nav, stacked sections.
  - ≤600px: full-width buttons, single-column grids.
- **Layout language:** editorial style. Section heads have a thin top rule, a small number (01–06) in a side column, and a large heading. Content is indented to line up with the heading (`--indent`). Minimal cards: only the packages and the final CTA are panels.
- **Gallery:** rows are `min(450px, 58vw)` tall with a 16px gap and no edge fade. Tile ratios match the user's reference (16/10, 7/5, 9/7, 9/16). The rows scroll continuously and do **not** pause on hover.
- **Rotating word:** `data-words="למשקיעים,ללקוחות"`. Only these two words; do not add more without asking.
  - Mechanics: the word is clipped to exactly one line (`height: 1.1em` must equal the h1 line-height).
  - Exit: the old letters slide up out of the line one by one (0.35s, 25ms stagger).
  - Enter: the new letters rise from below, starting only after the exit (0.6s, 40ms stagger, 560ms delay).
  - Hold: each word stays for 3.6s (`HOLD`). It matches a reference GIF the user supplied.
- **Motion:** restrained. Reveal-on-scroll uses a 12px rise. Lenis uses `lerp: 0.1`. The bottom blur is 7 `backdrop-filter` layers (0.5px to 32px) plus a 0.35 tint. Everything respects `prefers-reduced-motion`.

## 4. Conventions and rules

- **Always:**
  - Keep Hebrew and RTL. Use logical CSS properties (`inset-inline`, `padding-inline-start`).
  - Put any unknown fact in a **`[placeholder]` in square brackets**; never invent prices, timelines, clients, numbers or testimonials.
  - After editing `styles.css` or `script.js`, **bump the `?v=` query** on both in `index.html`. Browsers served a stale stylesheet and broke the page in Firefox.
  - Test the rotating headline with the **real Noto Sans Hebrew font**. It can't load from Google Fonts in the sandbox; get it with `npm pack @fontsource/noto-sans-hebrew` and inject it via Playwright. The fallback font hid a real bug.
  - Get the user's approval of a plan before large structural changes, which the user explicitly asked for.
  - Bundle third-party JS in `assets/vendor/`, not a CDN.
- **Never:**
  - Write copy that promises messaging or copywriting. Copy is the client's responsibility; a copy service may be added later.
  - Sell on speed, use artificial urgency or capacity claims ("עד 3 פרויקטים בחודש"), or promise unlimited availability.
  - Add a WhatsApp CTA or link a CTA to the uxuikit.com homepage. The only uxuikit.com link allowed is the footer brand link.
  - Add a "הכי מבוקש" badge or other unverified claims.
- Images: optimize before use (the 7.4MB portrait became a 60KB webp). Logos in `assets/logos/` have tightened `viewBox`es.

## 5. Tried and rejected (don't repeat)

- **Pain / "why Framer" / outcome sections and a conversion-heavy tone:** replaced by the partner-tone brief ("איך אני עובד" principles).
- **Case-study cards:** replaced by the hero gallery.
- **"Exit after design" guarantee:** the user found it impractical. It was replaced by a homepage-first approval step.
- **Tool logos row in the hero** (Figma, Claude Code, Webflow, Framer): tried and then removed at the user's request. The SVGs are kept in `assets/logos/`.
- **Sticky mobile CTA bar, hero highlights row, "3 שיפורים" call promise and competitor research before calls:** all removed as too salesy or impractical.
- **A "מה אני צריך מכם" section:** the user rejected it.
- **Rotator attempts that failed:**
  - A padded clip window let letters show below the line.
  - Staggered exit overlapping the entry looked like leftover letters.
  - A plain fade-out didn't match the reference.
  - Five words (including לעיתונאים) were too many.
  - The first timing was too fast.
- **Framer-only copy:** replaced with tool-neutral copy.

## 6. Current status

- **Done:** every section above, desktop and mobile. The rotating word, Lenis smooth scrolling and the bottom blur were verified in Chrome with the real font.
- **Placeholders still open** (full list in `README.md`):
  - Booking link `[קישור ליומן]` (4×) and `[מייל]`.
  - YouTube `[קישור]` (2×).
  - 10 gallery tiles `[שם הפרויקט]`, waiting for real screenshots.
  - Photos of Shani and Ran `[תמונה]`.
  - Package `[מחיר]` and `[זמן]`.
  - `[מספר]` for pages and revision rounds.
- **Known issues and loose ends:**
  - The bottom blur covers the footer text at the very bottom of the page. A fade-out near the footer was offered but not built.
  - Firefox and Safari were never tested in-sandbox (only Chromium is installed). The user reported Firefox issues earlier, which were fixed by cache-busting.
  - `assets/IMG20260802130258.jpg` (7.4MB original) and `assets/ofir.webp` (still used as `og:image`) sit in the repo; consider updating `og:image` and removing the original.
  - No PR has been opened; the work is only on the branch.

## 7. Next steps

1. Fill in the placeholders as Ofir supplies the content: gallery images first, then prices and timelines, links and photos.
2. Decide on the blur/footer overlap.
3. Cross-browser check in Firefox and Safari.
4. Later: a separate page for other audiences, such as agencies or non-startups, with its own message.
5. Later: possibly a copywriting service. Update the FAQ "מי כותב את הטקסטים?" and the "מתאים/פחות מתאים" lists if it's added.
