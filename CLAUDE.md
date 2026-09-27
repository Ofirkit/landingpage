# CLAUDE.md — UXUIKIT landing page

Context for continuing work without the original chat. `README.md` holds the placeholder checklist; this file holds the decisions.

## 1. Overview

- Hebrew (RTL) service page for **UXUIKIT** (Ofir): design and website builds for **startups first, plus studios and service businesses**.
- Offer: design in Figma; builds in **Framer, Webflow or code with Claude Code**. The copy must stay tool-neutral; never imply Framer-only.
- Tone: a **professional business card, not a hard-sell page.** Readers mostly arrive warm (personal referrals and Ofir's YouTube channels). Core message: *a partner, not a vendor*.
- Stack: static `index.html` + `styles.css` + `script.js`. No build step and no framework. Lenis 1.3.26 (MIT) is vendored in `assets/vendor/`.
- Preview locally: `python3 -m http.server`. Work happens on branch `claude/hebrew-design-landing-page-stb5yj`.

## 2. Structure (all in `index.html`, top to bottom)

| Section | id / class | Notes |
|---|---|---|
| Header | `.site-header` | Logo on the right; plain transparent links (איך אני עובד, המלצות, חבילות, שאלות) grouped with the "בואו נדבר" button on the left (styled after operatorx). No pill fill and no link numbers. "עבודות" was removed on purpose. |
| Hero | `.hero` | Headline "אתרים שתהיו גאים לשלוח ___" with a rotating last word, then the subheading "אני מעצב ובונה אתרים שהופכים את המוצר והסיפור שלכם לחוויה ברורה, מובחנת ומשכנעת." (the user removed "לסטארטאפים" from it), one CTA, and a status row: "מקבל פרויקטים חדשים" (green dot) and "מעל 10 שנות ניסיון" (blue dot). |
| Work gallery | `#work`, inside the hero | Two rows scrolling in opposite directions. Row 1: Balance video, Alex, Agen.co security, Ashtanga (tall), Overcut, Noy. Row 2: Resonai Vera, Agen.co pricing, DataGen, Shani, AI agents, Unbound. No name tags on tiles (user request). |
| About | `#about` | Small portrait (`assets/ofir-portrait.webp`) on the right and a large two-paragraph statement ("היי, אני אופיר - מעצב ובונה אתרים. ..."), then the YouTube links. Words fill from gray to white on scroll. Photo width: about 245px on desktop, 240px on tablet, full width with the photo's own 3:4 ratio on phones (≤600px). When stacked (≤960px) the text comes first and the photo after it (user request). |
| How I work | `#how` | 6 principles, each "bold word + one line" (the brief's wording). |
| Testimonials | `#testimonials` | In this order: Shani Gilad, Ran Alter, Shai Keren. |
| Statement | `.statement` | Between Testimonials and Process: one big line, "האתר שלכם הוא לא קישוט יקר." (dim) / "הוא החוד החד ביותר של הנוכחות הדיגיטלית שלכם." (white), one sentence per line. A message the user liked on another site, meant "somewhere on the site", not for pricing. |
| Process | `#process` | Subtitle "קודם אני מבין איפה אתם עומדים ← ואז בונה את הדרך הברורה ביותר לאן שאתם הולכים." (the second message the user liked), then a **numbered list after the user's reference** (replaced the short-lived stacking cards). Each row: number in the side column, title on the heading's line, and at the far end **what the step produces** instead of the reference's timeline (user asked for a replacement): הצעה מסודרת · עמוד בית מאושר · לינק חי להתקדמות · אתר באוויר (all facts already stated on the site). One step is open at a time (white title, text below); the others are dim titles only. The first step starts open. With a mouse, hovering opens a row and it stays open after the pointer leaves (like the reference); on touch, tapping opens it. Scroll-driven opening was rejected because it makes the page jump. Rows are `<h3><button aria-expanded>` for keyboard and screen readers; the panel height animates with `grid-template-rows: 0fr → 1fr`. Without JS all steps are open. On phones the "produces" label sits under the title. |
| Packages | `#packages` | Layout after the user's pricing reference image, **in the site's dark colors** (the user wanted the layout, not the reference's light colors): centered heading (no number); a subtle 48px grid spans the whole section behind the heading and all the cards; its top and bottom 20% fade into the page. It is built for cross-browser consistency: **solid line color `--grid-line: #0b0b12`** (not low-alpha white), positioned at `0 0` (not centered, which put lines on half pixels), and faded with a `var(--bg)` gradient layer on top (not `mask-image`). The earlier 3%-white + mask version looked right in Firefox but nearly vanished in Chrome and Brave. The cards have a solid fill (`#0c0c13`; the featured card's gradient is opaque too) so the grid never shows through them (user request), then three cards: landing page · full marketing site (featured: navy/indigo gradient, stronger border, **no badge**) · from Figma to a live site. Each card: title, one-liner, list with violet checks, "החל מ [מחיר]" (the user removed "זמן עבודה"), a full-width white pill "לשיחת היכרות" button, and "שיחת היכרות של 20 דקות" under it. No monthly/yearly tabs (user request). Monthly maintenance is a wide card below (600 ₪ for 2 h, 1,200 ₪ for 4 h; these prices are real). |
| Fit | `#fit` | "מתאים אם" / "פחות מתאים אם". The first "fit" line names startups, studios and service businesses. |
| FAQ | `#faq` | `<details>` items. |
| Final CTA | `#contact` | Booking button and a `mailto:` link. |
| Bottom blur | `.bottom-blur` | Fixed progressive blur at the bottom of the viewport. |

JS (`script.js`): gallery clone loop → Lenis → headline rotator → About fill → process accordion → sticky header → mobile menu → reveal-on-scroll.

## 3. Design decisions

- **Palette:** based on uxuikit.com. The hero is flat `#111111` and fades into the page (`#030308`). Lower sections are near-black with subtle navy and violet radial glows. All tokens are in `:root` in `styles.css`.
- **Page title and meta (approved):** title "UXUIKIT | עיצוב ובניית אתרים לסטארטאפים ועסקים". Social share title (`og:title`) "עיצוב ובניית אתרים לסטארטאפים ועסקים". Description and `og:description`: "מעצב ובונה אתרים שתהיו גאים לשלוח ללקוחות ולמשקיעים. עיצוב ב-Figma ופיתוח ב-Framer, Webflow או בקוד, לסטארטאפים, סטודיואים ועסקי שירות." The audience is still startups first, broadened to studios and service businesses (not moving away from startups). Rejected title "מעצב ובונה אתרים לא גנריים": negative framing with no search keywords.
- **CTA copy (copywriter recommendation, approved):** header "בואו נדבר", hero and final CTA "בואו נכיר", packages "לשיחת היכרות". Every button books the intro call (`[קישור ליומן]`). Rejected: "להתחלת פרויקט" (asks for too much commitment on the first click) and "בואו נעבוד ביחד" (vague, and skips the intro step).
- **Buttons:** every primary CTA is **white with dark text, 6px radius and a soft white glow**, used consistently everywhere, including the pricing cards (which use the pill shape from the reference). The old purple accent (`--accent`) now only appears in focus rings and details.
- **Font:** Noto Sans Hebrew. Headings are 700 and everything else 400; no other weights.
- **Hero headline:** 70.4px on desktop (the earlier 64px + 10%; `clamp(42px, 5.72vw, 70.4px)` below 1024px) with line-height 1.1. On desktop and phones (≤600px) it breaks into 3 lines (`.br-desk`: "אתרים שתהיו / גאים לשלוח / [rotating word]"); on tablets (601–1023px) into 2 (`.br-mob`).
- **Breakpoints:**
  - ≥1024px: two-column hero, with the headline on the right and the supporting copy and CTA on the left.
  - ≤960px: hamburger nav, stacked sections.
  - ≤600px: full-width buttons, single-column grids.
- **Layout language:** editorial style. Section heads have a thin top rule and a large heading. **No section numbers and no side-column indent** (user request): all content starts at the page edge. **Wide layout:** `--container: 1480px` (same as the header row), gutter `clamp(16px, 4vw, 64px)`; paragraphs keep their own max-widths for readable lines. The process step numbers (01–04) stay, since they come from the reference. Minimal cards: only the packages and the final CTA are panels.
- **Gallery:** rows are `min(450px, 58vw)` tall with a 16px gap and no edge fade. The media's own ratio sets each tile's width (images 3:2, Ashtanga 1:2, video about 1.66:1). The rows scroll continuously and do **not** pause on hover.
- **Gallery media (in `assets/work/`), optimized for speed:**
  - Each image comes in two WebP sizes: `<name>-450.webp` and `<name>-900.webp`, quality 80. `srcset`/`sizes` makes each screen download only one; `width`/`height` attributes reserve space so the layout doesn't jump.
  - The video is `balance-720` and `balance-450`, each as WebM (VP9) plus an MP4 (H.264) fallback, with no audio and faststart. `<source media>` gives 720p to wide screens and 450p to phones; `balance-poster.webp` is its first frame.
  - The video plays only while on screen (IntersectionObserver) and stays on its poster under reduced motion.
  - Totals: the originals were about 31MB (a 25.8MB MP4 and 11 PNGs); the whole gallery now downloads roughly 0.5MB on a standard screen and 1MB on a high-resolution one.
  - Re-encode new media the same way: `pip install imageio-ffmpeg` for ffmpeg, and Pillow for WebP.
- **Rotating word:** `data-words="למשקיעים,ללקוחות"`. Only these two words; do not add more without asking.
  - Mechanics: the word is clipped to exactly one line (`height: 1.1em` must equal the h1 line-height).
  - Exit: the old letters slide up out of the line one by one (0.35s, 25ms stagger).
  - Enter: the new letters rise from below, starting only after the exit (0.6s, 40ms stagger, 560ms delay).
  - Hold: each word stays for 3.6s (`HOLD`). It matches a reference GIF the user supplied.
- **About scroll-fill:** JS wraps each word of `.fill-text` in `.w`. Words start at `rgba(255,255,255,0.26)` and become white (`.is-lit`) with `transition: color 0.3s ease` (the user's reference). Progress runs from 0, when the text's top reaches 85% of the viewport, to 1, when its bottom reaches 45%. Under reduced motion all words are lit.
- **Mobile hero (≤600px):** tightened so the first gallery row shows above the fold. The hero has 100px top padding, a 17px lead, and 32px between the status row and the gallery. Visible gallery: about 74px on an iPhone SE, about 200px on common phones. Keep this in mind before adding hero content on mobile.
- **Header sizes:** links and the header CTA are 14px (CTA padding 8×16). The logo is 31px wide (26px on mobile). The mobile menu button is 38px. **Below 960px the header CTA is hidden** (logo and menu button only; user request). The mobile dropdown links stay 18px for easy tapping.
- **Nav + CTA hover roll:** the same roll runs on the nav links and every `.btn-primary` button (user request). JS splits each link into letters, each stacked with a copy, inside a one-line clip (`height: 1.2em` = 16.8px at 14px). On hover the letters go from `transform: none` to `translateY(-1.2em)`, which is −16.8px, with an 18ms stagger. It scales with font size. The link keeps an `aria-label`. The mobile dropdown panel is opaque (`#0e0e28`).
- **Motion:** restrained. Reveal-on-scroll uses a 12px rise. Lenis uses `lerp: 0.1`. The bottom blur is 7 `backdrop-filter` layers (0.5px to 32px) plus a 0.35 tint. Everything respects `prefers-reduced-motion`.

## 4. Conventions and rules

- **Always:**
  - Keep Hebrew and RTL. Use logical CSS properties (`inset-inline`, `padding-inline-start`).
  - Put any unknown fact in a **`[placeholder]` in square brackets**; never invent prices, timelines, clients, numbers or testimonials.
  - After editing `styles.css` or `script.js`, **bump the `?v=` query** on both in `index.html`. Browsers served a stale stylesheet and broke the page in Firefox.
  - Test the rotating headline with the **real Noto Sans Hebrew font**. It can't load from Google Fonts in the sandbox; get it with `npm pack @fontsource/noto-sans-hebrew` and inject it via Playwright. The fallback font hid a real bug.
  - **One voice for all copy (user request):** Ofir speaks in the first person singular ("אני מעצב", "אני מתחיל"), never "אנחנו", and addresses readers in the plural ("אתם", "שלכם"). A "we" form is only for things done together with the client ("בואו נכיר", "מאשרים יחד"). Translate borrowed lines into this voice, including the saved messages.
  - Get the user's approval of a plan before large structural changes, which the user explicitly asked for.
  - Bundle third-party JS in `assets/vendor/`, not a CDN.
- **Never:**
  - Write copy that promises messaging or copywriting. Copy is the client's responsibility; a copy service may be added later.
  - Sell on speed, use artificial urgency or capacity claims ("עד 3 פרויקטים בחודש"), or promise unlimited availability.
  - Add a WhatsApp CTA or link a CTA to the uxuikit.com homepage. The only uxuikit.com link allowed is the footer brand link.
  - Add a "הכי מבוקש" badge or other unverified claims.
- Images: optimize before use (the 7.4MB portrait became a 60KB webp). Logos in `assets/logos/` have tightened `viewBox`es.

## 4a. Saved messages (for later use)

Lines the user liked on other sites. Use them only where they fit naturally, and ask before placing one.

- **Not placed yet:** "We don't jump straight to the visuals. We start by understanding your business, your audience, and what your website actually needs to do."
  - Hebrew, in the site's voice (singular, user request): "אני לא קופץ ישר לעיצוב. אני מתחיל בהבנה של העסק שלכם, הקהל שלכם ומה האתר באמת צריך לעשות."
  - Possible homes: the Process intro (it overlaps with the current subtitle, so it would replace it) or the first process step.
- **Already on the site:** "Your website isn't an expensive decoration…" (the Statement) and "First, we understand where you are → …" (the Process subtitle).

 (don't repeat)

- **About further down the page:** moved to directly after the hero at the user's request (introduce the person first).
- **Pain / "why Framer" / outcome sections and a conversion-heavy tone:** replaced by the partner-tone brief ("איך אני עובד" principles).
- **Case-study cards:** replaced by the hero gallery.
- **Project-name tags on gallery tiles:** removed at the user's request.
- **"Exit after design" guarantee:** the user found it impractical. It was replaced by a homepage-first approval step.
- **Pill-shaped nav with a fill:** replaced by transparent links (user request).
- **Tool logos row in the hero** (Figma, Claude Code, Webflow, Framer): tried and then removed at the user's request. The SVGs are kept in `assets/logos/`.
- **Sticky mobile CTA bar, hero highlights row, "3 שיפורים" call promise and competitor research before calls:** all removed as too salesy or impractical.
- **A "מה אני צריך מכם" section:** the user rejected it.
- **Rotator attempts that failed:**
  - A padded clip window let letters show below the line.
  - Staggered exit overlapping the entry looked like leftover letters.
  - A plain fade-out didn't match the reference.
  - Five words (including לעיתונאים) were too many.
  - The first timing was too fast.
- **Process as vertical stacking cards (sticky deck):** built, then replaced by the reference's numbered accordion list at the user's request.
- **Framer-only copy:** replaced with tool-neutral copy.

## 6. Current status

- **Done:** every section above, desktop and mobile. The rotating word, Lenis smooth scrolling and the bottom blur were verified in Chrome with the real font.
- **Placeholders still open** (full list in `README.md`):
  - Booking link `[קישור ליומן]` (4×) and `[מייל]`.
  - YouTube `[קישור]` (2×).
  - Photos of Shani and Ran `[תמונה]`.
  - Package `[מחיר]`.
  - `[מספר]` for pages and revision rounds.
- **Known issues and loose ends:**
  - The bottom blur covers the footer text at the very bottom of the page. A fade-out near the footer was offered but not built.
  - Firefox and Safari were never tested in-sandbox (only Chromium is installed). The user reported Firefox issues earlier, which were fixed by cache-busting.
  - `assets/IMG20260802130258.jpg` (7.4MB original) and `assets/ofir.webp` (still used as `og:image`) sit in the repo; consider updating `og:image` and removing the original.
  - No PR has been opened; the work is only on the branch.

## 7. Next steps

1. Fill in the placeholders as Ofir supplies the content: prices and timelines, links and photos. The gallery is done.
2. Decide on the blur/footer overlap.
3. Cross-browser check in Firefox and Safari.
4. Later: a separate page for other audiences, such as agencies or non-startups, with its own message.
5. Later: possibly a copywriting service. Update the FAQ "מי כותב את הטקסטים?" and the "מתאים/פחות מתאים" lists if it's added.
