/* ink-array.js — 水墨字阵, the ink character array under the ZAC Studios mark.
   Several hundred tiny Chinese glyphs fly along bowed arcs and settle into the
   shape of a larger character: 扎 · 克 · 工 · 作 · 室, then all five at once.

   Ported from a standalone full-screen piece. Four things had to change to make
   it a citizen of this page rather than a takeover:

     1. It was a viewport takeover — fixed canvas, body overflow:hidden, and the
        wheel / swipe / arrow keys all bound to window to change formation. On a
        page that scrolls, that is a scroll thief. Nothing global is bound now:
        the formation advances on its own, on a click, or from the chips below,
        and arrow keys only work once the widget is focused.
     2. It was ink-on-paper — #1c1813 with a cinnabar #9e2b1f accent over a warm
        paper vignette and a multiply grain. Both overlays are gone (they only
        muddied the aurora) and the glyphs now carry the page's own violet with
        pink, cyan and gold accents, weighted so the mass reads violet and the
        accents quote the three stamps above.
     3. It was 1500 particles at full-viewport size, next to a WebGL logo and a
        sparkle layer. The count now scales with the band and the device, the
        loop parks when the band is off-screen, and reduced motion gets a still.
     4. The font was 16 MB of Noto Serif SC subsets. assets/fonts/zacink.woff2
        is the same face cut to the 72 glyphs this piece actually draws: 15 KB.

   Interactions: the pointer pushes the ink aside and it drifts back, a click
   scatters the whole array and lets it re-gather, and each chip jumps to its
   formation. */

const root = document.querySelector('.ink-array');
if (root) boot();

