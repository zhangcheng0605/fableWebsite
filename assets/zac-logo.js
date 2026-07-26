/* zac-logo.js — the ZAC Studios mark, built in three.js, standing where the
   hero wordmark used to sit.

   The geometry is the logo as designed: three perforated postage stamps
   spelling Z-A-C over a STUDIOS lockup, every letter a tube of capsules and
   torus arcs. Three things are tuned for this page rather than the standalone
   embed:

     1. the palette and the lighting are graded to the page it sits on — now
        the candy-neon page, so the stamps run pink, purple and cyan over
        deep-violet panels instead of the old Ink & Lantern gold-over-ink
     2. orbit controls are off and the mark sways on its own axis instead —
        a hero must never eat a scroll, and a wordmark that turns all the way
        around spends half its time backwards
     3. the render loop parks itself when the hero scrolls away, and never
        starts at all under prefers-reduced-motion (one still frame instead)

   No WebGL, or anything thrown on the way up, leaves the flat SVG lockup in
   the markup untouched. */

const host = document.querySelector('.hero-logo');
const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

if (host && hasWebGL()) boot().catch(() => { /* flat lockup stays */ });

async function boot() {
  const stage = document.createElement('three-d-stage');
  stage.setAttribute('name', 'zac-studios-logo');
  stage.setAttribute('background', 'transparent');
  stage.setAttribute('hide-chrome', '');
  stage.setAttribute('aria-hidden', 'true');
  host.appendChild(stage);

  const { THREE } = await stage.ready;

  // ===== palette · candy-neon (matches the landing page tokens) =====
  const PALETTE = [
    ['pink', 0xff3fae],
    ['purple', 0x8b3dff],
    ['cyan', 0x25c4ff],
    ['gold', 0xffb020],
    ['violet', 0x6428d8],
  ];
  // stamp inner panels stay dark — deep violet, so the neon letters glow on
  // them the way they did on ink, even though the page behind is light
  const paperMat = new THREE.MeshStandardMaterial({ color: 0x241145, roughness: 0.28, metalness: 0.3 });
  paperMat.name = 'panel-violet';

  const neonMat = (color, name) => {
    const m = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.34, roughness: 0.24, metalness: 0.2,
    });
    m.name = name;
    return m;
  };

  // Candy grade: white-pink sky over a lavender ground, a blush key, a cyan
  // fill from behind so the silhouettes never close up against the aurora.
  {
    const sc = stage._scene;
    const hemi = sc.children.find((o) => o.isHemisphereLight);
    if (hemi) { hemi.color.setHex(0xffffff); hemi.groundColor.setHex(0xe8d9ff); hemi.intensity *= 0.95; }
    const dirs = sc.children.filter((o) => o.isDirectionalLight);
    if (dirs[0]) { dirs[0].color.setHex(0xfff0fa); dirs[0].intensity *= 1.05; }
    if (dirs[1]) { dirs[1].color.setHex(0x9fe4ff); dirs[1].intensity *= 1.25; }
  }
  // The mark floats over the aurora — a cast shadow would land on nothing,
  // and the shadow map is the most expensive thing here.
  stage._ground.visible = false;
  stage._renderer.shadowMap.enabled = false;
  // The hero owns the scroll. Sway and pointer parallax replace the orbit.
  stage._controls.enabled = false;
  // OrbitControls sets inline touch-action:none on its canvas at construction,
  // and disabling the controls does not undo it — on touch screens that made
  // the whole mark a dead zone for vertical swipes. One finger must scroll.
  stage._renderer.domElement.style.touchAction = 'pan-y';

  const r = 0.5; // tube radius, in letter centerline units
  const d2r = (d) => (d * Math.PI) / 180;

  function capsule(x1, y1, x2, y2, mat, name) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 24), mat);
    mesh.name = name;
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
    return mesh;
  }

  function arc(cx, cy, rad, startDeg, spanDeg, mat, name) {
    const grp = new THREE.Group();
    grp.name = name;
    const t = new THREE.Mesh(new THREE.TorusGeometry(rad, r, 20, 64, d2r(spanDeg)), mat);
    t.name = name + '-arc';
    t.position.set(cx, cy, 0);
    t.rotation.z = d2r(startDeg);
    grp.add(t);
    for (const a of [startDeg, startDeg + spanDeg]) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat);
      s.name = name + '-cap';
      s.position.set(cx + rad * Math.cos(d2r(a)), cy + rad * Math.sin(d2r(a)), 0);
      grp.add(s);
    }
    return grp;
  }

  // Letter specs: centerline coords, height 5. s = capsule segment, a = arc.
  const LETTERS = {
    Z: { w: 3, p: [['s', 0, 5, 3, 5], ['s', 3, 5, 0, 0], ['s', 0, 0, 3, 0]] },
    A: { w: 3, p: [['s', 0, 0, 1.5, 5], ['s', 1.5, 5, 3, 0], ['s', 0.75, 1.6, 2.25, 1.6]] },
    C: { w: 3.4, sx: 0.8, p: [['a', 2.5, 2.5, 2.5, 50, 260]] },
    S: { w: 2.75, p: [['a', 1.5, 3.75, 1.25, 30, 240], ['a', 1.5, 1.25, 1.25, 210, 240]] },
    T: { w: 3, p: [['s', 0, 5, 3, 5], ['s', 1.5, 5, 1.5, 0]] },
    U: { w: 2.8, p: [['s', 0, 5, 0, 1.4], ['s', 2.8, 5, 2.8, 1.4], ['a', 1.4, 1.4, 1.4, 180, 180]] },
    D: { w: 3.3, p: [['s', 0, 0, 0, 5], ['s', 0, 5, 0.8, 5], ['s', 0, 0, 0.8, 0], ['a', 0.8, 2.5, 2.5, 270, 180]] },
    I: { w: 0.2, p: [['s', 0.1, 0, 0.1, 5]] },
    O: { w: 3.6, sx: 0.72, p: [['a', 2.5, 2.5, 2.5, 0, 360]] },
  };

  function buildLetter(ch, mat, tag) {
    const spec = LETTERS[ch];
    const grp = new THREE.Group();
    grp.name = 'letter-' + tag;
    spec.p.forEach((part, i) => {
      const nm = tag + '-' + i;
      grp.add(part[0] === 's'
        ? capsule(part[1], part[2], part[3], part[4], mat, nm)
        : arc(part[1], part[2], part[3], part[4], part[5], mat, nm));
    });
    if (spec.sx) grp.scale.x = spec.sx;
    return { grp, w: spec.w };
  }

  // ===== postage stamp: perforated plate, SW x SH, extruded DEPTH =====
  const SW = 4, SH = 5, DEPTH = 0.35, NR = 0.24;
  function stampShape() {
    const sh = new THREE.Shape();
    const notches = (from, to, fixed, axis, count, inward) => {
      const pitch = (to - from) / count;
      for (let i = 0; i < count; i++) {
        const c = from + (i + 0.5) * pitch;
        const dir = Math.sign(to - from);
        const p1 = c - dir * NR;
        if (axis === 'x') {
          sh.lineTo(p1, fixed);
          sh.absarc(c, fixed, NR, dir > 0 ? Math.PI : 0, dir > 0 ? 0 : Math.PI, inward);
        } else {
          sh.lineTo(fixed, p1);
          sh.absarc(fixed, c, NR, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : -Math.PI / 2, inward);
        }
      }
    };
    sh.moveTo(0, 0);
    notches(0, SW, 0, 'x', 5, true);
    sh.lineTo(SW, 0);
    notches(0, SH, SW, 'y', 6, true);
    sh.lineTo(SW, SH);
    notches(SW, 0, SH, 'x', 5, true);
    sh.lineTo(0, SH);
    notches(SH, 0, 0, 'y', 6, true);
    sh.lineTo(0, 0);
    return sh;
  }
  const stampGeo = new THREE.ExtrudeGeometry(stampShape(), { depth: DEPTH, bevelEnabled: false });
  const panelGeo = new THREE.BoxGeometry(SW - 0.9, SH - 0.9, 0.08);

  const stamps = [];
  function buildStamp(ch, i) {
    const grp = new THREE.Group();
    grp.name = 'stamp-' + ch;
    grp.userData.stamp = i;
    const mat = neonMat(PALETTE[i][1], 'stamp-' + ch + '-' + PALETTE[i][0]);
    const base = new THREE.Mesh(stampGeo, mat);
    base.name = 'stamp-' + ch + '-base';
    grp.add(base);
    const panel = new THREE.Mesh(panelGeo, paperMat);
    panel.name = 'stamp-' + ch + '-panel';
    panel.position.set(SW / 2, SH / 2, DEPTH + 0.03);
    grp.add(panel);
    const { grp: letter, w } = buildLetter(ch, mat, ch);
    const ls = 0.52;
    letter.scale.multiplyScalar(ls);
    letter.position.set(SW / 2 - (w * ls) / 2, SH / 2 - 2.5 * ls, DEPTH + 0.03 + r * ls);
    grp.add(letter);
    stamps.push({ grp, mat, ch, colorIdx: i });
    return grp;
  }

  function buildLine(text, scale, y, name, matFor) {
    const line = new THREE.Group();
    line.name = name;
    const gap = 1.35;
    const letters = [...text].map((ch, i) => buildLetter(ch, matFor(i), name + '-' + ch + i));
    const total = letters.reduce((a, l) => a + l.w, 0) + gap * (letters.length - 1);
    let x = -total / 2;
    letters.forEach((l, i) => {
      l.grp.position.set(x, 0, i % 2 ? 0.22 : -0.22);
      x += l.w + gap;
    });
    letters.forEach((l) => line.add(l.grp));
    line.scale.setScalar(scale);
    line.position.y = y;
    return line;
  }

  const logo = new THREE.Group();
  logo.name = 'zac-studios-logo';
  const row = new THREE.Group();
  row.name = 'stamp-row';
  ['Z', 'A', 'C'].forEach((ch, i) => {
    const s = buildStamp(ch, i);
    s.position.set(-6.8 + i * 4.8, 0, [-0.15, 0.1, -0.1][i]);
    s.rotation.z = d2r([-2, 1.5, -1.5][i]);
    row.add(s);
  });
  row.position.y = 4.1;
  logo.add(row);

  const lineMats = 'STUDIOS'.split('').map((ch, i) =>
    neonMat(PALETTE[(i + 3) % 5][1], 'studios-' + i + '-' + PALETTE[(i + 3) % 5][0]));
  const studios = buildLine('STUDIOS', 0.52, 0, 'line-studios', (i) => lineMats[i]);
  logo.add(studios);

  logo.scale.setScalar(0.065);
  // Centre the mark on the origin so the sway pivots through its middle
  // rather than swinging from a corner.
  {
    const b = new THREE.Box3().setFromObject(logo);
    logo.position.set(
      -(b.min.x + b.max.x) / 2,
      -(b.min.y + b.max.y) / 2,
      -(b.min.z + b.max.z) / 2,
    );
  }

  stage.setObject(logo);

  // ===== framing =====
  // setObject frames to a bounding sphere, which leaves a wide-and-short hero
  // box mostly empty. Fit the box against both axes instead, and re-fit on
  // resize since the horizontal FOV moves with the aspect.
  const VIEW_DIR = new THREE.Vector3(0.2, 0.12, 1).normalize();
  const bounds = new THREE.Box3().setFromObject(logo);
  const size = bounds.getSize(new THREE.Vector3());
  const corners = [];
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z])
        corners.push(new THREE.Vector3(x, y, z));

  const target = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  function frame() {
    const cam = stage._camera;
    const vFov = d2r(cam.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
    const dist = Math.max(
      (size.y / 2) / Math.tan(vFov / 2),
      (size.x / 2) / Math.tan(hFov / 2),
    ) * 1.1 + size.z;
    cam.near = dist / 100;
    cam.far = dist * 100;
    // A box centred on the origin does not put its *silhouette* on the centre
    // of the frame — perspective on a mark this deep pushes the near face off
    // to one side. Place the camera, measure where the corners actually land,
    // slide sideways, repeat until it settles.
    target.set(0, 0, 0);
    for (let pass = 0; pass < 3; pass++) {
      cam.position.copy(VIEW_DIR).multiplyScalar(dist).add(target);
      cam.lookAt(target);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const c of corners) {
        const p = c.clone().project(cam);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      const viewH = 2 * Math.tan(vFov / 2) * dist;
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      target
        .addScaledVector(right, ((minX + maxX) / 2) * (viewH * cam.aspect) / 2)
        .addScaledVector(up, ((minY + maxY) / 2) * viewH / 2);
    }
    cam.position.copy(VIEW_DIR).multiplyScalar(dist).add(target);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    stage._controls.target.copy(target);
    stage._controls.update();
  }
  frame();
  new ResizeObserver(frame).observe(stage);

  host.classList.add('is-3d');

  // Reduced motion: one still frame of the mark, then nothing moves again.
  if (STILL) {
    stage._loop = () => stage._renderer.render(stage._scene, stage._camera);
    stage._renderer.setAnimationLoop(() => {
      stage._loop();
      stage._renderer.setAnimationLoop(null);
    });
    new ResizeObserver(() => { frame(); stage._loop(); }).observe(stage);
    return;
  }

  // ===== FX: drifting embers, hover petals and sparks, click to burst =====
  const clock = new THREE.Clock();
  const fx = new THREE.Group();
  fx.name = 'fx';
  stage._scene.add(fx);
  const particles = [];
  const petalGeo = new THREE.SphereGeometry(0.012, 12, 8);
  const coreGeo = new THREE.SphereGeometry(0.007, 10, 8);
  const wingGeo = new THREE.CircleGeometry(0.012, 12);
  const glowGeo = new THREE.SphereGeometry(0.02, 10, 8);
  const starGeo = new THREE.OctahedronGeometry(0.013);
  const basicMat = (color, opacity = 1) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity });

  function spawnPetal(pos) {
    const g = new THREE.Group();
    g.name = 'fx-petal';
    const cMat = basicMat(0xffd166);
    const pMat = basicMat(PALETTE[Math.floor(Math.random() * 5)][1]);
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(petalGeo, pMat);
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0);
      p.scale.set(1, 1, 0.45);
      g.add(p);
    }
    const c = new THREE.Mesh(coreGeo, cMat);
    c.position.z = 0.005;
    g.add(c);
    g.position.copy(pos);
    g.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    fx.add(g);
    particles.push({
      o: g, mats: [cMat, pMat], kind: 'petal', ttl: 1.7, age: 0,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.07, 0.05 + Math.random() * 0.05, (Math.random() - 0.5) * 0.07),
      spin: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0),
    });
  }

  function spawnSpark(pos) {
    const g = new THREE.Group();
    g.name = 'fx-spark';
    const bodyMat = basicMat(0xffffff);
    const wingMat = basicMat(0xfff0fa, 0.8);
    wingMat.side = THREE.DoubleSide;
    const glowMat = basicMat(Math.random() < 0.5 ? 0x8b3dff : 0xff3fae, 0.3);
    g.add(new THREE.Mesh(coreGeo, bodyMat));
    g.add(new THREE.Mesh(glowGeo, glowMat));
    const w1 = new THREE.Mesh(wingGeo, wingMat);
    w1.position.x = 0.011;
    w1.scale.set(0.8, 1.5, 1);
    const w2 = w1.clone();
    w2.position.x = -0.011;
    g.add(w1);
    g.add(w2);
    g.position.copy(pos);
    fx.add(g);
    particles.push({
      o: g, w1, w2, mats: [bodyMat, wingMat, glowMat], kind: 'spark', ttl: 2.2, age: 0,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.06 + Math.random() * 0.06, (Math.random() - 0.5) * 0.08),
      ph: Math.random() * 6,
    });
  }

  // ambient glow motes and neon stars orbiting the mark
  const stars = [];
  for (let i = 0; i < 16; i++) {
    const ember = i % 2 === 0;
    const m = new THREE.Mesh(
      ember ? glowGeo : starGeo,
      basicMat(ember ? (i % 4 ? 0xffb7e2 : 0x9fe4ff) : PALETTE[i % 5][1], ember ? 0.55 : 0.85),
    );
    m.name = 'fx-mote-' + i;
    if (ember) m.scale.setScalar(0.55);
    fx.add(m);
    stars.push({
      m, ember, ph: Math.random() * 6.3, sp: 0.2 + Math.random() * 0.3,
      rx: 0.52 + Math.random() * 0.25, rz: 0.2 + Math.random() * 0.18,
      y: -0.22 + Math.random() * 0.5,
    });
  }

  stamps.forEach((s) => {
    s.baseY = s.grp.position.y;
    s.baseZ = s.grp.position.z;
    s.baseRz = s.grp.rotation.z;
    s.explode = null;
    s.parts = [];
    s.grp.traverse((o) => {
      if (!o.isMesh) return;
      const isBase = o.name.endsWith('-base');
      const isPanel = o.name.endsWith('-panel');
      s.parts.push({
        m: o, p0: o.position.clone(), q0: o.quaternion.clone(),
        dir: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() * 0.8 + 0.4).normalize(),
        amp: isBase ? 0.5 : isPanel ? 1.3 : 2 + Math.random() * 1.6,
        ax: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        rot: isBase ? (Math.random() - 0.5) * 0.7 : (Math.random() - 0.5) * 4,
      });
    });
  });
  studios.children.forEach((g) => { g.userData.by = g.position.y; });

  const stampCenter = (s) => s.grp.localToWorld(new THREE.Vector3(SW / 2, SH / 2, DEPTH + 0.6));
  let hovered = null;
  let lastSpawn = 0;
  const tmpQ = new THREE.Quaternion();
  // pointer parallax, -1..1 across the mark's box
  const point = { x: 0, y: 0 };

  const baseLoop = stage._loop;
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // The mark sways on its own axis and leans toward the pointer — it never
    // turns far enough to read backwards.
    const wantY = Math.sin(t * 0.42) * 0.22 + point.x * 0.28;
    const wantX = Math.sin(t * 0.31) * 0.05 - point.y * 0.14;
    const k = Math.min(1, dt * 3.2);
    logo.rotation.y += (wantY - logo.rotation.y) * k;
    logo.rotation.x += (wantX - logo.rotation.x) * k;

    stamps.forEach((s, i) => {
      s.grp.position.y = s.baseY + 0.15 * Math.sin(t * 1.2 + i * 2.1);
      s.grp.rotation.z = s.baseRz + 0.025 * Math.sin(t * 0.8 + i);
      const zt = hovered === s ? s.baseZ + 1.1 : s.baseZ;
      s.grp.position.z += (zt - s.grp.position.z) * Math.min(1, dt * 8);
      if (s.explode !== null) {
        s.explode += dt;
        const p = s.explode / 1.15;
        if (p >= 1) {
          s.explode = null;
          s.parts.forEach((pp) => { pp.m.position.copy(pp.p0); pp.m.quaternion.copy(pp.q0); });
        } else {
          const e = Math.sin(Math.PI * p);
          s.parts.forEach((pp) => {
            pp.m.position.copy(pp.p0).addScaledVector(pp.dir, pp.amp * e);
            tmpQ.setFromAxisAngle(pp.ax, pp.rot * e);
            pp.m.quaternion.copy(pp.q0).multiply(tmpQ);
          });
        }
      }
    });
    studios.children.forEach((g, i) => { g.position.y = g.userData.by + 0.16 * Math.sin(t * 2 + i * 0.7); });

    if (hovered && t - lastSpawn > 0.12 && fx.children.length < 48) {
      lastSpawn = t;
      const c = stampCenter(hovered);
      c.x += (Math.random() - 0.5) * 0.16;
      c.y += (Math.random() - 0.5) * 0.2;
      (Math.random() < 0.6 ? spawnPetal : spawnSpark)(c);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.ttl) {
        fx.remove(p.o);
        p.mats.forEach((m) => m.dispose());
        particles.splice(i, 1);
        continue;
      }
      p.o.position.addScaledVector(p.vel, dt);
      const f = 1 - p.age / p.ttl;
      if (p.kind === 'petal') {
        p.o.rotation.x += p.spin.x * dt * 2;
        p.o.rotation.y += p.spin.y * dt * 2;
        p.mats.forEach((m) => { m.opacity = f; });
      } else {
        p.o.position.x += Math.sin((p.age + p.ph) * 5) * 0.05 * dt;
        const fl = 0.5 + 0.45 * Math.sin(p.age * 35);
        p.w1.rotation.y = fl;
        p.w2.rotation.y = -fl;
        p.mats[0].opacity = f;
        p.mats[1].opacity = 0.8 * f;
        p.mats[2].opacity = 0.3 * f * (0.7 + 0.3 * Math.sin(p.age * 20));
      }
    }

    stars.forEach((st) => {
      const a = t * st.sp + st.ph;
      st.m.position.set(Math.cos(a) * st.rx, st.y + 0.05 * Math.sin(t * 1.5 + st.ph), Math.sin(a) * st.rz);
      st.m.rotation.y = t * 2 + st.ph;
      const base = st.ember ? 0.55 : 1;
      st.m.scale.setScalar(base * (0.8 + 0.35 * Math.sin(t * 3 + st.ph * 2)));
      if (st.ember) st.m.material.opacity = 0.35 + 0.3 * Math.sin(t * 2.2 + st.ph * 3);
    });

    baseLoop();
  };
  stage._loop = tick;
  stage._renderer.setAnimationLoop(tick);

  // The page is long — stop rendering the moment the hero leaves the viewport.
  new IntersectionObserver((entries) => {
    const on = entries[0].isIntersecting;
    stage._renderer.setAnimationLoop(on ? tick : null);
    if (!on) { hovered = null; point.x = 0; point.y = 0; }
  }, { threshold: 0 }).observe(host);

  // ===== pointer: hover lifts a stamp, a click bursts it and cycles its ink =====
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;

  function pick(e) {
    const rect = stage.getBoundingClientRect();
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, stage._camera);
    for (const h of raycaster.intersectObject(row, true)) {
      let o = h.object;
      while (o && o.userData.stamp === undefined) o = o.parent;
      if (o) return stamps[o.userData.stamp];
    }
    return null;
  }

  stage.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  stage.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) { down = null; return; }
    down = null;
    const s = pick(e);
    if (!s) return;
    s.colorIdx = (s.colorIdx + 1) % PALETTE.length;
    s.mat.color.setHex(PALETTE[s.colorIdx][1]);
    s.mat.emissive.setHex(PALETTE[s.colorIdx][1]);
    s.mat.name = 'stamp-' + s.ch + '-' + PALETTE[s.colorIdx][0];
    if (s.explode === null) s.explode = 0;
    for (let i = 0; i < 8; i++) {
      const c = stampCenter(s);
      c.x += (Math.random() - 0.5) * 0.22;
      c.y += (Math.random() - 0.5) * 0.26;
      (i % 3 ? spawnPetal : spawnSpark)(c);
    }
  });
  stage.addEventListener('pointermove', (e) => {
    const rect = stage.getBoundingClientRect();
    point.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    point.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    hovered = pick(e);
    stage.style.cursor = hovered ? 'pointer' : '';
  });
  stage.addEventListener('pointerleave', () => {
    hovered = null;
    point.x = 0;
    point.y = 0;
  });
}
