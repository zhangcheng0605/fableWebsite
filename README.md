# Zhang Cheng — Personal Website

A fast, dependency-free personal website. Plain HTML/CSS/JS — no build step, no framework.

## Structure

The landing page is three blocks over a looping film: **manga**, **projects**, **experience**.
Each project keeps its own page and its own detail.

- `index.html` — the landing page: hero, `#manga` (every series and chapter, with thumbnails),
  `#projects` (the three tiles), `#experience`, `#contact`. Styles and scripts inlined.
- `assets/cinema.js` — the film engine. A `<canvas class="cinema">` with `data-src`/`data-frames`
  either **scrubs** with scroll (frame-exact in both directions, no `<video>` seek jank) or, with
  `data-loop="12"`, **plays itself** at that many fps. The landing page uses the loop mode for its
  fixed background and ping-pongs the shot so unlooped footage has no seam. Frames load
  progressively (every 8th first), pre-decode off the main thread, and reduced motion gets a
  single still.
- `assets/film/` — the frame sequences (`city`, `gate`, `vanguard`, each with a `-sm` 1080-wide
  variant). The background loop uses `city-sm`: it is on screen the whole time, so weight beats
  sharpness there.
- `assets/fx.js` / `assets/fx.css` — pointer-reactive tilt, glow and magnetic buttons; self-disable
  under reduced motion and on coarse pointers.
- `campus/` — the 3D campus: a media campus assembled by scroll, written in code rather than
  loaded from a model file. `campus.js` is the scene, `three-d-stage.js` the WebGL shell,
  `controls.js` the look-and-light panel, `vendor/three/` a pinned copy of three.js r184 (see the
  README there) so the page needs no CDN.
- `trading/` — the autonomous trading desk: bots, routines, P&L, risk engine, postmortem.
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
