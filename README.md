# jcooper.id.au

Personal site and bio for Joe Cooper, a Brisbane-based customer success leader and software builder. Served from GitHub Pages on the custom domain **jcooper.id.au**.

## Stack

No build step. Plain HTML, CSS, and vanilla ES modules, so a commit and push is the whole deploy.

- `index.html` - content and structure.
- `CSS/styles.css` - design tokens, layout, dark and light themes, motion.
- `js/hero.js` - the generative flow-field canvas behind the hero.
- `js/main.js` - theme toggle, scroll reveals, stat count-ups, magnetic buttons.
- `favicon.svg`, `og-image.svg` - icon and social share card.
- `CNAME` - custom domain.

## Editing

Copy lives directly in `index.html`. House style: warm and direct, Australian English, no em dashes (use a single hyphen), "set up" as a verb and "setup" as a noun, "log in" as two words.

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Push to `master`. GitHub Pages serves the site at https://jcooper.id.au.
