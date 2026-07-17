# Zhang Cheng — Personal Website

A fast, dependency-free personal website. Plain HTML/CSS/JS — no build step, no framework.

## Structure

- `index.html` — the whole site (hero, about, work, contact)
- `assets/style.css` — styling, dark/light themes, animations
- `assets/script.js` — theme toggle, scroll engine (hero parallax, marquee, pinned horizontal work gallery), reveals, counters, card tilt
- `404.html` — custom not-found page
- `.github/workflows/deploy-pages.yml` — auto-deploys to GitHub Pages on every push to `main`

## Local preview

Open `index.html` in a browser, or:

```sh
python3 -m http.server 8000
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow, which publishes the site to GitHub Pages automatically.
