# Landing page: design & Framer development (Hebrew, RTL)

A static landing page based on the design of [uxuikit.com](https://uxuikit.com/). It has a dark navy/violet gradient, a violet accent, a pill navigation bar and an "open to work" badge.

## Files

- `index.html`: page content (Hebrew, `dir="rtl"`)
- `styles.css`: design tokens (colors, radii, font) at the top in `:root`, then the styles for each section
- `script.js`: gallery loop, sticky header, mobile menu, reveal-on-scroll
- `assets/`: portrait, testimonial avatar, favicon

## Before publishing

All placeholders are in square brackets in `index.html`. Search for `[` to find them:

- [ ] `[קישור ליומן]` (4×): booking link, used by every "לקביעת שיחה" button
- [ ] `[מייל]`: email address in the final CTA (`mailto:`)
- [ ] `[קישור]` (2×): YouTube channels UXUIKIT and Ophir Creates
- [ ] `[שם הפרויקט]`: 10 gallery tiles; swap each for a real screenshot (see the comment above the gallery)
- [ ] `[תמונה]` (2×): photos of Shani Gilad and Ran Alter
- [ ] `[מחיר]` (3×) and `[זמן]` (3×): package prices and timelines
- [ ] `[מספר]` (3×): number of pages in the full-site package; revision rounds in the FAQ

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
