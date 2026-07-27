# zacink.woff2

The face the ink array (`assets/ink-array.js`) draws with — Noto Serif SC (OFL),
cut to the 61 glyphs that piece can actually put on screen: the particle pool,
the formation names, the Chinese numerals on the chips, and the `·` between them.

**12.5 KB, one request.** The design source shipped the same face as ~280 woff2
slices totalling 16 MB, because Google's CJK subsets are sliced by frequency
across the whole language rather than by what one page uses. `build-subset.py`
finds the 17 slices holding these glyphs, pins the weight axis (they ship
variable), cuts each to its own glyphs, merges them, and re-cuts the result.

## Changing the glyphs

If `ink-array.js` gains a character — a new formation, a new chip label, another
word in the particle pool — it must be added here too, or that character falls
back to a system serif and looks wrong next to the rest.

1. Add it to `POOL` or `UI` in `build-subset.py` (they mirror the constants in
   `ink-array.js`).
2. Run it. It needs `fonttools` and `brotli`, plus `SRC` pointed at the original
   design export — the 16 MB bundle, which is not in this repo. Ask for it, or
   point `SRC` at any Noto Serif SC source that covers the glyphs.
3. Check the reported glyph count and `missing=none`, then load the page and
   confirm `document.fonts.check('900 100px "ZacInk"', '<new char>')` is true.

That last check matters: a font missing a required table still returns HTTP 200
and still fails to parse, and the only visible symptom is a quiet fallback.
`build-subset.py` keeps `post` for exactly this reason.
