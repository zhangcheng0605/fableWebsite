/* fx.js — Antigravity-inspired dynamic interaction layer.
   Three forces, one rAF loop:
     1. tilt      — cards lean toward the pointer in 3D, with a tracking light (.fx-glow)
     2. magnetic  — buttons are attracted to the pointer and spring back on release
     3. float     — marked elements drift weightlessly on a slow sine
   All motion is transform/opacity only. Disabled wholesale under
   prefers-reduced-motion; pointer effects require a fine (mouse) pointer. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  var TILT = ['.card', '.sib', '.chapter', '.stat', '.tile', '.rt', '.risk-card', '.incident'];
  var GLOW = TILT.concat(['.acct', '.chart-card', '.finding', '.desk', '.bot', '.comic-feature']);
  var MAGNET = ['.btn', '.back'];
  var FLOAT = ['.hero-terminal', '.paper-badge'];

  var MAX_TILT = 8;      // deg
  var LIFT = -6;         // px, matches the CSS hover lift
  var MAG_PULL = 0.3;   // fraction of pointer offset
  var MAG_MAX = 10;       // px
  var FLOAT_AMP = 7;     // px
  var FLOAT_PERIOD = 5000; // ms

  function $all(sels) {
    var seen = [];
    sels.forEach(function (s) {
      document.querySelectorAll(s).forEach(function (el) {
        if (seen.indexOf(el) === -1) seen.push(el);
      });
    });
    return seen;
  }
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var states = new Map(); // el -> state
  var active = new Set(); // elements needing frames
  var running = false;

  function state(el) {
    var s = states.get(el);
    if (!s) {
      s = { rx: 0, ry: 0, trx: 0, try_: 0, lift: 0, tlift: 0,
            mx: 0, my: 0, tmx: 0, tmy: 0, phase: 0, float_: false,
            mode: '', hover: false };
      states.set(el, s);
    }
    return s;
  }
  function wake(el) {
    active.add(el);
    el.classList.add('fx-active');
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function frame(now) {
    active.forEach(function (el, _, set) {
      var s = states.get(el);
      var settled = true;
      var t = '';
      if (s.mode === 'tilt') {
        s.rx = lerp(s.rx, s.hover ? s.trx : 0, 0.12);
        s.ry = lerp(s.ry, s.hover ? s.try_ : 0, 0.12);
        s.lift = lerp(s.lift, s.hover ? LIFT : 0, 0.12);
        var fy = s.float_ ? Math.sin((now / FLOAT_PERIOD) * Math.PI * 2 + s.phase) * FLOAT_AMP : 0;
        t = 'perspective(900px) rotateX(' + s.rx.toFixed(3) + 'deg) rotateY(' + s.ry.toFixed(3) +
            'deg) translateY(' + (s.lift + fy).toFixed(2) + 'px)';
        settled = !s.hover && !s.float_ &&
          Math.abs(s.rx) < 0.02 && Math.abs(s.ry) < 0.02 && Math.abs(s.lift) < 0.02;
      } else if (s.mode === 'magnet') {
        s.mx = lerp(s.mx, s.hover ? s.tmx : 0, 0.2);
        s.my = lerp(s.my, s.hover ? s.tmy : 0, 0.2);
        t = 'translate(' + s.mx.toFixed(2) + 'px,' + (s.my + (s.hover ? -2 : 0)).toFixed(2) + 'px)';
        settled = !s.hover && Math.abs(s.mx) < 0.05 && Math.abs(s.my) < 0.05;
      } else if (s.mode === 'float') {
        var fy2 = Math.sin((now / FLOAT_PERIOD) * Math.PI * 2 + s.phase) * FLOAT_AMP;
        var rz = Math.cos((now / FLOAT_PERIOD) * Math.PI * 2 + s.phase) * 0.35;
        t = 'translateY(' + fy2.toFixed(2) + 'px) rotate(' + rz.toFixed(3) + 'deg)';
        settled = false;
      }
      if (settled) {
        el.style.transform = '';
        el.classList.remove('fx-active');
        set.delete(el);
      } else {
        el.style.transform = t;
      }
    });
    if (active.size) requestAnimationFrame(frame);
    else running = false;
  }

  /* --- cursor spotlight + tilt --- */
  if (fine) {
    $all(GLOW).forEach(function (el) {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      var g = document.createElement('i');
      g.className = 'fx-glow';
      g.setAttribute('aria-hidden', 'true');
      el.appendChild(g);
      var tiltable = TILT.some(function (sel) { return el.matches(sel); });
      var s = state(el);
      if (tiltable) s.mode = 'tilt';
      el.addEventListener('pointerenter', function () {
        el.classList.add('fx-on');
        if (tiltable) { s.hover = true; wake(el); }
      });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--fx-x', x + 'px');
        el.style.setProperty('--fx-y', y + 'px');
        if (tiltable) {
          s.trx = ((y / r.height) - 0.5) * -2 * MAX_TILT;
          s.try_ = ((x / r.width) - 0.5) * 2 * MAX_TILT;
        }
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('fx-on');
        if (tiltable) { s.hover = false; wake(el); }
      });
    });

    /* --- magnetic buttons --- */
    $all(MAGNET).forEach(function (el) {
      var s = state(el);
      if (s.mode) return; // don't stack modes
      s.mode = 'magnet';
      el.addEventListener('pointerenter', function () { s.hover = true; wake(el); });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * MAG_PULL;
        var dy = (e.clientY - (r.top + r.height / 2)) * MAG_PULL;
        s.tmx = Math.max(-MAG_MAX, Math.min(MAG_MAX, dx));
        s.tmy = Math.max(-MAG_MAX, Math.min(MAG_MAX, dy));
      });
      el.addEventListener('pointerleave', function () { s.hover = false; wake(el); });
    });
  }

  /* --- weightless drift (all pointer types) --- */
  $all(FLOAT).forEach(function (el, i) {
    var s = state(el);
    if (s.mode === 'tilt') { s.float_ = true; s.phase = i * 1.7; wake(el); return; }
    if (s.mode) return;
    s.mode = 'float';
    s.phase = i * 1.7;
    /* wait for the page's own entrance transitions before drifting */
    setTimeout(function () { wake(el); }, 1600);
  });
})();
