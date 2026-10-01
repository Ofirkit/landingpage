# Landing page: design & Framer development (Hebrew, RTL)

A static landing page based on the design of [uxuikit.com](https://uxuikit.com/). It has a dark navy/violet gradient, a violet accent, a pill navigation bar and an "open to work" badge.

## Files

- `index.html`: page content (Hebrew, `dir="rtl"`)
- `styles.css`: design tokens (colors, radii, font) at the top in `:root`, then the styles for each section
- `script.js`: smooth scrolling (Lenis), headline word rotation, gallery loop, sticky header, mobile menu, reveal-on-scroll
- `assets/vendor/`: Lenis 1.3.26 (MIT, smooth scrolling), bundled locally
- `assets/`: portrait, testimonial avatar, favicon

## Before publishing

All placeholders are in square brackets in `index.html`. Search for `[` to find them:

- [ ] `[קישור ליומן]` (4×): booking link, used by every booking button (header, hero, packages, final CTA)
- [ ] `[מייל]`: email address in the final CTA (`mailto:`)
- [ ] `[קישור]` (2×): YouTube channels UXUIKIT and Ophir Creates
- [x] `[תמונה]` (2×): photos of Shani Gilad and Ran Alter (added: `assets/shani-gilad.webp`, `assets/ran-alter.webp`)
- [x] `[מחיר]`: package prices (landing 5,000 ₪, full site 15,000 ₪ + 2,800 ₪ per extra page, Figma to live 3,500 ₪ + 1,750 ₪ per extra page)
- [x] Revision rounds in the FAQ: 2 for the home page, one for the other pages

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
