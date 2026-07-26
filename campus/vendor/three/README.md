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

To upgrade: `npm pack three@<version>`, copy the five files above out of the
tarball, and bump the version here. No build step.

three.js is MIT licensed — Copyright © 2010-2026 three.js authors. The licence
header is preserved in each file.
