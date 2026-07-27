/* bunny.js — turns the pointer into a bunny, and whacks it on click.

   The bunny is one inline SVG in a fixed, pointer-events:none layer. This file
   does two things per frame at most: write a transform, and toggle a class.
   Every animation lives in assets/bunny.css.

   Three decisions worth knowing about:

     1. No easing on the follow. The transform is written straight from the
        latest pointermove, coalesced into one rAF. An eased follow looks nicer
        in isolation and is wrong for a cursor — a bunny that trails the pointer
        by even a few pixels cannot be aimed, and the error grows exactly when
        you are moving fast and trying to hit something.
     2. The native cursor is only hidden after the bunny is mounted, and the
        class comes back off if anything throws. Being left with no cursor at
        all is far worse than not getting a bunny.
     3. Text fields keep their I-beam and the bunny hides over them. Links and
        buttons lost their pointing hand to cursor:none, so the bunny perks up
        instead.

   Coarse pointers never get any of this, matching assets/fx.js. */
(function () {
  'use strict';

  var FINE = '(hover: hover) and (pointer: fine)';
  if (!window.matchMedia || !matchMedia(FINE).matches) return;

  // The markup lives here rather than in a <template> per page: this is a
  // hand-maintained static site, and a per-page node is one more thing to
  // forget on the next page someone adds.
  var SVG =
    '<div class="bn" aria-hidden="true"><div class="bn-stage">' +
    '<svg class="bunny-svg" viewBox="0 0 100 112" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<g stroke-linecap="round">' +
      '<g class="bn-ears">' +
        '<g transform="rotate(-14 36 36)">' +
          '<ellipse cx="36" cy="34" rx="11.2" ry="27.5" fill="#fffdfd"/>' +
          '<ellipse cx="36" cy="36.4" rx="6.4" ry="20.2" fill="#f9c9d5"/>' +
          '<ellipse cx="36" cy="34" rx="11.2" ry="27.5" stroke="#b6a49b" stroke-width="2.6" stroke-dasharray="30 4.5 46 6 26 5 40 4"/>' +
        '</g>' +
        '<g transform="rotate(14 64 36)">' +
          '<ellipse cx="64" cy="34" rx="11.2" ry="27.5" fill="#fffdfd"/>' +
          '<ellipse cx="64" cy="36.4" rx="6.4" ry="20.2" fill="#f9c9d5"/>' +
          '<ellipse cx="64" cy="34" rx="11.2" ry="27.5" stroke="#b6a49b" stroke-width="2.6" stroke-dasharray="24 5 52 4 30 6 34 4"/>' +
        '</g>' +
      '</g>' +
      '<path d="M19.2 79.5 C18.8 62.8 31 49.6 50 49 C69.2 48.4 81.2 62.2 81.4 79.2 C81.6 95.2 69.6 104.8 50 104.6 C30.2 104.4 19.7 95.2 19.2 79.5 Z" fill="#fffdfd"/>' +
      '<ellipse cx="27.8" cy="88.5" rx="10.6" ry="7.9" fill="#f9c9d5"/>' +
      '<ellipse cx="72.2" cy="88.5" rx="10.6" ry="7.9" fill="#f9c9d5"/>' +
      // the outline is deliberately broken — the gaps are what make it read as
      // drawn by hand rather than traced by a machine
      '<path d="M19.2 79.5 C18.8 62.8 31 49.6 50 49 C69.2 48.4 81.2 62.2 81.4 79.2 C81.6 95.2 69.6 104.8 50 104.6 C30.2 104.4 19.7 95.2 19.2 79.5 Z" stroke="#b6a49b" stroke-width="2.7" stroke-dasharray="38 5 26 4 54 7 30 4 44 6"/>' +
      '<g fill="#b6a49b">' +
        '<circle cx="18.3" cy="72.5" r=".95"/><circle cx="83.1" cy="84.5" r=".9"/>' +
        '<circle cx="45.5" cy="107.6" r=".85"/><circle cx="25.6" cy="53.4" r=".8"/>' +
        '<circle cx="76.8" cy="56.2" r=".75"/><circle cx="61.5" cy="106.4" r=".7"/>' +
      '</g>' +
      '<g class="bn-face-n">' +
        '<circle cx="36.8" cy="76.2" r="4.3" fill="#7c6a61"/>' +
        '<circle cx="63.2" cy="76.2" r="4.3" fill="#7c6a61"/>' +
        '<circle cx="38.3" cy="74.6" r="1.15" fill="#fffdfd" opacity=".9"/>' +
        '<circle cx="64.7" cy="74.6" r="1.15" fill="#fffdfd" opacity=".9"/>' +
        '<ellipse cx="50" cy="82.3" rx="2" ry="1.5" fill="#e79cae"/>' +
        '<path d="M45.6 84.6 Q47.9 88.4 50 84.9 Q52.1 88.4 54.4 84.6" stroke="#b6a49b" stroke-width="2.1" stroke-linejoin="round"/>' +
      '</g>' +
      '<g class="bn-face-d" stroke="#7c6a61" stroke-width="2.5">' +
        '<path d="M33.4 72.8 L40.2 79.6 M40.2 72.8 L33.4 79.6"/>' +
        '<path d="M59.8 72.8 L66.6 79.6 M66.6 72.8 L59.8 79.6"/>' +
        '<ellipse cx="50" cy="85.6" rx="3.1" ry="3.5" fill="#e79cae" stroke="#b6a49b" stroke-width="1.8"/>' +
      '</g>' +
    '</g></svg>' +
    '<svg class="bn-fx" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle class="bn-puff" cx="50" cy="43" r="19" stroke="#f2a8bd" stroke-width="2.8"/>' +
      '<g class="bn-star bn-s1" transform="translate(27 33)" fill="#ffd166"><path d="M0 -7 Q1.3 -1.3 7 0 Q1.3 1.3 0 7 Q-1.3 1.3 -7 0 Q-1.3 -1.3 0 -7 Z"/></g>' +
      '<g class="bn-star bn-s2" transform="translate(73 31)" fill="#f9c9d5"><path d="M0 -6 Q1.1 -1.1 6 0 Q1.1 1.1 0 6 Q-1.1 1.1 -6 0 Q-1.1 -1.1 0 -6 Z"/></g>' +
      '<g class="bn-star bn-s3" transform="translate(50 19)" fill="#ffd166"><path d="M0 -5.2 Q1 -1 5.2 0 Q1 1 0 5.2 Q-1 1 -5.2 0 Q-1 -1 0 -5.2 Z"/></g>' +
    '</svg>' +
    '</div></div>';

  var TEXTY = 'textarea,[contenteditable]:not([contenteditable=false]),' +
    'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox])' +
    ':not([type=radio]):not([type=range]):not([type=color]):not([type=file])';
  var CLICKY = 'a[href],button,[role=button],summary,label,select,input[type=range],' +
    'input[type=checkbox],input[type=radio],input[type=submit],input[type=button]';

  var bn = null;

  function teardown() {
    document.documentElement.classList.remove('bunny-on');
    if (bn && bn.parentNode) bn.parentNode.removeChild(bn);
    bn = null;
  }

  try {
    var host = document.createElement('div');
    host.innerHTML = SVG;
    bn = host.firstChild;
    document.body.appendChild(bn);
    document.documentElement.classList.add('bunny-on');

    var x = 0, y = 0, queued = false, shown = false;

    function paint() {
      queued = false;
      bn.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      if (!shown) { shown = true; bn.classList.add('ready'); }
    }

    addEventListener('pointermove', function (e) {
      // A real touch or pen mid-session means this was never the right idea.
      if (e.pointerType && e.pointerType !== 'mouse') { teardown(); return; }
      x = e.clientX; y = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(paint); }

      var t = e.target;
      if (t && t.closest) {
        // Over a text field the bunny gets out of the way and the I-beam is
        // restored by bunny.css, so you can still see what you are typing into.
        bn.classList.toggle('hide', !!t.closest(TEXTY));
        // cursor:none took the pointing hand away from links and buttons —
        // perking the ears puts an affordance back.
        bn.classList.toggle('perk', !!t.closest(CLICKY));
      }
    }, { passive: true });

    var whackT = 0;
    function whack() {
      bn.classList.remove('whack');
      // Restarting by reading offsetWidth forces a synchronous layout of the
      // whole document on every click; cancelling the animations does the same
      // job without touching layout.
      if (bn.getAnimations) {
        var running = bn.getAnimations({ subtree: true });
        for (var i = 0; i < running.length; i++) running[i].cancel();
      }
      bn.classList.add('whack');
      // animationend is the normal way out, but it never fires if animations
      // are disabled (a user stylesheet, a headless run, a stalled tab), and a
      // stuck .whack would leave the bunny permanently flattened. This is the
      // backstop.
      clearTimeout(whackT);
      whackT = setTimeout(function () { bn.classList.remove('whack'); }, 700);
    }

    // Capture phase, so nothing downstream can swallow it. Never
    // preventDefault: right-click must still open the context menu, and the
    // animation is pure CSS so it finishes underneath it.
    addEventListener('mousedown', whack, true);

    bn.addEventListener('animationend', function (e) {
      if (e.target.classList.contains('bunny-svg')) {
        clearTimeout(whackT);
        bn.classList.remove('whack');
      }
    });

    document.addEventListener('pointerleave', function () { bn.classList.remove('ready'); });
    document.addEventListener('pointerenter', function () { if (shown) bn.classList.add('ready'); });

    // Pointer type can change on a convertible or when a mouse is unplugged.
    var mq = matchMedia(FINE);
    var onChange = function () { if (!mq.matches) teardown(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (err) {
    // Whatever went wrong, the one outcome that is not acceptable is a page
    // with no cursor at all.
    teardown();
  }
})();
