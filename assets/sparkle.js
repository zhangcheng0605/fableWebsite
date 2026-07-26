/* sparkle.js — fairy-dust layer for the landing page.
   One fixed canvas above everything (pointer-events:none). Three sources of
   sparkle, all pooled into the same particle list:
     1. trail    — moving the pointer (mouse or finger) sheds fairies, flowers
                   and stars along the path
     2. scroll   — every scroll tick sprinkles a little burst at the last known
                   pointer position, so the page glitters while you scroll
     3. ambient  — an occasional lone sparkle anywhere, so the page is never
                   completely still
   Everything is emoji drawn with fillText — no image assets. The rAF loop
   only runs while particles exist; reduced motion turns the whole file off. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.getElementById('fairydust');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  function size() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  /* sparkles are common; fairies, butterflies and flowers are the treat */
  var GLYPHS = ['✨', '✨', '✨', '⭐', '🌟', '💫', '🌸', '🌺', '🌼', '💖', '🫧', '🦋', '🧚'];
  var FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  var P = [], MAX = 130, running = false, last = 0;

  function spawn(x, y, n, burst) {
    for (var i = 0; i < n && P.length < MAX; i++) {
      var g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      var big = g === '🧚' || g === '🦋' || g === '💖';
      P.push({
        g: g,
        x: x + (Math.random() - 0.5) * 26,
        y: y + (Math.random() - 0.5) * 26,
        vx: (Math.random() - 0.5) * (burst ? 3.4 : 1.1),
        vy: -(0.5 + Math.random() * (burst ? 2.6 : 1.3)),
        rot: (Math.random() - 0.5) * 1.2,
        vr: (Math.random() - 0.5) * 0.08,
        s: 13 + Math.random() * (big ? 20 : 13),
        t: 0,
        life: 900 + Math.random() * 900,
        tw: Math.random() * 6.28,
      });
    }
    if (!running && P.length) {
      running = true;
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    if (!P.length) { running = false; ctx.clearRect(0, 0, W, H); return; }
    var dt = Math.min(now - last, 50);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (var i = P.length - 1; i >= 0; i--) {
      var p = P[i];
      p.t += dt;
      if (p.t >= p.life) { P.splice(i, 1); continue; }
      var f = dt / 16;
      p.x += p.vx * f; p.y += p.vy * f;
      p.vy += 0.006 * f;      // gravity gently curbs the rise
      p.vx *= 0.995;
      p.rot += p.vr * f;
      var k = p.t / p.life;
      var a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;   // fade in, long fade out
      a *= 0.78 + 0.22 * Math.sin(p.t / 90 + p.tw);          // twinkle
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.font = p.s.toFixed(0) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.g, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }

  /* trail — throttled by distance travelled, so slow drifts still sparkle
     and fast sweeps don't flood the pool */
  var lx = W * 0.5, ly = H * 0.4, px = lx, py = ly, walked = 0;
  window.addEventListener('pointermove', function (e) {
    lx = e.clientX; ly = e.clientY;
    walked += Math.hypot(e.clientX - px, e.clientY - py);
    px = e.clientX; py = e.clientY;
    if (walked > 26) { walked = 0; spawn(lx, ly, 1); }
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    spawn(e.clientX, e.clientY, 12, true);
  }, { passive: true });

  /* scroll — glitter at the pointer (or the finger: touch drags fire
     pointermove first, so lx/ly is where the thumb is) */
  var lastScrollSpawn = 0;
  window.addEventListener('scroll', function () {
    var now = performance.now();
    if (now - lastScrollSpawn > 90) { lastScrollSpawn = now; spawn(lx, ly, 2); }
  }, { passive: true });

  /* ambient — a lone sparkle somewhere, every so often */
  setInterval(function () {
    if (document.hidden) return;
    spawn(Math.random() * W, H * (0.2 + Math.random() * 0.65), 1);
  }, 900);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) P.length = 0;
  });
})();
