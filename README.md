# Landing page: design & Framer development (Hebrew, RTL)

A static landing page based on the design of [uxuikit.com](https://uxuikit.com/). It has a dark navy/violet gradient, a violet accent, a pill navigation bar and an "open to work" badge.

## Files

- `index.html`: page content (Hebrew, `dir="rtl"`)
- `styles.css`: design tokens (colors, radii, font) at the top in `:root`, then the styles for each section
- `script.js`: contact links, sticky header, mobile menu, reveal-on-scroll
- `assets/`: portrait, testimonial avatar, favicon

## Before publishing

Placeholders are marked with `TODO` comments in `index.html`:

- [ ] **Selected work** (`#work`): 3 projects, each with an image in `assets/`, name, challenge and result
- [ ] **Testimonials** (`#testimonials`): add more `<figure>` blocks, ideally about websites or Framer
- [ ] **Packages** (`#packages`): "starting from" prices (`₪X,XXX`) and confirmed timelines
- [ ] **Guarantee** (`#guarantee`): keep or delete the "exit after design" section
- [ ] **Contact links**: set the real URLs at the top of `script.js`:

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
