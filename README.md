# Landing page: design & Framer development (Hebrew, RTL)

A static landing page based on the design of [uxuikit.com](https://uxuikit.com/). It has a dark navy/violet gradient, a violet accent, a pill navigation bar and an "open to work" badge.

## Files

- `index.html`: page content (Hebrew, `dir="rtl"`)
- `styles.css`: design tokens (colors, radii, font) at the top in `:root`, then the styles for each section
- `script.js`: contact links, sticky header, mobile menu, reveal-on-scroll
- `assets/`: portrait, testimonial avatar, favicon

## Before publishing

Set the real contact links at the top of `script.js`:

```js
const LINKS = {
  booking: "https://cal.com/your-name",
  whatsapp: "https://wa.me/9725XXXXXXXX",
};
```

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
