# Love Is More Than We Think — documentary longread

A static, dependency-free website: one HTML page, one stylesheet, one script, four photographs.
No build step. Fonts load from Google Fonts (Cormorant Garamond + Manrope).

```
LOVE_IS_MORE_LONGREAD/
├── README.md           ← this file (not published)
├── netlify.toml        ← publish = "site" (no build)
└── site/               ← everything that goes online
    ├── index.html      ← all text, the 74 survey answers, every chapter
    ├── css/styles.css  ← design tokens at the top (:root) — palette, type, radii
    ├── js/main.js      ← survey viewer, timelines, diagrams, tabs, navigation
    └── assets/
        ├── favicon.svg
        └── images/     ← the four story photographs (replace in place, same names)
            ├── darina-adil.jpg
            ├── aruzhan.jpg
            ├── kitten.jpg
            └── magzhan.jpg
```

## Run locally

Any static server works. With Python:

```bash
cd LOVE_IS_MORE_LONGREAD/site
python -m http.server 8765
```

Then open http://localhost:8765. (Opening `index.html` directly also works.)

## Deploy to Netlify

Pick one option:

- **Drag and drop:** go to https://app.netlify.com/drop and drop the `site` folder (not the whole project, so this README stays private).
- **CLI:**
  ```bash
  npm install -g netlify-cli
  cd LOVE_IS_MORE_LONGREAD   # netlify.toml points Netlify at site/
  netlify deploy            # preview URL
  netlify deploy --prod     # production
  ```
- **Git:** push this folder to a repository and connect it in Netlify. Leave the build command empty; `netlify.toml` already sets the publish directory to `site`.

Live site (GitHub Pages): https://quellyyss.github.io/love-is-more-than-we-think/ — deployed automatically from `site/` on every push to `main` (see `.github/workflows/pages.yml`).

## Editing

- **Photos:** replace the files in `site/assets/images/` and keep the same names. If the aspect ratio changes, update the `width` and `height` attributes on the matching `<img>` tags, then update the `alt` text and captions.
- **Survey answers:** these live once, as the `<ol id="answers-source">` list in `site/index.html`. Each `<li>` has a `data-themes` attribute (`family friends self animals culture food pursuits life open`). The viewer, the counter, the theme chart and the ticker are all built from that list.
- **Colours and type:** edit the variables at the top of `site/css/styles.css`.
- **Interactive panels** (timeline, brain, tabs): their text sits in `<template>` tags next to each widget in `site/index.html`.

## Accessibility and behaviour

- Semantic chapters, a skip link and a sticky chapter navigation with a reading-progress bar. On screens below 1320px the navigation becomes a chapter sheet.
- Every widget works by keyboard. Tabs use roving focus with the arrow keys and Home/End. The survey responds to ← and → when focused, has a range slider, and can be swiped on touch screens.
- `prefers-reduced-motion` turns off reveals, the ticker, path drawing and transitions.
- Content is only hidden for scroll reveals once JavaScript is confirmed running. Without JS, every section is visible and the full answer list can be read.
