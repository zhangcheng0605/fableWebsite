/* cinema.js — scroll-scrubbed film bands.
   Each <canvas class="cinema" data-src="assets/film/city/f%04d.jpg" data-frames="140">
   sits inside a position:sticky wrapper inside a tall section. The section's
   scroll progress is the film's timeline: scrolling plays the shot forward,
   scrolling up rewinds it. Frames are JPEG stills drawn to canvas — frame-exact
   scrubbing in both directions, no <video> seek jank.

   Smoothness strategy:
   - progressive preload: every 8th frame first, then fill (6 connections)
   - nearest-loaded frame is drawn while the rest stream in
   - eased scrub (lerp) so wheel steps feel like camera inertia
   - lazy sequences (data-lazy) only start loading when the band nears the viewport
   - one shared rAF loop; offscreen bands skip their draw entirely
   - DPR capped at 1.5; reduced-motion gets a static poster frame */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bands = [];

  function setup(canvas) {
    var src = canvas.dataset.src;
    var N = parseInt(canvas.dataset.frames, 10) || 0;
    if (!src || !N) return;
    var band = {
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      section: canvas.closest('.cinema-sec') || canvas.parentElement,
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
            band.ready[i] = true;
            if (nearest(band, Math.round(band.shown)) === i) draw(band, i, true);
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
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    bands.forEach(function (band) {
      var r = band.canvas.getBoundingClientRect();
      band.canvas.width = Math.round(r.width * dpr);
      band.canvas.height = Math.round(r.height * dpr);
      draw(band, nearest(band, Math.round(band.shown)), true);
    });
  }

  function progress(band) {
    var r = band.section.getBoundingClientRect();
    var total = r.height - innerHeight;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, -r.top / total));
  }

  function tick() {
    bands.forEach(function (band) {
      if (!band.visible) return;
      band.target = progress(band) * (band.N - 1);
      band.shown += (band.target - band.shown) * 0.16;
      if (Math.abs(band.target - band.shown) < 0.01) band.shown = band.target;
      draw(band, nearest(band, Math.round(band.shown)));
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
