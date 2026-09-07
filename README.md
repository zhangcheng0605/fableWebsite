# Zhang Cheng — Personal Website

A fast, dependency-free personal website. Plain HTML/CSS/JS — no build step, no framework.
Live at <https://zhangcheng0605.github.io/fableWebsite/>.

## Structure

The landing page is four full-width blocks on a bright candy-neon theme: **manga**,
**projects**, **3D projects**, **experience**. Each project keeps its own page and its own detail.
Every page carries the same site nav (logo · Manga · Projects · 3D Projects · Trading · Experience ·
Direction · Contact); on phones the pill scrolls sideways with a fade on the edge that still has more.

- `index.html` — the landing page: hero, rainbow marquee, `#manga` (every series and chapter,
  with thumbnails), `#projects` (six tiles — influencer, two games, the trading desk, OneSheet,
  FoW), `#three-d` (campus, Tiananmen, SENTINEL-9), `#experience`, `#contact`. Full-bleed bands
  over an animated aurora background; one dark-violet ink colour for all text. Styles and scripts
  inlined; a Person JSON-LD block in the head.
- `assets/thumbs/` — the card images: 800px JPEG thumbnails for the manga chapters and project
  cards (the originals are full-resolution pages and were costing the landing page 2.3 MB), the
  1280×720 JPEGs the `og:image` tags point at, and two SVG stand-ins (`fow.svg`, `tiananmen.svg`).
- `assets/sparkle.js` — the fairy-dust layer: an emoji particle canvas that trails the pointer
  (or finger), sprinkles on every scroll tick, and drops an occasional ambient sparkle. The
  rAF loop only runs while particles exist; reduced motion disables the whole file.
- `assets/bunny.js` / `bunny.css` — the bunny cursor on fine pointers (torn down cleanly once a
  touch or pen is seen). `assets/fx.js` / `fx.css` — pointer-reactive tilt, glow and magnetic
  buttons; self-disable under reduced motion and on coarse pointers.
- `assets/zac-logo.js` + `assets/ink-array.js` — the hero: the three.js stamp lockup and the
  ink character array that spells the studio's Chinese name. three.js is only fetched on fine
  pointers, viewports over 768px, no reduced-motion and no save-data; everyone else keeps the
  SVG lockup. `assets/fonts/zacink.woff2` is the 61-glyph subset the ink array draws with (see
  `assets/fonts/README.md`).
- `assets/cinema.js` + `assets/film/` — the scroll-scrub film engine and frame sequences from
  the previous dark design. No page uses them; the frame folders are excluded from the Pages
  deploy (only the three `still-*.jpg` files are referenced). Kept for an easy revert.
- `campus/` — the 3D campus: a media campus assembled by scroll, written in code rather than
  loaded from a model file. `campus.js` is the scene, `three-d-stage.js` the WebGL shell (with a
  context-loss overlay), `controls.js` the look-and-light panel, `vendor/three/` a pinned copy of
  three.js r184 so the page needs no CDN. This folder holds the shared 3D plumbing: the other 3D
  pages and the homepage's hero mark import `three-d-stage.js` and `vendor/three/` from here.
  Every page loads the `.min.js` builds; the unminified sources are kept as their provenance.
- `tiananmen/` — the second 3D project: 天安门, the Gate of Heavenly Peace, raised phase by phase
  as you scroll, then the whole square behind it. Same rules as the campus — no model files, no
  image files, every texture painted into a `<canvas>` at runtime — and the same export to
  GLB / OBJ. `tiananmen.js` is the scene.
- `mech/` — SENTINEL-9: the same exo-frame built twice as you scroll, first as a 2D blueprint
  (anime.js, `mech/vendor/`), then assembled in three.js. Falls back to a caption without WebGL;
  two fingers orbit on touch so one finger still scrolls.
- `trading/` — the autonomous paper-trading desk: bots, routines, P&L, risk engine, postmortem.
  The page renders its numbers from `trading/data/ledger.jsonl` and shows how old the last line is
  (green ≤ 36 h, amber ≤ 14 days, otherwise "Archived"). `.github/workflows/heartbeat.yml` runs
  `trading/heartbeat.py` nightly; it appends a line only when the four `ALPACA_*` repository
  secrets are set, so without them the desk stays honestly archived at its 17 Jul 2026 report.
- `influencer/` — the virtual influencer: a campaign portfolio (42 concept campaigns, instant-film
  prints, a lightbox) rendered from my own licensed likeness; images live in
  `influencer/assets/img/`.
- `fow/` — FoW, the Future of Work demo and the landing page's flagship card: sign in as one of
  seven personas, each with its own paradigm, MCP-connected tiles, guided tours and an animated agent
  crew. One 800 KB file. Deep links: `?persona=finance` opens a seat, `&story=1` plays its
  walkthrough, `&embed=1` hides the site chrome (the landing card mounts
  `fow/?persona=finance&story=1&embed=1` in an iframe only while it is on screen, on fine-pointer
  screens over 700px, and never under reduced motion or save-data).
- `onesheet/` — a spreadsheet engine in a single offline HTML file. `=AI()` runs in mock mode
  by default; a real key is kept in `sessionStorage` for the tab only. The ⚙ Gate button runs the
  40 checks in `onesheet/gate.json` against the live engine (39 pass; the one known-failing row is
  a real bug, kept visible).
- `prompt-injection/` — a typing-defence game (`game.html`) with its build story.
- `lucky-bunny/` — a scratch-card game (`game.html`, React vendored in `vendor/`) with its page.
- `seen/`, `seen2/`, `seen3/` — *SEEN*, chapters 1–3 (`seen2/` also has a flip-book edition and a
  scrolling edition). `comic/`, `comic2/`, `comic3/` — *Witch of the Vending Machines*, chapters
  1–3 (`comic/` also has a flip-book). `rich/` — *Born Rich*, a one-shot. The flip-book and game
  pages are embedded in their chapter/project page and show a `← Back` link only when opened
  full-screen.
- `direction/` — **The Director's Cut**: one case file per project — the brief as recorded, the turns
  where a person changed what the agents made (verbatim commit messages, dated, with the Claude
  session links), the gate that decided it was done, and what it does not prove. Generated from git
  history; every quotation is checked against `git log` before publishing.
- `rejects/` — **The Reject Pile**: rejected outputs beside what replaced them (the Ink & Lantern
  theme, the hawker-food influencer concept, the FoW card glow, the 75-second playback…), each with
  the direction that changed it, plus the schema rejects are recorded in from now on.
- `404.html` — custom not-found page. `robots.txt`, `sitemap.xml`, `.nojekyll` — Pages plumbing.
- `.github/workflows/deploy-pages.yml` — auto-deploys to GitHub Pages on every push to `main`,
  leaving out the unused film frames and the font build script. `heartbeat.yml` — the nightly
  trading ledger append (no-op without secrets).

## Conventions

- Every page: `<title>… · ZAC Studios</title>`, a meta description, absolute `og:image` +
  `og:url` + canonical, `twitter:card`. Secondary editions (flip books, `game.html`) are
  `noindex` and canonical to their primary page.
- Google Fonts are loaded with the non-blocking preload pattern; every family uses
  `display=swap`.
- Text never renders below 12px on phones; tap targets are 44px on coarse pointers.
- Images: `loading="lazy"` + `decoding="async"` except the first one or two above the fold;
  `width`/`height` always set.

## Local preview

Open `index.html` in a browser, or (better, since the 3D pages use ES modules and an import map):

```sh
python3 -m http.server 8000
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow, which publishes the site to GitHub Pages
automatically.
