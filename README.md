# Zhang Cheng — Personal Website

A fast, dependency-free personal website. Plain HTML/CSS/JS — no build step, no framework.

## Structure

- `index.html` — the whole site (hero, projects, comics, process, contact), styles and scripts inlined
- `assets/scrub/` — frame sequence for the full-page scroll-scrubbed film background. The page scroll position is the video's timeline: scrolling down plays it forward, scrolling up rewinds. 150 JPEG frames (15 fps of a 10 s clip) drawn to a fixed canvas — frame-exact scrubbing in both directions on every browser, unlike seeking a `<video>` element. Frames load progressively (coarse sweep first) and hero typography glides with layered parallax.
- `comic/` — AI comic chapter pages
- `404.html` — custom not-found page
- `.github/workflows/deploy-pages.yml` — auto-deploys to GitHub Pages on every push to `main`

## Local preview

Open `index.html` in a browser, or:

```sh
python3 -m http.server 8000
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow, which publishes the site to GitHub Pages automatically.
