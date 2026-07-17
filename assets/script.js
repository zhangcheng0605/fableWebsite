// ---------- theme toggle (persisted, defaults to system preference) ----------
const root = document.documentElement;
const stored = localStorage.getItem("theme");
if (stored) {
  root.dataset.theme = stored;
} else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
  root.dataset.theme = "light";
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const wideScreen = window.matchMedia("(min-width: 821px)");

// ---------- hero intro (masked line reveal) ----------
requestAnimationFrame(() => document.body.classList.add("loaded"));

// ---------- reveal-on-scroll ----------
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal:not(.section-title)").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`;
  observer.observe(el);
});

// Section titles hide via clip-path, which zeroes their visible area —
// IntersectionObserver would never see them intersect. Observe the parent.
const titleObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.querySelector(".section-title").classList.add("visible");
      titleObserver.unobserve(entry.target);
    }
  },
  { threshold: 0.1 }
);
document.querySelectorAll(".section-title.reveal").forEach((el) => titleObserver.observe(el.parentElement));

// ---------- animated counters ----------
const counterObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const duration = 1200;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    }
  },
  { threshold: 0.5 }
);
document.querySelectorAll(".stat-num[data-count]").forEach((el) => counterObserver.observe(el));

// ---------- scroll engine ----------
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (a, b, t) => a + (b - a) * t;

const progressBar = document.getElementById("progressBar");
const heroInner = document.getElementById("heroInner");
const marqueeTrack = document.getElementById("marqueeTrack");
const workPin = document.getElementById("work");
const workTrack = document.getElementById("workTrack");
const blobs = document.querySelectorAll(".blob");
const scrubPin = document.getElementById("motion");
const scrubCanvas = document.getElementById("scrubCanvas");
const scrubCtx = scrubCanvas.getContext("2d");

// Frame-sequence scrub: individual JPEGs drawn to a canvas. Frame-exact
// in both directions and immune to video-codec seeking quirks.
const SCRUB_FRAMES = 120;
const scrubImages = [];
let scrubCurrent = -1;

function drawScrubFrame(i) {
  // while frames stream in, fall back to the nearest loaded one
  let j = i;
  if (!scrubImages[j].naturalWidth) {
    for (let d = 1; d < SCRUB_FRAMES; d++) {
      const lo = scrubImages[j - d], hi = scrubImages[j + d];
      if (lo && lo.naturalWidth) { j = j - d; break; }
      if (hi && hi.naturalWidth) { j = j + d; break; }
    }
  }
  if (!scrubImages[j] || !scrubImages[j].naturalWidth || j === scrubCurrent) return;
  scrubCurrent = j;
  scrubCtx.drawImage(scrubImages[j], 0, 0, scrubCanvas.width, scrubCanvas.height);
}

for (let i = 0; i < SCRUB_FRAMES; i++) {
  const img = new Image();
  img.src = `assets/scrub/f${String(i).padStart(4, "0")}.jpg`;
  if (i === 0) img.onload = () => drawScrubFrame(0);
  scrubImages.push(img);
}

// The pinned gallery needs the section to be tall enough to "absorb"
// the horizontal travel; measured from real track width.
let workDistance = 0;
function layoutWork() {
  if (reduceMotion || !wideScreen.matches) {
    workPin.style.height = "";
    workTrack.style.transform = "";
    workDistance = 0;
    return;
  }
  workDistance = Math.max(workTrack.scrollWidth - window.innerWidth, 0);
  workPin.style.height = `${window.innerHeight + workDistance}px`;
}
layoutWork();
window.addEventListener("resize", layoutWork);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutWork);

if (!reduceMotion) {
  let smoothY = window.scrollY;

  const frame = () => {
    const y = window.scrollY;
    smoothY = lerp(smoothY, y, 0.14);
    if (Math.abs(smoothY - y) < 0.1) smoothY = y;
    const vh = window.innerHeight;

    // progress bar
    const docH = document.documentElement.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${docH ? clamp(y / docH, 0, 1) : 0})`;

    // hero exits with parallax, fade and slight shrink
    if (smoothY < vh * 1.3) {
      const p = clamp(smoothY / (vh * 0.85), 0, 1);
      heroInner.style.transform = `translateY(${smoothY * 0.32}px) scale(${1 - p * 0.12})`;
      heroInner.style.opacity = `${1 - p}`;
    }

    // aurora blobs drift at different depths (CSS `translate` composes
    // with their keyframe `transform` animation)
    if (blobs[0]) blobs[0].style.translate = `0 ${smoothY * -0.06}px`;
    if (blobs[1]) blobs[1].style.translate = `0 ${smoothY * 0.1}px`;
    if (blobs[2]) blobs[2].style.translate = `0 ${smoothY * -0.04}px`;

    // marquee: position follows scroll, skew follows scroll velocity
    if (marqueeTrack) {
      const half = marqueeTrack.scrollWidth / 2;
      const x = half ? -((smoothY * 0.55) % half) : 0;
      const skew = clamp((y - smoothY) * 0.06, -7, 7);
      marqueeTrack.style.transform = `translateX(${x}px) skewX(${skew}deg)`;
    }

    // pinned work gallery: vertical scroll becomes horizontal travel
    if (workDistance > 0) {
      const p = clamp((smoothY - workPin.offsetTop) / workDistance, 0, 1);
      workTrack.style.transform = `translateX(${-p * workDistance}px)`;
    }

    // scroll-scrubbed clip: scroll position IS the playhead, so
    // scrolling up plays it backward (smoothY makes it glide)
    {
      const travel = scrubPin.offsetHeight - vh;
      const p = clamp((smoothY - scrubPin.offsetTop) / travel, 0, 1);
      drawScrubFrame(Math.round(p * (SCRUB_FRAMES - 1)));
      scrubCanvas.style.transform = `scale(${(0.92 + p * 0.08).toFixed(4)})`;
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- 3D card tilt + magnetic buttons (mouse only) ----------
if (finePointer && !reduceMotion) {
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(900px) translateY(-6px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2;
      const dy = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });
}

// ---------- footer year ----------
document.getElementById("year").textContent = new Date().getFullYear();
