# three.js r184 — vendored

Unmodified files from the `three@0.184.0` npm package:

| file | source path in the package |
| --- | --- |
| `three.module.js` | `build/three.module.js` |
| `three.core.js` | `build/three.core.js` |
| `OrbitControls.js` | `examples/jsm/controls/OrbitControls.js` |
| `OBJExporter.js` | `examples/jsm/exporters/OBJExporter.js` |
| `GLTFExporter.js` | `examples/jsm/exporters/GLTFExporter.js` |

They are served from this repo rather than a CDN so `campus/` is self-contained:
no third-party request, no CDN outage, and the page still works offline. The
import map in `campus/index.html` maps the bare `three` and `three/addons/…`
specifiers onto these paths — `three.module.js` imports `./three.core.js`
relatively, so the two must stay side by side.

## What the pages actually load: the `.min.js` files

The import maps point at minified builds, not the sources above. The sources stay
here as the thing those were built from; nothing on the site requests them.

| served | built from | raw | gzipped |
| --- | --- | --- | --- |
| `three.module.min.js` | `three.module.js` + `three.core.js` | 2032 KB → 712 KB | 401 KB → 182 KB |
| `OrbitControls.min.js` | `OrbitControls.js` | 40 KB → 20 KB | |
| `OBJExporter.min.js` | `OBJExporter.js` | 8 KB → 4 KB | |
| `GLTFExporter.min.js` | `GLTFExporter.js` | 88 KB → 36 KB | |

The download saving is the smaller half of this — gzip was already doing most of
that. The point is the **parse**: the browser has to decompress and compile every
byte of the raw file before it can draw a frame, and gzip does not help with that
at all. Two thirds less JavaScript to compile is two thirds less of the pause on
entry.

Rebuild with (`three.module.js` re-exports from `three.core.js`, so it is bundled;
the addons import bare `three`, which must stay external for the import map to
resolve it):

```sh
BANNER='/**
 * @license
 * Copyright 2010-2026 three.js Authors
 * SPDX-License-Identifier: MIT
 * Minified from the unmodified three@0.184.0 sources in this directory; see README.md.
 */'
npx esbuild three.module.js --bundle --format=esm --minify --legal-comments=none \
  --target=es2020 --banner:js="$BANNER" --outfile=three.module.min.js
for f in OrbitControls OBJExporter GLTFExporter; do
  npx esbuild $f.js --bundle --format=esm --minify --legal-comments=none \
    --target=es2020 --external:three --banner:js="$BANNER" --outfile=$f.min.js
done
```

Afterwards load `campus/` and press both the GLB and OBJ export buttons. The
exporters are dynamically imported and only run on click, so a bad build there
fails silently until somebody tries it.

To upgrade: `npm pack three@<version>`, copy the five source files out of the
tarball, rebuild, and bump the version here and in the banner.

three.js is MIT licensed — Copyright © 2010-2026 three.js authors. The licence
header is preserved in each source file, and re-attached as a banner on each
minified build.
