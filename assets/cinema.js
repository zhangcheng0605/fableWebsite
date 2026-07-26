/* cinema.js — film bands, scrubbed or looping.
   Each <canvas class="cinema" data-src="assets/film/city/f%04d.jpg" data-frames="140">
   sits inside a position:sticky wrapper inside a tall section. The section's
   scroll progress is the film's timeline: scrolling plays the shot forward,
   scrolling up rewinds it. Frames are JPEG stills drawn to canvas — frame-exact
   scrubbing in both directions, no <video> seek jank.

   data-loop="12" switches a band from scrubbing to playing on its own, at that
   many frames per second — used for the page background, which is a fixed
   canvas rather than a sticky band. Playback ping-pongs (forward, then back)
   so footage that wasn't cut as a loop still has no visible seam.

   Smoothness + sharpness strategy:
   - responsive source: data-src-sm (1080w) on small viewports, data-src (2304w) otherwise
   - progressive preload: every 8th frame first, then fill (6 connections)
   - nearest-loaded frame is drawn while the rest stream in; frames pre-decode
     off the main thread (img.decode) so scrub draws never block
   - eased scrub (lerp) so wheel steps feel like camera inertia
   - lazy sequences (data-lazy) only start loading when the band nears the viewport
   - one shared rAF loop; offscreen bands skip their draw entirely
   - DPR up to 2, canvas backing capped at source width (data-maxw) — no wasted
     fill-rate, no soft upscaling beyond what the footage carries
   - reduced-motion gets a static poster frame */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = Math.min(screen.width || 1e4, innerWidth) <= 820;
  var bands = [];

  function setup(canvas) {
    var src = (small && canvas.dataset.srcSm) ? canvas.dataset.srcSm : canvas.dataset.src;
    var N = parseInt(canvas.dataset.frames, 10) || 0;
    if (!src || !N) return;
    var band = {
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      section: canvas.closest('.cinema-sec') || canvas.parentElement,
      maxw: parseInt(canvas.dataset.maxw, 10) || ((small && canvas.dataset.srcSm) ? 1080 : 2736),
      N: N,
      imgs: new Array(N),
      ready: new Array(N),
      queue: [],
      qi: 0,
      inflight: 0,
      started: false,
      shown: 0,
      target: 0,
      drawn: -1,
      visible: false,
      loopFps: parseFloat(canvas.dataset.loop) || 0,
      pos: 0,
      last: 0,
      poster: Math.floor(N * (parseFloat(canvas.dataset.poster) || 0)),
      url: function (i) {
        return src.replace(/%0(\d)d/, function (_, w) {
          return String(i + 1).padStart(+w, '0');
        });
      },
    };
    for (var i = 0; i < N; i += 8) band.queue.push(i);
    band.queue.push(N - 1);
    for (var j = 0; j < N; j++) if (j % 8) band.queue.push(j);
    bands.push(band);

    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        band.visible = e.isIntersecting;
        if (e.isIntersecting && !band.started) start(band);
      });
    }, { rootMargin: '150% 0px' }).observe(band.section);

    if (!canvas.dataset.lazy) start(band);
  }

  function start(band) {
    if (band.started) return;
    band.started = true;
    pump(band);
  }

  function pump(band) {
    while (band.inflight < 6 && band.qi < band.queue.length) {
      (function (i) {
        if (band.imgs[i]) { return; }
        band.inflight++;
        var im = new Image();
        im.decoding = 'async';
        im.onload = im.onerror = function () {
          band.inflight--;
          if (im.naturalWidth) {
            /* pre-decode off the main thread so the scrub never hits a raw frame */
            var mark = function () {
              band.ready[i] = true;
              if (nearest(band, Math.round(band.shown)) === i) draw(band, i, true);
            };
            if (im.decode) im.decode().then(mark, mark);
            else mark();
          }
          pump(band);
        };
        im.src = band.url(i);
        band.imgs[i] = im;
      })(band.queue[band.qi++]);
    }
  }

  function nearest(band, i) {
    i = Math.max(0, Math.min(band.N - 1, i));
    if (band.ready[i]) return i;
    for (var d = 1; d < band.N; d++) {
      if (i - d >= 0 && band.ready[i - d]) return i - d;
      if (i + d < band.N && band.ready[i + d]) return i + d;
    }
    return -1;
  }

  function draw(band, i, force) {
    if (i < 0 || (!force && i === band.drawn)) return;
    var im = band.imgs[i];
    var c = band.canvas, ctx = band.ctx;
    var cw = c.width, ch = c.height;
    if (!cw || !ch || !im || !im.naturalWidth) return;
    var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    var w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    band.drawn = i;
  }

  function resizeAll() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    bands.forEach(function (band) {
      var r = band.canvas.getBoundingClientRect();
      var w = r.width * dpr;
      /* never exceed source resolution — full sharpness, no wasted fill-rate */
      var k = w > band.maxw ? band.maxw / w : 1;
      band.canvas.width = Math.round(w * k);
      band.canvas.height = Math.round(r.height * dpr * k);
      band.ctx.imageSmoothingEnabled = true;
      band.ctx.imageSmoothingQuality = 'high';
      draw(band, nearest(band, Math.round(band.shown)), true);
    });
  }

  function progress(band) {
    var r = band.section.getBoundingClientRect();
    var total = r.height - innerHeight;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, -r.top / total));
  }

  /* Self-playing band: advance by wall-clock time and ping-pong at the ends.
     dt is clamped so returning to a backgrounded tab resumes where it left
     off instead of jumping a thousand frames. */
  function advance(band, now) {
    var dt = band.last ? Math.min((now - band.last) / 1000, 0.1) : 0;
    band.last = now;
    band.pos += dt * band.loopFps;
    var cycle = Math.max(1, (band.N - 1) * 2);
    var f = band.pos % cycle;
    band.shown = f <= band.N - 1 ? f : cycle - f;
    band.target = band.shown;
  }

  function tick() {
    var now = performance.now();
    bands.forEach(function (band) {
      if (!band.visible) return;
      if (band.loopFps) {
        advance(band, now);
        draw(band, nearest(band, Math.round(band.shown)));
        return;
      }
      band.target = progress(band) * (band.N - 1);
      band.shown += (band.target - band.shown) * 0.16;
      if (Math.abs(band.target - band.shown) < 0.01) band.shown = band.target;
      draw(band, nearest(band, Math.round(band.shown)));
      /* decode-ahead: warm the frames the eased scrub is heading toward, so
         draws hit pre-decoded images instead of blocking on a sync decode */
      if (Math.abs(band.target - band.shown) > 0.4) {
        var dir = band.target >= band.shown ? 1 : -1;
        var base = Math.round(band.shown);
        for (var k = 1; k <= 12; k++) {
          var idx = base + dir * k;
          if (idx < 0 || idx >= band.N) break;
          var im = band.imgs[idx];
          if (im && im.complete && im.naturalWidth && im.decode) im.decode().catch(function () {});
        }
      }
    });
    requestAnimationFrame(tick);
  }

  function init() {
    document.querySelectorAll('canvas.cinema').forEach(setup);
    if (!bands.length) return;
    resizeAll();
    addEventListener('resize', resizeAll);
    if (reduce) {
      /* static poster frame per band, no scrubbing */
      bands.forEach(function (band) {
        start(band);
        var p = band.poster;
        var im = new Image();
        im.onload = function () {
          band.imgs[p] = im; band.ready[p] = true; draw(band, p, true);
        };
        im.src = band.url(p);
        band.shown = p;
      });
      return;
    }
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();
})();