function boot() {
  const canvas = root.querySelector('.ink-canvas');
  const movesEl = root.querySelector('.ink-moves');
  const ctx = canvas.getContext('2d');
  const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = matchMedia('(pointer: coarse)').matches;

  const NUM = ['壹', '贰', '叁', '肆', '伍', '陆'];
  // The whole name lands first, then it unfolds one character at a time —
  // 起式 opens, 收式 closes, the way a form is counted.
  const STAGES = [
    { glyphs: '扎克工作室', name: '起式 · 归一', en: 'ZAC Studios' },
    { glyphs: '扎', name: '二式 · 扎', en: 'Zha' },
    { glyphs: '克', name: '三式 · 克', en: 'Ke' },
    { glyphs: '工', name: '四式 · 工', en: 'Gong' },
    { glyphs: '作', name: '五式 · 作', en: 'Zuo' },
    { glyphs: '室', name: '收式 · 室', en: 'Shi' },
  ];
  // craft / art / spirit words — the ink the larger characters are drawn with
  const POOL = '扎克工作室墨艺创匠心影光形意象美灵感造梦视觉设计韵神气风雅境妙巧思品质道法笔纸砚彩绘塑构'.split('');
  // page tokens, weighted: the mass reads violet, the accents quote the stamps
  const INKS = [
    ['#6428d8', 0.56], ['#8b3dff', 0.20], ['#ff3fae', 0.13],
    ['#25c4ff', 0.08], ['#ffb830', 0.03],
  ];
  const FONT = '"ZacInk", "Noto Serif SC", serif';
  const SIZES = [9, 12, 15, 19];

  let W = 0, H = 0, N = 0;
  let glyphScale = 1;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function pickInk() {
    let r = Math.random();
    for (let i = 0; i < INKS.length; i++) { r -= INKS[i][1]; if (r <= 0) return i; }
    return 0;
  }

  // ---- sprite atlas: every pool glyph pre-rendered per size and per ink ----
  const sprites = new Map();
  function buildSprites() {
    sprites.clear();
    for (const ch of POOL) {
      SIZES.forEach((s, si) => {
        INKS.forEach(([col], ci) => {
          const pad = 4, d = Math.ceil((s + pad * 2) * DPR);
          const c = document.createElement('canvas');
          c.width = c.height = d;
          const g = c.getContext('2d');
          g.scale(DPR, DPR);
          g.font = `900 ${s}px ${FONT}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = col;
          g.fillText(ch, d / DPR / 2, d / DPR / 2 + 1);
          sprites.set(ch + '|' + si + '|' + ci, { c, half: d / DPR / 2 });
        });
      });
    }
  }

  // ---- sample the target points that spell a formation ----
  function samplePoints(text) {
    const mw = 900, mh = 600;
    const mc = document.createElement('canvas');
    mc.width = mw; mc.height = mh;
    const g = mc.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let fs = text.length === 1 ? 520 : Math.min(210, (mw * 0.94) / text.length);
    g.font = `900 ${fs}px ${FONT}`;
    if (text.length > 1) {
      const tw = g.measureText(text).width;
      if (tw > mw * 0.96) { fs *= (mw * 0.96) / tw; g.font = `900 ${fs}px ${FONT}`; }
    }
    g.fillText(text, mw / 2, mh / 2);
    const data = g.getImageData(0, 0, mw, mh).data;
    const raw = [];
    const step = 3;
    for (let y = 0; y < mh; y += step)
      for (let x = 0; x < mw; x += step)
        if (data[(y * mw + x) * 4 + 3] > 128) raw.push([x, y]);
    if (!raw.length) return new Array(N).fill(0).map(() => [W / 2, H / 2]);
    for (let i = raw.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [raw[i], raw[j]] = [raw[j], raw[i]];
    }
    // Fit the ink, not the mask box. One square character and a five-character
    // row want very different scales inside the same wide, short band; fitting
    // the 900x600 box would leave a single glyph stranded in the middle of it.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of raw) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const iw = x1 - x0 || 1, ih = y1 - y0 || 1;
    const sc = Math.min((W * 0.9) / iw, (H * 0.84) / ih);
    const ox = (W - iw * sc) / 2 - x0 * sc;
    const oy = (H - ih * sc) / 2 - y0 * sc;
    // Five characters on one line stand a third as tall as a single one, so
    // their strokes are a third as wide. Drawn with the same size ink the row
    // turns to mush — shrink the glyphs to match the stroke they have to fill.
    glyphScale = Math.max(0.5, Math.min(1.1, (ih * sc) / 240));
    const pts = new Array(N);
    for (let i = 0; i < N; i++) {
      const p = raw[i % raw.length];
      pts[i] = [
        p[0] * sc + ox + (Math.random() - 0.5) * step * sc,
        p[1] * sc + oy + (Math.random() - 0.5) * step * sc,
      ];
    }
    return pts;
  }

  // ---- particles ----
  const parts = [];
  function initParticles() {
    parts.length = 0;
    for (let i = 0; i < N; i++) {
      const ci = pickInk();
      parts.push({
        ch: POOL[(Math.random() * POOL.length) | 0],
        si: (Math.random() * SIZES.length) | 0,
        ci,
        alpha: ci === 0 ? 0.44 + Math.random() * 0.46 : 0.72 + Math.random() * 0.28,
        x: Math.random() * W, y: Math.random() * H,
        sx: 0, sy: 0, tx: 0, ty: 0, cx: 0, cy: 0,
        ox: 0, oy: 0,               // pointer-push offset, springs back to zero
        delay: 0, dur: 1, t0: 0,
        phase: Math.random() * Math.PI * 2,
        fAmp: 1.2 + Math.random() * 2.4,
        fSpd: 0.4 + Math.random() * 0.7,
      });
    }
  }

  let stageIdx = -1;
  let transitioning = false;

  function goTo(idx, { scatter = false, instant = false } = {}) {
    idx = ((idx % STAGES.length) + STAGES.length) % STAGES.length;
    const pts = samplePoints(STAGES[idx].glyphs);
    stageIdx = idx;
    const now = performance.now();
    for (let i = 0; i < N; i++) {
      const p = parts[i], t = pts[i];
      if (scatter) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.max(W, H) * (0.45 + Math.random() * 0.5);
        p.sx = W / 2 + Math.cos(a) * r;
        p.sy = H / 2 + Math.sin(a) * r;
      } else {
        p.sx = p.x; p.sy = p.y;
      }
      p.tx = t[0]; p.ty = t[1];
      // bow the path so the ink sweeps in rather than sliding straight
      const mx = (p.sx + p.tx) / 2, my = (p.sy + p.ty) / 2;
      const dx = p.tx - p.sx, dy = p.ty - p.sy;
      const len = Math.hypot(dx, dy) || 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      const bow = side * (0.25 + Math.random() * 0.55) * Math.min(len, 420);
      p.cx = mx - (dy / len) * bow;
      p.cy = my + (dx / len) * bow;
      p.delay = instant ? 0 : Math.random() * 420;
      p.dur = instant ? 1 : 900 + Math.random() * 620;
      p.t0 = now;
      if (instant) { p.x = p.tx; p.y = p.ty; }
    }
    transitioning = !instant;
    updateUI();
  }

  // ---- chips ----
  const chips = STAGES.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ink-move';
    b.innerHTML = `<span class="num">${NUM[i]}</span><span class="name">${s.name}</span>`;
    // Reduced motion still gets to choose a formation — it just arrives
    // already formed instead of flying in.
    b.addEventListener('click', () => {
      if (STILL) { goTo(i, { instant: true }); drawStill(); return; }
      nudge(); goTo(i);
    });
    movesEl.appendChild(b);
    return b;
  });
  function updateUI() {
    chips.forEach((el, i) => {
      const on = i === stageIdx;
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const s = STAGES[stageIdx];
    if (s) canvas.setAttribute('aria-label',
      `Ink character array forming ${s.glyphs} — ${s.en}. Formation ${stageIdx + 1} of ${STAGES.length}.`);
  }

  // ---- input: nothing global, nothing that eats a scroll ----
  let nextAt = 0;
  const DWELL = 4600;
  function nudge() { nextAt = performance.now() + DWELL * 1.7; }

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    ptr.on = true;
  });
  canvas.addEventListener('pointerleave', () => { ptr.on = false; });
  canvas.addEventListener('click', () => { nudge(); goTo(stageIdx, { scatter: true }); });
  // Arrow keys only once the widget is focused — never bound to window.
  root.addEventListener('keydown', (e) => {
    let d = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = -1;
    else return;
    e.preventDefault();
    if (STILL) { goTo(stageIdx + d, { instant: true }); drawStill(); return; }
    nudge();
    goTo(stageIdx + d);
  });

  const ptr = { x: 0, y: 0, on: false };
  const PUSH_R = 92, PUSH_R2 = PUSH_R * PUSH_R;

  // ---- render ----
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // One throw in here used to end the animation for the life of the page —
  // rAF simply stops rescheduling and nothing ever revives it. Absorb it: log
  // the first few, and only give up if it is failing every frame.
  function frame(now) {
    try {
      drawFrame(now);
    } catch (err) {
      if (++frameErrs <= 3) console.error('[ink-array] frame error:', err);
      if (frameErrs > 90) { stop(); return; }
    }
    raf = requestAnimationFrame(frame);
  }

  function drawFrame(now) {
    ctx.clearRect(0, 0, W, H);
    const t = now / 1000;
    let moving = false;
    for (let i = 0; i < N; i++) {
      const p = parts[i];
      const el = now - p.t0 - p.delay;
      if (transitioning && el < p.dur) {
        moving = true;
        const u = el <= 0 ? 0 : easeInOut(el / p.dur);
        const v = 1 - u;
        p.x = v * v * p.sx + 2 * v * u * p.cx + u * u * p.tx;
        p.y = v * v * p.sy + 2 * v * u * p.cy + u * u * p.ty;
      } else {
        p.x = p.tx; p.y = p.ty;
      }
      // the pointer shoulders the ink aside; it springs back when the hand moves on
      if (ptr.on) {
        const dx = p.x + p.ox - ptr.x, dy = p.y + p.oy - ptr.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < PUSH_R2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / PUSH_R) * 26;
          p.ox += (dx / d) * f * 0.16;
          p.oy += (dy / d) * f * 0.16;
        }
      }
      p.ox *= 0.9; p.oy *= 0.9;
      const bx = Math.sin(t * p.fSpd + p.phase) * p.fAmp;
      const by = Math.cos(t * p.fSpd * 0.8 + p.phase * 1.7) * p.fAmp;
      const sp = sprites.get(p.ch + '|' + p.si + '|' + p.ci);
      const h = sp.half * glyphScale;
      ctx.globalAlpha = p.alpha * (0.88 + 0.12 * Math.sin(t * 0.9 + p.phase));
      ctx.drawImage(sp.c, p.x + p.ox + bx - h, p.y + p.oy + by - h, h * 2, h * 2);
    }
    ctx.globalAlpha = 1;
    if (transitioning && !moving) transitioning = false;
    // it keeps playing on its own
    if (!transitioning && now > nextAt) {
      nextAt = now + DWELL;
      goTo(stageIdx + 1);
    }
  }

  function drawStill() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < N; i++) {
      const p = parts[i];
      const sp = sprites.get(p.ch + '|' + p.si + '|' + p.ci);
      const h = sp.half * glyphScale;
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(sp.c, p.tx - h, p.ty - h, h * 2, h * 2);
    }
    ctx.globalAlpha = 1;
  }

  function measure() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // Density follows the band, not a full viewport. The count has to satisfy
    // the hungriest formation — five characters cover ~2.5x the ink area of one
    // — so single characters simply come out richer.
    const want = Math.round((W * H) / (COARSE ? 260 : 140));
    N = Math.max(420, Math.min(COARSE ? 780 : 1700, want));
  }

  let raf = 0;
  let started = false;
  // The observers below are wired up before the font resolves, so both of these
  // gate the loop: without `ready` the intersection callback can start drawing
  // against an empty sprite atlas, and without `visible` the boot path can start
  // it for a band that is already scrolled past.
  let ready = false;
  let visible = true;
  let booted = false;
  let introPlayed = false;
  let frameErrs = 0;
  // whether the atlas was cut with the real face, so the late-arrival upgrade
  // below only ever runs once
  let usedFace = false;
  function start() {
    if (started || STILL || !ready || !visible) return;
    started = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    started = false;
    cancelAnimationFrame(raf);
    // Whatever half-finished frame was on the canvas stays there once rAF
    // stops. Parking mid-fly-in — which is exactly what happens when the band
    // boots below the fold — would leave the particles off-canvas and the band
    // opaque but empty. Settle it instead: parked should read as "formed".
    if (booted && sprites.size) {
      try { drawStill(); } catch (err) { /* nothing better to do here */ }
    }
  }

  let resizeT = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      // fires on first observation too, which can beat the font — boot does its
      // own measure(), so there is nothing to do until the atlas exists
      if (!sprites.size) return;
      const before = N;
      measure();
      if (N !== before) initParticles();
      goTo(stageIdx < 0 ? 0 : stageIdx, { instant: true });
      // goTo only moves the particles; the canvas is repainted by the loop. If
      // the loop is not running — reduced motion, or the band is parked because
      // it booted below the fold — nothing would repaint it and the resize
      // would leave it blank.
      if (STILL || !started) drawStill();
    }, 140);
  }).observe(canvas);

  new IntersectionObserver((es) => {
    // read the newest entry, not the oldest — a batch can hold several
    visible = es[es.length - 1].isIntersecting;
    if (visible) {
      // The fly-in is timestamped when it is queued, so if the band booted
      // below the fold that intro has already expired by the time anyone looks
      // at it. Replay it the first time it is actually on screen.
      if (booted && !introPlayed && !STILL) { introPlayed = true; goTo(0, { scatter: true }); }
      nextAt = performance.now() + DWELL;
      start();
    } else { stop(); ptr.on = false; }
  }, { threshold: 0 }).observe(root);

  // ---- boot ----
  // The mask and the sprite atlas both want the real face, so we wait for it —
  // but only for so long. Waiting unbounded is what made this band vanish: the
  // canvas is opacity:0 until a class lands at the end of this callback, so a
  // woff2 request that STALLS rather than fails (hung socket, captive portal,
  // a proxy that swallows it) meant the promise never settled, the callback
  // never ran, and the hero showed a silent empty gap with nothing in the
  // console. font-display:swap could not help — nothing here is rendered text.
  //
  // So: deadline the wait, draw with whatever face is in hand, and re-cut the
  // atlas if the real one turns up later. Font loading can delay how good this
  // looks; it can no longer decide whether anything appears at all.
  const FONT_DEADLINE = 2000;
  const withFont = Promise.all([
    document.fonts.load('900 100px "ZacInk"', '扎克工作室'),
    document.fonts.load('900 16px "ZacInk"', '墨艺'),
  ]).catch(() => {});

  Promise.race([
    withFont,
    new Promise((r) => setTimeout(r, FONT_DEADLINE)),
  ]).then(paint, paint);

  function paint() {
    if (booted) return;
    booted = true;
    // Reveal FIRST. Everything below allocates — ~920 sprite canvases and a
    // 900x600 mask read — while the WebGL logo is allocating too, and a throw
    // in any of it used to strand the band invisible forever. Whatever happens
    // after this line, the band is at least visible and the chips are usable.
    root.classList.add(STILL ? 'is-still' : 'is-live');
    try {
      measure();
      buildSprites();
      initParticles();
      if (STILL) {
        // no motion, so hold the formation that says the most: the full name
        goTo(0, { instant: true });
        drawStill();
        return;
      }
      usedFace = document.fonts.check('900 16px "ZacInk"', '墨');
      goTo(0, { scatter: true });
      nextAt = performance.now() + DWELL * 1.5;
      ready = true;
      start();
      // Below the fold at load, start() correctly declines and nothing would be
      // drawn — an opaque, empty band. Paint the settled formation so there is
      // always something there; the fly-in replays when it scrolls into view.
      if (!started) drawStill();
      else introPlayed = true;
    } catch (err) {
      console.error('[ink-array] boot failed, band left blank:', err);
    }
  }

  // If the face arrives after the deadline we drew without it — re-cut the
  // atlas and re-sample the mask so it upgrades in place.
  document.fonts.ready.then(() => {
    if (!booted || !sprites.size) return;
    if (usedFace || !document.fonts.check('900 16px "ZacInk"', '墨')) return;
    usedFace = true;
    buildSprites();
    goTo(stageIdx < 0 ? 0 : stageIdx, { instant: true });
    if (STILL) drawStill();
  }).catch(() => {});
}
