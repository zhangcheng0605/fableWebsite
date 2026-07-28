# Zhang Cheng — Personal Website

A fast, dependency-free personal website. Plain HTML/CSS/JS — no build step, no framework.

## Structure

The landing page is four full-width blocks on a bright candy-neon theme: **manga**,
**projects**, **3D projects**, **experience**. Each project keeps its own page and its own detail.

- `index.html` — the landing page: hero, rainbow marquee, `#manga` (every series and chapter,
  with thumbnails), `#projects` (the cards), `#three-d` (the 3D category, two cards),
  `#experience`, `#contact`. Full-bleed bands over an animated aurora background; one
  dark-violet ink colour for all text. Styles and scripts inlined.
- `assets/sparkle.js` — the fairy-dust layer: an emoji particle canvas that trails the pointer
  (or finger), sprinkles on every scroll tick, and drops an occasional ambient sparkle. The
  rAF loop only runs while particles exist; reduced motion disables the whole file.
- `assets/cinema.js` + `assets/film/` — the scroll-scrub/loop film engine and frame sequences
  from the previous dark design. No page uses them right now; kept for easy revert.
- `assets/fx.js` / `assets/fx.css` — pointer-reactive tilt, glow and magnetic buttons; self-disable
  under reduced motion and on coarse pointers.
- `campus/` — the 3D campus: a media campus assembled by scroll, written in code rather than
  loaded from a model file. `campus.js` is the scene, `three-d-stage.js` the WebGL shell,
  `controls.js` the look-and-light panel, `vendor/three/` a pinned copy of three.js r184 (see the
  README there) so the page needs no CDN. This folder holds the shared 3D plumbing: the other
  3D project and the homepage's hero mark import `three-d-stage.js` and `vendor/three/` from here.
- `tiananmen/` — the second 3D project: 天安门, the Gate of Heavenly Peace, raised phase by phase
  as you scroll, then the whole square behind it. Same rules as the campus — no model files, no
  image files, every texture painted into a `<canvas>` at runtime — and the same export to
  GLB / OBJ. `tiananmen.js` is the scene; it borrows `campus/three-d-stage.js` and
  `campus/vendor/three/`. Both pages are grouped as **3D Projects** (`#three-d`) on the homepage.
- `trading/` — the autonomous trading desk: bots, routines, P&L, risk engine, postmortem.
- `influencer/` — the virtual influencer: a likeness model trained on my own face, the pipeline
  behind it, and the identity gate that scores every frame before it ships. Media are placeholder
  `.slot` divs, each labelled with the aspect ratio it expects; `[RATE]` in the brands section
  still needs prices. `assets/thumbs/influencer.svg` is a stand-in for the card thumbnail.
- `prompt-injection/` — a typing-defence game (`game.html`) with its build story.
- `onesheet/` — a spreadsheet engine in a single offline HTML file.
- `seen/`, `seen2/`, `seen3/` — *SEEN*, chapters 1–3. `comic/`, `comic2/`, `comic3/` — *Witch of the
  Vending Machines*, chapters 1–3. `rich/` — *Born Rich*, a one-shot.
- `404.html` — custom not-found page
- `.github/workflows/deploy-pages.yml` — auto-deploys to GitHub Pages on every push to `main`

## Local preview

Open `index.html` in a browser, or (better, since `campus/` uses ES modules and an import map):

```sh
python3 -m http.server 8000
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow, which publishes the site to GitHub Pages
automatically.
