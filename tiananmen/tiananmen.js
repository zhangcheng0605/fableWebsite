/* tiananmen.js — 天安门, the Gate of Heavenly Peace, written down in code.

   Same idiom as campus.js next door: <three-d-stage> owns the renderer,
   scene and camera; this module retunes the light, builds the model, and
   hands the page's #build section to a scroll timeline. #build is a tall
   section with a sticky stage inside it, so that section's own scroll
   progress raises the gate phase by phase and flies the camera along a
   fixed spline — progress 0 is bare ground, 1 is the finished square.

   Nothing is downloaded. There is no model file and no image file: every
   mesh is written here and every texture is painted into a <canvas> at
   runtime, so the page works offline and the whole thing leaves as one GLB. */

const stage = document.querySelector('three-d-stage');
// If three.js never loads the stage rejects; index.html's overlay reports
// that to the reader, and this module stops here (awaiting a promise that
// never settles) instead of piling an unhandled rejection on top.
const { THREE } = await stage.ready.catch(() => new Promise(() => {}));
const renderer = stage._renderer, scene = stage._scene, camera = stage._camera, controls = stage._controls;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

/* The camera flies a fixed spline and the drag handlers at the bottom of
   this file own the look direction, so the stage's OrbitControls stand
   down. touch-action keeps one-finger scrolling with the page — scrolling
   is what builds the gate. */
controls.enabled = false;
renderer.domElement.style.touchAction = 'pan-y';

camera.fov = 46;
camera.near = 0.5;
camera.far = 4000;
camera.updateProjectionMatrix();

/* ============ sky and air ============ */
{
  const c = document.createElement('canvas'); c.width = 2; c.height = 512;
  const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#6fb0e0'); g.addColorStop(0.55, '#a9cbe4'); g.addColorStop(1, '#e7ded1');
  x.fillStyle = g; x.fillRect(0, 0, 2, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}
scene.fog = new THREE.Fog(0xd9dfd9, 700, 2100);

/* Late-morning sun over the south-east, a cool sky bounce, and a dim fill
   from behind so the north faces never go black. The stage's own soft
   ground-shadow plane sits at y=0, exactly where the plaza is — this scene
   brings its own ground, so it goes. */
const hemi = scene.children.find((o) => o.isHemisphereLight);
hemi.color.set(0xdcecff); hemi.groundColor.set(0x9a8d78); hemi.intensity = 0.85;
const sun = stage._key;
sun.color.set(0xfff0d8); sun.intensity = 1.6;
sun.position.set(230, 340, 260);
sun.shadow.mapSize.set(2048, 2048);
// An ortho box drawn tight around the gate: the square is 700m deep, and a
// frustum wide enough to cover all of it would spend the whole shadow map
// on empty paving. updateProjectionMatrix() is on us — the shadow pass only
// refreshes the view matrix.
Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 140, bottom: -50, near: 80, far: 900 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
const fill = scene.children.find((o) => o.isDirectionalLight && o !== sun);
fill.color.set(0xc8daea); fill.intensity = 0.3; fill.position.set(-220, 120, -240);
scene.remove(stage._ground);

/* ============ canvas textures ============ */
const srgb = (t) => { t.colorSpace = THREE.SRGBColorSpace; return t; };
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return srgb(new THREE.CanvasTexture(c));
}

const tileTexture = tex(256, 256, (x, w, h) => {      // glazed tile ribs
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#e09a2e'); g.addColorStop(1, '#c47c1e');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 16) { x.fillStyle = 'rgba(120,70,10,.45)'; x.fillRect(i, 0, 3, h); x.fillStyle = 'rgba(255,215,140,.35)'; x.fillRect(i + 8, 0, 2, h); }
  for (let j = 12; j < h; j += 24) { x.fillStyle = 'rgba(120,70,10,.22)'; x.fillRect(0, j, w, 2); }
});
tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping;

const dougongTexture = tex(512, 64, (x, w, h) => {    // bracket band under the eaves
  x.fillStyle = '#173a46'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 32) {
    x.fillStyle = '#2e6b60'; x.fillRect(i + 4, 8, 24, 20);
    x.fillStyle = '#d9b23c'; x.fillRect(i + 8, 12, 16, 4); x.fillRect(i + 12, 20, 8, 4);
    x.fillStyle = '#8fb3a0'; x.fillRect(i + 4, 34, 24, 6);
  }
  x.fillStyle = '#7e1a14'; x.fillRect(0, h - 12, w, 12);
  x.fillStyle = '#d9b23c'; for (let i = 6; i < w; i += 20) x.fillRect(i, h - 9, 6, 6);
});
dougongTexture.wrapS = THREE.RepeatWrapping;

const latticeTexture = tex(1024, 128, (x, w, h) => {  // window lattice band
  x.fillStyle = '#6e1512'; x.fillRect(0, 0, w, h);
  for (let p = 8; p < w; p += 72) {
    x.fillStyle = '#8c2018'; x.fillRect(p, 10, 56, h - 20);
    x.strokeStyle = '#d9b23c'; x.lineWidth = 3;
    x.strokeRect(p + 3, 13, 50, h - 26);
    x.lineWidth = 2;
    for (let i = p + 12; i < p + 54; i += 10) { x.beginPath(); x.moveTo(i, 13); x.lineTo(i, h - 13); x.stroke(); }
    for (let j = 22; j < h - 13; j += 14) { x.beginPath(); x.moveTo(p + 3, j); x.lineTo(p + 53, j); x.stroke(); }
  }
});
latticeTexture.wrapS = THREE.RepeatWrapping;

const doorTexture = tex(256, 320, (x, w, h) => {      // studded vermilion door
  x.fillStyle = '#6f1410'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#571008'; x.fillRect(w / 2 - 3, 0, 6, h);
  x.fillStyle = '#d9b23c';
  for (let r = 0; r < 9; r++) for (let c = 0; c < 8; c++) {
    const px = 20 + c * (w - 40) / 7 + (c > 3 ? 6 : -6), py = 24 + r * (h - 48) / 8;
    x.beginPath(); x.arc(px, py, 7, 0, 7); x.fill();
  }
});

const brickTexture = tex(128, 128, (x, w, h) => {     // wall courses
  x.fillStyle = '#a8433a'; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(90,25,20,.25)';
  for (let j = 0; j < h; j += 16) x.fillRect(0, j, w, 2);
  x.fillStyle = 'rgba(255,220,200,.05)';
  for (let j = 8; j < h; j += 16) x.fillRect(0, j, w, 1);
});
brickTexture.wrapS = brickTexture.wrapT = THREE.RepeatWrapping;
brickTexture.repeat.set(1 / 3, 1 / 3);

const facadeTexture = tex(512, 128, (x, w, h) => {    // the long civic buildings on the square
  x.fillStyle = '#cfc6b0'; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(60,60,70,.55)';
  for (let i = 10; i < w; i += 28) for (let j = 16; j < h - 10; j += 30) x.fillRect(i, j, 14, 18);
});
facadeTexture.wrapS = facadeTexture.wrapT = THREE.RepeatWrapping;

function pavingTex() {
  const t = tex(256, 256, (x, w, h) => {
    x.fillStyle = '#b4aea2'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 64) for (let j = 0; j < h; j += 64) {
      const v = ((i * 7 + j * 13) % 5) * 3;
      x.fillStyle = `rgb(${176 + v},${170 + v},${158 + v})`; x.fillRect(i + 1, j + 1, 62, 62);
    }
    x.strokeStyle = '#9c9689'; x.lineWidth = 2;
    for (let i = 0; i <= w; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(110, 110); return t;
}

/* ============ materials ============ */
/* Every material is named: the names become the material entries in the
   exported GLB and the usemtl lines in the OBJ. */
const M = {
  tile: new THREE.MeshStandardMaterial({ map: tileTexture, roughness: .5, metalness: .1, side: THREE.DoubleSide, name: 'glazedTile' }),
  tileP: new THREE.MeshStandardMaterial({ color: 0xd08420, roughness: .45, metalness: .12, name: 'tilePlain' }),
  wall: new THREE.MeshStandardMaterial({ map: brickTexture, color: 0xffffff, roughness: .85, name: 'wallRed' }),
  wallP: new THREE.MeshStandardMaterial({ color: 0xa8433a, roughness: .85, name: 'wallRedPlain' }),
  column: new THREE.MeshStandardMaterial({ color: 0x7e211c, roughness: .6, name: 'columnRed' }),
  marble: new THREE.MeshStandardMaterial({ color: 0xece7db, roughness: .7, name: 'marble' }),
  dougong: new THREE.MeshStandardMaterial({ map: dougongTexture, roughness: .75, name: 'dougong' }),
  lattice: new THREE.MeshStandardMaterial({ map: latticeTexture, roughness: .7, name: 'lattice' }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9b23c, roughness: .35, metalness: .55, name: 'gold' }),
  dark: new THREE.MeshStandardMaterial({ color: 0x241512, roughness: .95, name: 'shadowDark' }),
  door: new THREE.MeshStandardMaterial({ map: doorTexture, roughness: .65, name: 'studdedDoor' }),
  flag: new THREE.MeshStandardMaterial({ color: 0xc42f22, roughness: .65, side: THREE.DoubleSide, name: 'flagRed' }),
  lantern: new THREE.MeshStandardMaterial({ color: 0xd6362a, roughness: .45, emissive: 0x581208, name: 'lantern' }),
  water: new THREE.MeshStandardMaterial({ color: 0x3f6e7a, roughness: .15, metalness: .15, name: 'water' }),
  beige: new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: .85, name: 'stoneBeige' }),
  facade: new THREE.MeshStandardMaterial({ map: facadeTexture, roughness: .85, name: 'facade' }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4d6c3c, roughness: .95, name: 'foliage' }),
  leafD: new THREE.MeshStandardMaterial({ color: 0x3c5a30, roughness: .95, name: 'foliageDark' }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5c4632, roughness: .95, name: 'trunk' }),
  hedge: new THREE.MeshStandardMaterial({ color: 0x3f6134, roughness: 1, name: 'hedge' }),
};
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (rt, rb, h, mat, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);

/* ============ build registry ============
   Every top-level piece claims a window of the scroll and an entrance:
     drop — slams down out of the sky, bounces once, settles
     pop  — bursts into place with a little overshoot
     grow — rises out of the ground
     fade — simply arrives                                           */
const model = new THREE.Group();
model.name = 'tiananmen';
const parts = [];
function reg(obj, s, e, mode = 'grow', shadows = false) {
  obj.userData.win = [s, e];
  obj.userData.mode = mode;
  obj.visible = false;
  obj.userData.y0 = obj.position.y;
  obj.userData.spin = (parts.length % 2 ? 1 : -1) * 0.45;
  if (shadows) obj.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  parts.push(obj); model.add(obj); return obj;
}
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeOutBack = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const bounce = (k) => {
  const n = 7.5625, d = 2.75;
  if (k < 1 / d) return n * k * k;
  if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75;
  if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375;
  return n * (k -= 2.625 / d) * k + .984375;
};
function updateParts(p) {
  for (const o of parts) {
    const [s, e] = o.userData.win;
    const k = Math.min(1, Math.max(0, (p - s) / (e - s)));
    o.visible = k > 0.002;
    if (o.userData.mode === 'drop') {
      o.position.y = o.userData.y0 + (1 - bounce(k)) * 150;
      o.rotation.y = (1 - easeOut(k)) * o.userData.spin;
    } else if (o.userData.mode === 'pop') {
      const g2 = Math.max(k >= 1 ? 1 : easeOutBack(k), 0.001);
      o.scale.set(g2, g2, g2);
    } else if (o.userData.mode === 'grow') {
      o.scale.y = Math.max(easeOut(k), 0.001);
    } else if (o.userData.mode === 'fade') {
      // once it has fully arrived, drop back out of the transparent queue —
      // a full-square ground plane has no business being depth-sorted
      const done = k >= 1;
      o.traverse((n) => {
        if (!n.material) return;
        n.material.transparent = !done;
        n.material.opacity = done ? 1 : easeOut(k);
      });
    }
  }
}

/* ============ parametric curved hip roof ============
   The whole silhouette of the gate is this one function: a swept profile
   that widens and sags on a power curve, with the corners lifted by an
   extra term that only bites near the diagonals. */
function roofProfile(t, w, d, h, ridge) {
  return {
    hw: ridge / 2 + (w / 2 - ridge / 2) * Math.pow(t, .9),
    hd: (d / 2) * Math.pow(t, .9),
    y: h * (1 - Math.pow(t, 1.9)),
  };
}
function roofGeo(w, d, h, ridge, lift) {
  const L = 16, N = 72, pos = [], uv = [], idx = [];
  for (let i = 0; i <= L; i++) {
    const t = i / L, pr = roofProfile(t, w, d, h, ridge);
    for (let j = 0; j < N; j++) {
      const th = (j / N) * Math.PI * 2 + Math.PI / N;
      let px = Math.cos(th), pz = Math.sin(th);
      const kk = 1 / Math.max(Math.abs(px), Math.abs(pz));
      px *= kk; pz *= kk;
      const cl = lift * Math.pow(Math.abs(px * pz), 2.2) * t;
      pos.push(px * pr.hw, pr.y + cl, pz * pr.hd);
      uv.push(j / N * 46, t * 5);
    }
  }
  for (let i = 0; i < L; i++) for (let j = 0; j < N; j++) {
    const a = i * N + j, b = i * N + (j + 1) % N, c = (i + 1) * N + j, e2 = (i + 1) * N + (j + 1) % N;
    idx.push(a, c, b, b, c, e2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function roof(w, d, h, ridge, lift) {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(roofGeo(w, d, h, ridge, lift), M.tile));
  const cap = box(ridge + 1.6, 1.15, 1.7, M.tileP); cap.position.y = h + 0.35; grp.add(cap);
  for (const s of [-1, 1]) {                                  // chiwen ridge-end ornaments
    const o = box(1.3, 2.4, 1.6, M.tileP); o.position.set(s * (ridge / 2 + 0.6), h + 1.1, 0); grp.add(o);
    const hook = box(0.7, 1.0, 1.0, M.tileP); hook.position.set(s * (ridge / 2 + 1.1), h + 2.2, 0); grp.add(hook);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {        // hip lines + ridge beasts
    for (let i = 0; i <= 5; i++) {
      const t = 0.62 + i * 0.072, pr = roofProfile(t, w, d, h, ridge);
      const beast = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 6), M.tileP);
      beast.position.set(sx * pr.hw, pr.y + lift * t + 0.45, sz * pr.hd);
      grp.add(beast);
    }
    const up = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.5, 6), M.tileP);   // upturned corner tip
    const pr = roofProfile(1, w, d, h, ridge);
    up.position.set(sx * pr.hw, lift + 0.6, sz * pr.hd); up.rotation.z = sx * 0.5; up.rotation.x = -sz * 0.5;
    grp.add(up);
  }
  const band = box(w - 4.5, 1.5, d - 4.5, M.dougong); band.position.y = -0.85; grp.add(band);
  dougongTexture.repeat.set(10, 1);
  const soffit = box(w - 3, 0.35, d - 3, M.column); soffit.position.y = -1.68; grp.add(soffit);
  return grp;
}

/* ============ marble balustrade (instanced posts) ============ */
function balustrade(points, railRuns) {
  const g = new THREE.Group();
  const im = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.14, 0.8, 3, 8), M.marble, points.length);
  const m4 = new THREE.Matrix4();
  points.forEach((p, i) => { m4.makeTranslation(p[0], p[1] + 0.7, p[2]); im.setMatrixAt(i, m4); });
  im.castShadow = true; g.add(im);
  for (const r of railRuns) { const b = box(r.w, 0.22, r.d, M.marble); b.position.set(r.x, r.y, r.z); g.add(b); }
  return g;
}
const linePts = (x0, z0, x1, z1, y, step = 2.1) => {
  const out = [], dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) out.push([x0 + dx * i / n, y, z0 + dz * i / n]);
  return out;
};

const fenceWhite = new THREE.MeshStandardMaterial({ color: 0xf2f1ea, roughness: .5, name: 'fenceWhite' });
function whiteFence(x0, z0, x1, z1) {                 // crowd-control railing
  const g = new THREE.Group();
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), n = Math.max(2, Math.round(len / 1.0));
  const im = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.055, 0.85, 2, 6), fenceWhite, n + 1);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i <= n; i++) { m4.makeTranslation(x0 + dx * i / n, 0.55, z0 + dz * i / n); im.setMatrixAt(i, m4); }
  g.add(im);
  const ang = Math.atan2(dx, dz);
  for (const ry of [0.35, 0.62, 0.98]) {
    const r = box(0.07, 0.07, len, fenceWhite);
    r.position.set((x0 + x1) / 2, ry, (z0 + z1) / 2); r.rotation.y = ang; g.add(r);
  }
  return g;
}

const flowerPalette = [0xd42a3c, 0xe8b81e, 0xd668b4, 0xc23a20, 0xe8b81e];
function flowerBed(w, d) {                            // concentric festival planting
  const g = new THREE.Group();
  const soil = box(w, 0.55, d, M.hedge); soil.position.y = 0.28; g.add(soil);
  const n = Math.floor(w * d / 0.85);
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 7, 6), new THREE.MeshStandardMaterial({ roughness: .9, name: 'flowers' }), n);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const fx = (Math.random() - 0.5) * (w - 0.8), fz = (Math.random() - 0.5) * (d - 0.8);
    const rr = Math.sqrt(Math.pow(fx / (w / 2), 2) + Math.pow(fz / (d / 2), 2));
    m4.makeTranslation(fx, 0.62 + Math.random() * 0.14, fz);
    im.setMatrixAt(i, m4);
    im.setColorAt(i, col.setHex(flowerPalette[Math.min(4, Math.floor(rr * 3.4))]));
  }
  im.castShadow = true; g.add(im);
  return g;
}

const flags = [];
function makeFlag(w, h, phase) {
  const g = new THREE.PlaneGeometry(w, h, 16, 8);
  g.translate(w / 2, 0, 0);
  const m = new THREE.Mesh(g, M.flag);
  flags.push({ mesh: m, w, phase });
  return m;
}

function textBoard(text, w, h) {
  const t = tex(1024, Math.round(1024 * h / w), (x, W, H) => {
    x.fillStyle = '#b8271b'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e8e2d2'; x.lineWidth = 8; x.strokeRect(10, 10, W - 20, H - 20);
    x.fillStyle = '#f4efe2'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `bold ${Math.floor(H * 0.6)}px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif`;
    x.fillText(text, W / 2, H / 2 + 4);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, name: 'slogan' }));
}
/* The portrait over the central arch, painted rather than photographed:
   a gilt frame, a pale sky ground, a warm face light and a dark tunic. At
   the scale it is read from — five metres up, across the moat — it is the
   silhouette that carries, and this keeps the page free of image files. */
function portrait(w, h) {
  const t = tex(512, Math.round(512 * h / w), (x, W, H) => {
    x.fillStyle = '#c9a94f'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#a8873a'; x.fillRect(W * .03, H * .025, W * .94, H * .95);
    x.fillStyle = '#9db3c4'; x.fillRect(W * .07, H * .06, W * .86, H * .88);
    const g = x.createRadialGradient(W / 2, H * .4, W * .04, W / 2, H * .4, W * .5);
    g.addColorStop(0, '#e8d6bd'); g.addColorStop(1, 'rgba(232,214,189,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(W / 2, H * .38, W * .2, H * .19, 0, 0, 7); x.fill();
    x.fillStyle = '#3a2a1e'; x.beginPath(); x.ellipse(W / 2, H * .26, W * .17, H * .1, 0, 0, 7); x.fill();
    x.fillStyle = '#59626d'; x.beginPath();
    x.moveTo(W * .16, H * .94); x.quadraticCurveTo(W / 2, H * .5, W * .84, H * .94); x.closePath(); x.fill();
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, name: 'portrait' }));
}

/* ================= GROUND ================= */
const groundGrp = new THREE.Group();
{
  const far = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200), new THREE.MeshStandardMaterial({ color: 0x9aa08c, roughness: 1, name: 'earth' }));
  far.rotation.x = -Math.PI / 2; far.position.y = -0.15; groundGrp.add(far);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ map: pavingTex(), roughness: .95, name: 'paving' }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.z = 300; plaza.receiveShadow = true; groundGrp.add(plaza);
  const ave = new THREE.Mesh(new THREE.PlaneGeometry(1400, 38), new THREE.MeshStandardMaterial({ color: 0x8b8780, roughness: 1, name: 'avenue' }));
  ave.rotation.x = -Math.PI / 2; ave.position.set(0, 0.12, 64); groundGrp.add(ave);
  for (const lz of [-4, 10, 24]) {
    const lane = box(1400, 0.02, 0.35, M.marble);
    lane.position.set(0, 0.16, 64 + lz - 15);
    lane.material = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 1, name: 'lane' });
    groundGrp.add(lane);
  }
}
reg(groundGrp, 0.0, 0.06, 'fade');

/* ================= MOAT + FIVE BRIDGES ================= */
const moatGrp = new THREE.Group();
{
  const moat = new THREE.Mesh(new THREE.PlaneGeometry(160, 10), M.water);
  moat.rotation.x = -Math.PI / 2; moat.position.set(0, 0.18, 27); moatGrp.add(moat);
  const edgeN = box(160, 0.5, 0.8, M.marble); edgeN.position.set(0, 0.25, 21.6); moatGrp.add(edgeN);
  const edgeS = box(160, 0.5, 0.8, M.marble); edgeS.position.set(0, 0.25, 32.4); moatGrp.add(edgeS);
  const R = 22, half = Math.asin(6.5 / R);
  for (const bx of [0, -11.5, 11.5, -23, 23]) {
    const b = new THREE.Group(); b.position.set(bx, 0, 27);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 6, 26, 1, true, Math.PI / 2 - half, half * 2), M.marble);
    deck.rotation.z = Math.PI / 2; deck.position.y = 1.9 - R; deck.castShadow = true; b.add(deck);
    const pts = [];
    for (let z = -6; z <= 6; z += 1.5) {
      const y = Math.sqrt(R * R - z * z) - R + 1.9;
      pts.push([-3, y, z], [3, y, z]);
    }
    b.add(balustrade(pts, []));
    for (const s of [-1, 1]) {
      for (let z = -5.2; z < 5.2; z += 1.5) {
        const y0 = Math.sqrt(R * R - z * z) - R + 1.9, y1 = Math.sqrt(R * R - (z + 1.5) * (z + 1.5)) - R + 1.9;
        const rl = box(0.16, 0.16, 1.7, M.marble);
        rl.position.set(s * 3, (y0 + y1) / 2 + 1.25, z + 0.75);
        rl.rotation.x = Math.atan2(y1 - y0, 1.5); b.add(rl);
      }
    }
    moatGrp.add(b);
  }
}
reg(moatGrp, 0.045, 0.13, 'drop', true);

/* ================= GATE WALL (real arch tunnels) ================= */
const gate = new THREE.Group();
const ARCHES = [{ x: 0, w: 6.2, h: 8.8 }, { x: -12.5, w: 4.4, h: 6.4 }, { x: 12.5, w: 4.4, h: 6.4 }, { x: -24, w: 4.4, h: 6.4 }, { x: 24, w: 4.4, h: 6.4 }];
{
  // The arches are holes in an extruded shape, so they are real tunnels
  // through 36m of wall rather than dark rectangles painted on it.
  const shape = new THREE.Shape();
  shape.moveTo(-33, 0); shape.lineTo(33, 0); shape.lineTo(33, 13); shape.lineTo(-33, 13); shape.closePath();
  for (const a of ARCHES) {
    const p = new THREE.Path();
    p.moveTo(a.x - a.w / 2, 0);
    p.lineTo(a.x - a.w / 2, a.h - a.w / 2);
    p.absarc(a.x, a.h - a.w / 2, a.w / 2, Math.PI, 0, true);
    p.lineTo(a.x + a.w / 2, 0);
    p.closePath();
    shape.holes.push(p);
  }
  const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: 36, bevelEnabled: false });
  wallGeo.translate(0, 0, -18);
  const wall = new THREE.Mesh(wallGeo, M.wall); gate.add(wall);
  const plinth = box(66.8, 1.4, 36.8, M.marble); plinth.position.y = 0.7; gate.add(plinth);
  for (const a of ARCHES) {                                   // doors + tunnel depth
    const isC = a.x === 0;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(a.w - 0.3, a.h - 0.4), M.door);
    door.position.set(a.x, (a.h - 0.4) / 2, isC ? -14 : 4); gate.add(door);
    const dk = new THREE.Mesh(new THREE.PlaneGeometry(a.w - 0.1, a.h - 0.1), M.dark);
    dk.position.set(a.x, a.h / 2, isC ? -14.2 : 3.8); dk.position.z -= 0.15; gate.add(dk);
  }
  for (const s of [-1, 1]) {                                  // long flanking walls + tile coping
    const wSeg = box(96, 9, 5, M.wallP); wSeg.position.set(s * 81, 4.5, 10); gate.add(wSeg);
    const capT = box(96, 1.1, 6, M.tileP); capT.position.set(s * 81, 9.55, 10); gate.add(capT);
    const wPl = box(96, 1, 5.4, M.marble); wPl.position.set(s * 81, 0.5, 10); gate.add(wPl);
    const pav = new THREE.Group(); pav.position.set(s * 62, 9.8, 10);     // small gate pavilion on the wall
    const pBody = box(14, 5.6, 10, M.wallP); pBody.position.y = 2.8; pav.add(pBody);
    const pWin = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.2), M.lattice); pWin.position.set(0, 3.7, 5.04); pav.add(pWin);
    for (let ci = 0; ci < 4; ci++) { const c = cyl(0.3, 0.34, 5.6, M.column, 10); c.position.set(-5.4 + ci * 3.6, 2.8, 5.2); pav.add(c); }
    const pRoof = roof(17, 12, 2.4, 9, 1.3); pRoof.position.y = 6.6; pav.add(pRoof);
    const pav2 = pav.clone(); pav2.position.set(s * 105, 9.8, 10); gate.add(pav2);
    gate.add(pav);
  }
  const frame = box(5.5, 6.9, 0.22, M.gold); frame.position.set(0, 11, 18.1); gate.add(frame);
  const port = portrait(4.8, 6.2); port.position.set(0, 11, 18.25); gate.add(port);
  const b1 = textBoard('中华人民共和国万岁', 16.5, 2.0); b1.position.set(-20.5, 8.8, 18.12); gate.add(b1);
  const b2 = textBoard('世界人民大团结万岁', 16.5, 2.0); b2.position.set(20.5, 8.8, 18.12); gate.add(b2);
  for (const s of [-1, 1]) { const hedge = box(17, 1.7, 2.2, M.hedge); hedge.position.set(s * 13.5, 0.85, 19.6); gate.add(hedge); }
}
reg(gate, 0.10, 0.29, 'drop', true);

/* ================= TERRACE ================= */
const terrace = new THREE.Group(); terrace.position.y = 13;
{
  const pts = [
    ...linePts(-32.4, 17.6, 32.4, 17.6, 0.35),
    ...linePts(-32.4, -17.6, 32.4, -17.6, 0.35),
    ...linePts(-32.4, -17.6, -32.4, 17.6, 0.35),
    ...linePts(32.4, -17.6, 32.4, 17.6, 0.35),
  ];
  terrace.add(balustrade(pts, [
    { w: 65.6, d: 0.34, x: 0, y: 1.55, z: 17.6 }, { w: 65.6, d: 0.34, x: 0, y: 1.55, z: -17.6 },
    { w: 0.34, d: 35.6, x: 32.4, y: 1.55, z: 0 }, { w: 0.34, d: 35.6, x: -32.4, y: 1.55, z: 0 },
  ]));
  const plat = box(58, 1.1, 25, M.marble); plat.position.y = 0.55; terrace.add(plat);
  for (let i = 0; i < 14; i++) {                              // flag row along the parapet
    const x = -29.9 + i * 4.6;
    const pole = cyl(0.055, 0.07, 3.6, M.marble, 6); pole.position.set(x, 2.6, 16.6); terrace.add(pole);
    const f = makeFlag(1.9, 1.25, i * 0.7); f.position.set(x, 3.8, 16.6); terrace.add(f);
  }
}
reg(terrace, 0.26, 0.35, 'drop', true);

/* ================= LOWER HALL (9 bays) ================= */
const colonnade = new THREE.Group(); colonnade.position.y = 14.1;
{
  const inner = box(50, 8.6, 15, M.wallP); inner.position.y = 4.3; colonnade.add(inner);
  latticeTexture.repeat.set(8, 1);
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(49, 3.4), M.lattice);
    win.position.set(0, 6.1, s * 7.53); if (s < 0) win.rotation.y = Math.PI; colonnade.add(win);
    const doors = new THREE.Mesh(new THREE.PlaneGeometry(49, 4.0), M.lattice);
    doors.position.set(0, 2.1, s * 7.53); if (s < 0) doors.rotation.y = Math.PI; colonnade.add(doors);
  }
  for (let i = 0; i < 10; i++) {
    const x = -26 + i * (52 / 9);
    for (const zz of [9.8, -9.8]) { const c = cyl(0.55, 0.62, 8.8, M.column); c.position.set(x, 4.4, zz); colonnade.add(c); }
  }
  const beam = box(54, 0.9, 20.5, M.column); beam.position.y = 8.85; colonnade.add(beam);
  for (let i = 0; i < 9; i++) {                               // red lanterns between the columns
    const x = -23.1 + i * (46.2 / 8);
    const la = new THREE.Group(); la.position.set(x, 7.1, 10.4);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), M.lantern); body.scale.y = 0.82; la.add(body);
    const capT2 = cyl(0.3, 0.42, 0.22, M.gold, 10); capT2.position.y = 0.55; la.add(capT2);
    const tas = cyl(0.06, 0.06, 0.5, M.gold, 6); tas.position.y = -0.75; la.add(tas);
    colonnade.add(la);
  }
}
reg(colonnade, 0.32, 0.44, 'drop', true);

const lowerRoof = roof(64, 28, 4.2, 42, 2.6); lowerRoof.position.y = 23.4;
reg(lowerRoof, 0.42, 0.54, 'drop', true);

/* ================= UPPER STOREY ================= */
const upperStorey = new THREE.Group(); upperStorey.position.y = 26.2;
{
  const wallU = box(45, 5.6, 13, M.wallP); wallU.position.y = 2.8; upperStorey.add(wallU);
  const winU = new THREE.Mesh(new THREE.PlaneGeometry(43, 3.2), M.lattice);
  winU.position.set(0, 3.4, 6.53); upperStorey.add(winU);
  for (let i = 0; i < 10; i++) {
    const x = -21.5 + i * (43 / 9);
    for (const zz of [7, -7]) { const c = cyl(0.45, 0.5, 5.6, M.column); c.position.set(x, 2.8, zz); upperStorey.add(c); }
  }
  const beamU = box(47, 0.8, 15.2, M.column); beamU.position.y = 5.9; upperStorey.add(beamU);
  const balc = [
    ...linePts(-24, 8.6, 24, 8.6, 0.15, 1.9),
    ...linePts(-24, -8.6, 24, -8.6, 0.15, 1.9),
    ...linePts(-24, -8.6, -24, 8.6, 0.15, 1.9),
    ...linePts(24, -8.6, 24, 8.6, 0.15, 1.9),
  ];
  upperStorey.add(balustrade(balc, [
    { w: 48.6, d: 0.3, x: 0, y: 1.35, z: 8.6 }, { w: 48.6, d: 0.3, x: 0, y: 1.35, z: -8.6 },
    { w: 0.3, d: 17.6, x: 24, y: 1.35, z: 0 }, { w: 0.3, d: 17.6, x: -24, y: 1.35, z: 0 },
  ]));
  const emblem = cyl(1.05, 1.05, 0.22, M.gold, 24); emblem.rotation.x = Math.PI / 2; emblem.position.set(0, 4.7, 7.14); upperStorey.add(emblem);
}
reg(upperStorey, 0.51, 0.61, 'drop', true);

const upperRoof = roof(56, 20, 6.4, 34, 3.1); upperRoof.position.y = 32.0;
reg(upperRoof, 0.59, 0.70, 'drop', true);

/* ================= FOREGROUND ORNAMENTS ================= */
const ornaments = new THREE.Group();
{
  for (const s of [-1, 1]) {                                   // huabiao
    const hb = new THREE.Group(); hb.position.set(s * 17, 0, 48);
    const ped = cyl(1.7, 1.9, 1.3, M.marble, 8); ped.position.y = 0.65; hb.add(ped);
    const shaft = cyl(0.75, 0.92, 10, M.marble, 16); shaft.position.y = 6; hb.add(shaft);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.26, 10, 24), M.marble); ring.rotation.x = Math.PI / 2; ring.position.y = 9.4; hb.add(ring);
    const bar = box(4.4, 0.42, 0.68, M.marble); bar.position.y = 10.15; bar.rotation.y = 0.2; hb.add(bar);
    const cap2 = cyl(1.3, 1.05, 0.5, M.marble, 16); cap2.position.y = 11.05; hb.add(cap2);
    const beast = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 12), M.marble); beast.position.y = 11.9; beast.scale.set(0.9, 1.1, 1.6); hb.add(beast);
    ornaments.add(hb);
  }
  for (const s of [-1, 1]) {                                   // lions
    const li = new THREE.Group(); li.position.set(s * 9.5, 0, 43);
    const ped = box(2.5, 1.6, 3.4, M.marble); ped.position.y = 0.8; li.add(ped);
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 12), M.marble); body.scale.set(1.05, 1.25, 1.7); body.position.y = 2.7; li.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), M.marble); head.position.set(0, 4, 1.0); li.add(head);
    const mane = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), M.marble); mane.position.set(0, 3.9, 0.6); mane.scale.set(1.1, 1, 0.8); li.add(mane);
    ornaments.add(li);
  }
  for (const s of [-1, 1]) {                                   // ornate lamp pair on the axis
    const lp = new THREE.Group(); lp.position.set(s * 7, 0, 60);
    const pole = cyl(0.16, 0.24, 10, M.dark, 10); pole.position.y = 5; lp.add(pole);
    for (let a = 0; a < 6; a++) {
      const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), M.marble);
      g2.position.set(Math.cos(a * Math.PI / 3) * 1.1, 9.4, Math.sin(a * Math.PI / 3) * 1.1); lp.add(g2);
    }
    const g1 = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), M.marble); g1.position.y = 10.6; lp.add(g1);
    ornaments.add(lp);
  }
}
reg(ornaments, 0.66, 0.74, 'pop', true);

/* ================= GARDENS, RAILINGS, FLAG ROWS ================= */
const grass = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 1, name: 'grass' });
const gardens = new THREE.Group();
for (const s of [-1, 1]) {
  const lawnF = new THREE.Mesh(new THREE.PlaneGeometry(52, 9), grass); lawnF.rotation.x = -Math.PI / 2; lawnF.position.set(s * 52, 0.14, 40.5); gardens.add(lawnF);
  const bF = flowerBed(30, 6); bF.position.set(s * 50, 0, 40.5); gardens.add(bF);                    // flower ribbons by the gate
  const lawnW = new THREE.Mesh(new THREE.PlaneGeometry(11, 68), grass); lawnW.rotation.x = -Math.PI / 2; lawnW.position.set(s * 19, 0.14, 72); gardens.add(lawnW);
  const bW = flowerBed(8, 56); bW.position.set(s * 19, 0, 72); gardens.add(bW);
  const b1 = flowerBed(42, 17); b1.position.set(s * 36, 0, 94); gardens.add(b1);
  const lawnM = new THREE.Mesh(new THREE.PlaneGeometry(130, 36), grass); lawnM.rotation.x = -Math.PI / 2; lawnM.position.set(s * 75, 0.14, 147); gardens.add(lawnM);
  const bM = flowerBed(118, 30); bM.position.set(s * 75, 0, 147); gardens.add(bM);                   // grand central fields
  const b2 = flowerBed(26, 13); b2.position.set(s * 82, 0, 94); gardens.add(b2);
  const hg = box(44, 1.5, 1.5, M.hedge); hg.position.set(s * 36, 0.75, 104.5); gardens.add(hg);
  const hg2 = box(17, 1.4, 2.0, M.hedge); hg2.position.set(s * 13.5, 0.7, 20.4); gardens.add(hg2);
}
const lawnC = new THREE.Mesh(new THREE.PlaneGeometry(70, 30), grass); lawnC.rotation.x = -Math.PI / 2; lawnC.position.set(0, 0.14, 150); gardens.add(lawnC);
const bC = flowerBed(64, 24); bC.position.set(0, 0, 150); gardens.add(bC);
reg(gardens, 0.12, 0.20, 'pop', true);

const fences = new THREE.Group();
for (const s of [-1, 1]) {
  fences.add(whiteFence(s * 8, 34, s * 8, 106));
  fences.add(whiteFence(s * 6, 45.5, s * 70, 45.5));
  fences.add(whiteFence(s * 6, 83, s * 130, 83));
  fences.add(whiteFence(s * 8, 20.8, s * 31, 20.8));
  fences.add(whiteFence(s * 3.4, 34, s * 3.4, 45));
  fences.add(whiteFence(s * 14.9, 34, s * 14.9, 45));
}
reg(fences, 0.67, 0.74, 'pop');

const squareFlags = new THREE.Group();
for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {
  const z = 170 + i * 48;
  const pole = cyl(0.09, 0.12, 9.5, fenceWhite, 8); pole.position.set(s * 56, 4.75, z); squareFlags.add(pole);
  const f = makeFlag(3.1, 2.05, i * 0.8 + s); f.position.set(s * 56, 8.7, z); squareFlags.add(f);
}
reg(squareFlags, 0.72, 0.80, 'pop');

/* ================= CROWD =================
   Nine hundred people, six instanced meshes: the thing that makes
   everything else read as architecture rather than a model on a table. */
const crowd = new THREE.Group();
let peopleCount = 0;
{
  const N = 900;
  const mkIM = (geo, opts, count) => new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial(Object.assign({ roughness: .85 }, opts)), count);
  const torsos = mkIM(new THREE.CapsuleGeometry(0.19, 0.42, 4, 10), { name: 'crowdJacket' }, N);
  const heads = mkIM(new THREE.SphereGeometry(0.115, 10, 9), { roughness: .6, name: 'crowdSkin' }, N);
  const hairs = mkIM(new THREE.SphereGeometry(0.121, 9, 7), { roughness: .9, name: 'crowdHair' }, N);
  const legs = mkIM(new THREE.CapsuleGeometry(0.075, 0.42, 3, 8), { name: 'crowdPants' }, N * 2);
  const arms = mkIM(new THREE.CapsuleGeometry(0.052, 0.36, 3, 8), { name: 'crowdArms' }, N * 2);
  const jackets = [0x37457e, 0x7e2f28, 0x3c5a45, 0x8c8578, 0xc8c2b4, 0x2e2e34, 0xa04a68, 0xe0d8c8, 0xb5372a, 0x4a6f9e, 0xd8d4cc, 0xd8b02a];
  const skins = [0xe8c19a, 0xd9a97c, 0xc98f62, 0xf0d0b0];
  const hairCs = [0x1c1a18, 0x2e241c, 0x413021, 0x6b6560];
  const pantsCs = [0x2a2a30, 0x3a3a45, 0x4a3b2e, 0x565064, 0x777268];
  const D = new THREE.Object3D(), P = new THREE.Object3D(), col = new THREE.Color();
  let i = 0;
  const put = (x, z) => {
    if (i >= N) return;
    const s = 0.88 + Math.random() * 0.24, yaw2 = Math.random() * Math.PI * 2;
    D.position.set(x, 0, z); D.rotation.set(0, yaw2, 0); D.scale.setScalar(s); D.updateMatrix();
    const at = (px, py, pz, rz, mesh, idx) => {
      P.position.set(px, py, pz); P.rotation.set(0, 0, rz || 0); P.scale.setScalar(1); P.updateMatrix();
      mesh.setMatrixAt(idx, new THREE.Matrix4().multiplyMatrices(D.matrix, P.matrix));
    };
    const jk = jackets[(Math.random() * jackets.length) | 0], pc = pantsCs[(Math.random() * pantsCs.length) | 0];
    at(0, 1.02, 0, 0, torsos, i); torsos.setColorAt(i, col.setHex(jk));
    at(0, 1.47, 0, 0, heads, i); heads.setColorAt(i, col.setHex(skins[(Math.random() * skins.length) | 0]));
    at(0, 1.52, -0.012, 0, hairs, i); hairs.setColorAt(i, col.setHex(hairCs[(Math.random() * hairCs.length) | 0]));
    hairs.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(D.matrix, new THREE.Matrix4().makeTranslation(0, 1.52, -0.012).multiply(new THREE.Matrix4().makeScale(1, 0.72, 1))));
    at(-0.095, 0.36, 0, 0.06, legs, i * 2); legs.setColorAt(i * 2, col.setHex(pc));
    at(0.095, 0.36, 0, -0.06, legs, i * 2 + 1); legs.setColorAt(i * 2 + 1, col.setHex(pc));
    const sw = (Math.random() - 0.5) * 0.3;
    at(-0.26, 1.02, 0, 0.22 + sw, arms, i * 2); arms.setColorAt(i * 2, col.setHex(jk));
    at(0.26, 1.02, 0, -0.22 + sw, arms, i * 2 + 1); arms.setColorAt(i * 2 + 1, col.setHex(jk));
    i++;
  };
  for (let k2 = 0; k2 < 240; k2++) put((Math.random() - 0.5) * 13, 36 + Math.random() * 72);      // axis walkway
  for (let k2 = 0; k2 < 110; k2++) put((Math.random() - 0.5) * 56, 19 + Math.random() * 2.4);     // at the wall
  for (let k2 = 0; k2 < 430; k2++) put((Math.random() - 0.5) * 380, 125 + Math.random() * 420);   // across the square
  for (let k2 = 0; k2 < 120; k2++) put((Math.random() - 0.5) * 100, 395 + Math.random() * 110);   // around the monument
  torsos.count = heads.count = hairs.count = i; legs.count = arms.count = i * 2;
  torsos.castShadow = legs.castShadow = true;
  peopleCount = i;
  crowd.add(torsos, heads, hairs, legs, arms);
}
reg(crowd, 0.69, 0.77, 'pop');

/* ================= SQUARE ================= */
const flagpole = new THREE.Group(); flagpole.position.z = 115;
{
  const ped = box(10, 0.9, 10, M.marble); ped.position.y = 0.45; flagpole.add(ped);
  const ped2 = box(7, 0.9, 7, M.marble); ped2.position.y = 1.3; flagpole.add(ped2);
  const fence = balustrade(linePts(-5, 5, 5, 5, 1.75, 1.6).concat(linePts(-5, -5, 5, -5, 1.75, 1.6), linePts(-5, -5, -5, 5, 1.75, 1.6), linePts(5, -5, 5, 5, 1.75, 1.6)), []);
  flagpole.add(fence);
  const pole = cyl(0.16, 0.26, 32, M.marble, 12); pole.position.y = 17.7; flagpole.add(pole);
  const f = makeFlag(6.4, 4.2, 0); f.position.y = 31.2; flagpole.add(f);
}
reg(flagpole, 0.70, 0.78, 'drop', true);
for (const s of [-1, 1]) { const f = makeFlag(3, 2, s); f.position.set(s * 29.5, 19.4, 13); reg(f, 0.64, 0.70, 'pop'); }
const balconyFlags = new THREE.Group(); balconyFlags.position.y = 27.7;
for (let i = 0; i < 6; i++) {
  const x = -20 + i * 8;
  const pole = cyl(0.05, 0.05, 2.6, M.marble, 6); pole.position.set(x, 1.3, 8.8); balconyFlags.add(pole);
  const f = makeFlag(1.7, 1.15, i * 0.9); f.position.set(x, 2.2, 8.8); balconyFlags.add(f);
}
reg(balconyFlags, 0.62, 0.68, 'pop');

const monument = new THREE.Group(); monument.position.z = 450;
{
  const p1 = box(64, 1.6, 64, M.beige); p1.position.y = 0.8; monument.add(p1);
  const p2 = box(46, 1.6, 46, M.marble); p2.position.y = 2.4; monument.add(p2);
  const pts = linePts(-23, 23, 23, 23, 3.2, 2.4).concat(linePts(-23, -23, 23, -23, 3.2, 2.4), linePts(-23, -23, -23, 23, 3.2, 2.4), linePts(23, -23, 23, 23, 3.2, 2.4));
  monument.add(balustrade(pts, []));
  const base2 = box(17, 6.4, 15, M.marble); base2.position.y = 6.4; monument.add(base2);
  const wreath = box(13, 2.2, 11, M.beige); wreath.position.y = 10.6; monument.add(wreath);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 4.4, 27, 4, 1), M.marble);
  shaft.rotation.y = Math.PI / 4; shaft.position.y = 25.2; monument.add(shaft);
  const capR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 3.4, 3.2, 4, 1), M.marble);
  capR.rotation.y = Math.PI / 4; capR.position.y = 40.3; monument.add(capR);
}
reg(monument, 0.72, 0.82, 'drop', true);

function colonnadeBlock(w, h, d, cols, facingX) {
  const g = new THREE.Group();
  facadeTexture.repeat.set(6, 1);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.facade); body.position.y = h / 2 + 2; g.add(body);
  const plinth = box(w + 18, 2.4, d + 18, M.beige); plinth.position.y = 1.2; g.add(plinth);
  const steps = box(w + 8, 1.2, d + 8, M.beige); steps.position.y = 2.4; g.add(steps);
  const trim = box(w + 5, 3.5, d + 5, M.beige); trim.position.y = h + 3.4; g.add(trim);
  const attic = box(w - 6, 2.4, d - 6, M.beige); attic.position.y = h + 6.2; g.add(attic);
  const cx = facingX * (w / 2 + 2.4);
  for (let i = 0; i < cols; i++) {
    const z = -d / 2 + 14 + i * ((d - 28) / (cols - 1));
    const c = cyl(1.5, 1.7, h - 2, M.marble, 12); c.position.set(cx, (h - 2) / 2 + 2.4, z); g.add(c);
  }
  return g;
}
const greatHall = colonnadeBlock(120, 36, 340, 16, +1); greatHall.position.set(-355, 0, 330);
reg(greatHall, 0.76, 0.86, 'drop');
const museum = colonnadeBlock(120, 36, 340, 16, -1); museum.position.set(355, 0, 330);
reg(museum, 0.78, 0.88, 'drop');

const mausoleum = new THREE.Group(); mausoleum.position.z = 640;
{
  const plat = box(155, 2.6, 115, M.beige); plat.position.y = 1.3; mausoleum.add(plat);
  const plat2 = box(135, 2.2, 95, M.beige); plat2.position.y = 3.5; mausoleum.add(plat2);
  const body = box(105, 22, 68, M.facade); body.position.y = 15.6; mausoleum.add(body);
  for (let i = 0; i < 12; i++) {
    const x = -49.5 + i * 9;
    for (const zz of [-36.5, 36.5]) { const c = cyl(1.2, 1.35, 22, M.marble, 12); c.position.set(x, 15.6, zz); mausoleum.add(c); }
  }
  const trim = box(114, 3, 77, M.gold); trim.position.y = 28.1; mausoleum.add(trim);
  const top = box(106, 2.4, 69, M.tileP); top.position.y = 30.8; mausoleum.add(top);
}
reg(mausoleum, 0.82, 0.92, 'drop');

const greenery = new THREE.Group();
let treeCount = 0;
{
  const tree = (x, z, s = 1, dark = false) => {
    const t = new THREE.Group(); t.position.set(x, 0, z);
    const tr = cyl(0.35, 0.5, 3.5, M.trunk, 7); tr.position.y = 1.75; t.add(tr);
    const fo = new THREE.Mesh(new THREE.SphereGeometry(3.4 * s, 9, 7), dark ? M.leafD : M.leaf); fo.position.y = 5.2 * s + 1.5; fo.scale.y = 1.18; t.add(fo);
    greenery.add(t); treeCount++;
  };
  for (let z = 110; z <= 580; z += 40) { tree(-255, z, 1 + ((z * 7) % 10) / 26, (z % 80) === 30); tree(255, z + 17, 1 + ((z * 13) % 10) / 26, (z % 80) === 70); }
  for (let x = -230; x <= 230; x += 42) { if (Math.abs(x) > 42) tree(x, 88, 0.85, (x % 84) === 0); }
  for (let z = 160; z <= 560; z += 58) {
    for (const s of [-1, 1]) {
      const lp = new THREE.Group(); lp.position.set(s * 48, 0, z);
      const pole = cyl(0.13, 0.2, 11, M.dark, 8); pole.position.y = 5.5; lp.add(pole);
      const g1 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 9, 7), M.marble); g1.position.y = 11.6; lp.add(g1);
      for (let a = 0; a < 4; a++) {
        const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 7), M.marble);
        g2.position.set(Math.cos(a * Math.PI / 2) * 0.95, 10.5, Math.sin(a * Math.PI / 2) * 0.95); lp.add(g2);
      }
      greenery.add(lp);
    }
  }
}
reg(greenery, 0.86, 0.95, 'pop');

scene.add(model);
/* three-d-stage exports whatever object it is showing. We add the model
   ourselves rather than calling setObject(), because that would blanket
   every mesh in the square with shadow casting and reframe the camera off
   the spline — so hand the stage the object directly for download(). */
stage._object = model;

/* ================= SCROLL, CAMERA, CHROME ================= */
const camPos = new THREE.CatmullRomCurve3([
  new THREE.Vector3(18, 3, 78),
  new THREE.Vector3(42, 12, 108),
  new THREE.Vector3(-56, 20, 128),
  new THREE.Vector3(-22, 28, 148),
  new THREE.Vector3(64, 40, 185),
  new THREE.Vector3(28, 88, 330),
  new THREE.Vector3(0, 195, 640),
  new THREE.Vector3(0, 340, 980),
]);
const camTgt = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 5, 25),
  new THREE.Vector3(0, 9, 12),
  new THREE.Vector3(0, 15, 5),
  new THREE.Vector3(0, 20, 0),
  new THREE.Vector3(0, 25, 0),
  new THREE.Vector3(0, 22, 130),
  new THREE.Vector3(0, 12, 320),
  new THREE.Vector3(0, 5, 350),
]);

/* The caption that runs beside the build — the story, not the parts list. */
const CAPS = [
  { s: 0.05, e: 0.14, k: 'The approach', t: 'Five marble bridges cross the Golden Water moat.' },
  { s: 0.14, e: 0.33, k: 'First built 1420 · Ming dynasty', t: 'The crimson wall rises — five arched passages into the imperial city.' },
  { s: 0.39, e: 0.62, k: 'The gatehouse', t: 'A double-eaved hall of golden glazed tile crowns the gate, 34 metres above the square.' },
  { s: 0.65, e: 0.80, k: 'October 1, 1949', t: 'From this rostrum the People’s Republic was proclaimed. The flag rises over the square.' },
  { s: 0.84, e: 1.01, k: 'Tiananmen Square', t: 'One of the largest public squares on earth — the Monument, the Great Hall, the Museum, the Mausoleum.' },
];
/* …and the rail label, which names the piece currently landing. */
const CHAPTERS = [
  [0.00, 'Bare ground'],
  [0.05, 'Golden Water moat, five bridges'],
  [0.12, 'Lawns and flower ribbons'],
  [0.15, 'The gate wall, five arches'],
  [0.28, 'Terrace and balustrade'],
  [0.34, 'The hall below, nine bays'],
  [0.44, 'The lower roof'],
  [0.53, 'The upper storey'],
  [0.61, 'The upper roof'],
  [0.67, 'Huabiao, lions, lamps'],
  [0.70, 'The crowd arrives'],
  [0.72, 'The flagpole'],
  [0.74, 'The Monument'],
  [0.78, 'Great Hall and Museum'],
  [0.84, 'The Mausoleum'],
  [0.88, 'Trees and lamps'],
  [0.97, 'The square, complete'],
];
function chapter(p) {
  let label = CHAPTERS[0][1];
  for (const [at, name] of CHAPTERS) if (p >= at) label = name;
  return label;
}

const track = document.getElementById('build');
const titleCard = document.getElementById('titleCard');
const hint = document.getElementById('scrollHint');
const railFill = document.getElementById('railFill');
const railLabel = document.getElementById('railLabel');
const capEl = document.getElementById('caption');
const capK = document.getElementById('capK');
const capT = document.getElementById('capT');
const btnPlay = document.getElementById('btnPlay');

/* #build is a tall section with a sticky stage inside it, so its own scroll
   progress is the build timeline — the notes below it then scroll normally
   over a finished square. */
function scrollProgress() {
  const r = track.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
}

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
let target = REDUCE ? 1 : scrollProgress();
let smooth = target;

function readScroll() { target = scrollProgress(); }
if (!REDUCE) {
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', readScroll);
}

/* Look around: mouse or pen drag, or two fingers on touch. One finger keeps
   scrolling the page, because scrolling is what builds the gate. */
let yaw = 0, pitch = 0;
const active = new Map();
let anchor = null;
const canvas = renderer.domElement;
const mid = () => {
  let x = 0, y = 0;
  for (const p of active.values()) { x += p.x; y += p.y; }
  return { x: x / active.size, y: y / active.size };
};
const dragging = () => active.size === 2 || (active.size === 1 && [...active.values()][0].mouse);
canvas.addEventListener('pointerdown', (e) => {
  active.set(e.pointerId, { x: e.clientX, y: e.clientY, mouse: e.pointerType !== 'touch' });
  anchor = dragging() ? mid() : null;
});
window.addEventListener('pointermove', (e) => {
  const p = active.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (!dragging()) { anchor = null; return; }
  const m = mid();
  if (!anchor) { anchor = m; return; }
  yaw -= (m.x - anchor.x) * 0.004;
  pitch = Math.max(-0.5, Math.min(0.6, pitch + (m.y - anchor.y) * 0.003));
  anchor = m;
  stopPlay();
});
const release = (e) => { active.delete(e.pointerId); anchor = dragging() ? mid() : null; };
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), SPH = new THREE.Spherical();
function placeCamera(p) {
  camPos.getPoint(p, V1); camTgt.getPoint(p, V2);
  V1.sub(V2);
  SPH.setFromVector3(V1);
  SPH.theta += yaw;
  SPH.phi = Math.max(0.12, Math.min(Math.PI / 2 + 0.25, SPH.phi - pitch));
  V1.setFromSpherical(SPH).add(V2);
  camera.position.copy(V1);
  camera.lookAt(V2);
}

let lastChapter = '';
function paintChrome(p) {
  if (railFill) railFill.style.width = (p * 100).toFixed(1) + '%';
  if (railLabel) {
    const c = chapter(p);
    if (c !== lastChapter) { railLabel.textContent = c; lastChapter = c; }
  }
  if (titleCard) titleCard.style.opacity = String(Math.max(0, 1 - p / 0.05));
  if (hint) hint.style.opacity = p > 0.012 ? '0' : '1';
  if (capEl) {
    const shown = CAPS.find((c) => p >= c.s && p <= c.e);
    if (shown) {
      if (capK.textContent !== shown.k) { capK.textContent = shown.k; capT.textContent = shown.t; }
      capEl.style.opacity = '1';
    } else {
      capEl.style.opacity = '0';
    }
  }
}

/* ================= playback =================
   "Raise the gate" drives the scroll itself at a fixed slow rate, so a full
   build takes PLAY_SECONDS and every piece gets its own long arc through
   the air. Any real input — wheel, swipe, arrow key, a drag on the canvas —
   hands control straight back. */
const PLAY_SECONDS = 44;
const PLAY_RAMP = 0.1;
function ramp(t) {
  const e = PLAY_RAMP;
  if (e <= 0) return t;
  const v = 1 / (1 - e);
  if (t < e) return v * t * t / (2 * e);
  if (t <= 1 - e) return v * (t - e / 2);
  return 1 - v * (1 - t) * (1 - t) / (2 * e);
}
let play = null;
function labelPlayBtn(p) {
  if (!btnPlay) return;
  const want = play ? 'Stop' : ((p === undefined ? scrollProgress() : p) > 0.9 ? 'Take it down' : 'Raise the gate');
  if (btnPlay.textContent !== want) btnPlay.textContent = want;   // called every frame — don't churn the DOM
  btnPlay.classList.toggle('active', !!play);
}
function stopPlay() {
  if (!play) return;
  cancelAnimationFrame(play.raf);
  document.documentElement.style.scrollBehavior = '';
  play = null;
  labelPlayBtn();
}
function playFrame(now) {
  if (!play) return;
  // if the position isn't where we left it, the reader took over — let them
  if (play.mode === 'scroll' && Math.abs(window.scrollY - play.expect) > 14) { stopPlay(); return; }
  const t = play.dur > 0 ? Math.min(1, (now - play.t0) / (play.dur * 1000)) : 1;
  const v = play.from + (play.to - play.from) * ramp(t);
  if (play.mode === 'scroll') {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const y = Math.min(v, maxY);
    play.expect = y;
    window.scrollTo(0, y);
    readScroll();
  } else {
    target = v;
  }
  if (t >= 1) { stopPlay(); return; }
  play.raf = requestAnimationFrame(playFrame);
}
function startPlay() {
  const r = track.getBoundingClientRect();
  const top = r.top + window.scrollY;
  const span = Math.max(0, r.height - window.innerHeight);
  const atEnd = (span > 0 ? scrollProgress() : target) > 0.9;
  if (span > 0) {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const from = window.scrollY;
    const to = Math.min(maxY, atEnd ? top : top + span);
    if (Math.abs(to - from) < 2) return;
    play = { mode: 'scroll', from, to, expect: from, dur: PLAY_SECONDS * Math.abs(to - from) / span, t0: performance.now() };
    // our own per-frame scrollTo must not be smoothed on top of by CSS
    document.documentElement.style.scrollBehavior = 'auto';
  } else {
    // reduced motion collapses the track, so animate the assembly in place
    const from = target, to = atEnd ? 0 : 1;
    play = { mode: 'progress', from, to, dur: PLAY_SECONDS * Math.abs(to - from), t0: performance.now() };
  }
  labelPlayBtn();
  play.raf = requestAnimationFrame(playFrame);
}
if (btnPlay) btnPlay.addEventListener('click', () => { if (play) stopPlay(); else startPlay(); });

const NAV_KEY = /^(Arrow|Page|Home|End| )/;
['wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { if (play) stopPlay(); }, { passive: true }));
window.addEventListener('keydown', (e) => { if (play && NAV_KEY.test(e.key)) stopPlay(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlay(); });

const btnReset = document.getElementById('btnReset');
if (btnReset) btnReset.addEventListener('click', () => { yaw = 0; pitch = 0; stopPlay(); });

// Export buttons live in the page's own chrome (the stage runs hide-chrome).
document.querySelectorAll('[data-tiananmen-export]').forEach((btn) => {
  btn.disabled = false;
  btn.addEventListener('click', () => stage.download(btn.dataset.tiananmenExport));
});

/* ================= the loop ================= */
/* Each flag is a plane whose vertices are pushed every frame — worth doing
   only while the piece holding it has actually landed, so resolve each
   flag's registered ancestor once. */
for (const f of flags) {
  let n = f.mesh;
  while (n && n.userData.win === undefined) n = n.parent;
  f.owner = n || f.mesh;
}
function waveFlags(t) {
  for (const f of flags) {
    if (!f.owner.visible) continue;
    const posA = f.mesh.geometry.attributes.position;
    for (let i = 0; i < posA.count; i++) {
      const x = posA.getX(i);
      posA.setZ(i, Math.sin(x * 1.4 - t * 4.5 + f.phase) * 0.06 * f.w * (x / f.w));
    }
    posA.needsUpdate = true;
    f.mesh.geometry.computeVertexNormals();
  }
}
/* The build trails the scroll by a beat, which is what makes the pieces feel
   heavy. Chasing `target` by a fixed fraction per frame would make that lag
   depend on the frame rate — on a slow machine the gate ends up half-built at
   the bottom of the track — so the catch-up is exponential in real time
   instead: the same 0.07-per-frame feel at 60fps, and honest everywhere else. */
const CATCH_UP = 4.36;  // s⁻¹ — ln(1/0.93) × 60
let lastFrame = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.25);
  lastFrame = now;
  const t = now / 1000;
  smooth += (target - smooth) * (1 - Math.exp(-dt * CATCH_UP));
  const p = Math.min(1, Math.max(0, smooth));
  updateParts(p);
  placeCamera(p);
  paintChrome(p);
  labelPlayBtn(p);
  waveFlags(t);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(loop);

/* Don't render a hidden canvas: the notes below the build are a long read,
   and a 60fps WebGL loop behind them is pure battery burn. */
new IntersectionObserver((entries) => {
  const visible = entries.some((e) => e.isIntersecting);
  renderer.setAnimationLoop(visible ? loop : null);
  if (!visible) stopPlay();
}, { rootMargin: '120px' }).observe(track);

/* ================= counted, not typed =================
   The figures in the notes are read off the finished model, so the copy
   below can never drift from what the page actually builds. */
let meshCount = 0, triCount = 0;
const materialSet = new Set();
model.traverse((o) => {
  if (!o.isMesh) return;
  meshCount++;
  (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && materialSet.add(m));
  const g = o.geometry;
  if (!g || !g.attributes.position) return;
  const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
  triCount += tris * (o.isInstancedMesh ? o.count : 1);
});
const stats = {
  meshes: meshCount,
  materials: materialSet.size,
  triangles: Math.round(triCount),
  people: peopleCount,
  trees: treeCount,
  flags: flags.length,
};
const short = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M'
  : v >= 10000 ? Math.round(v / 1000) + 'k'
    : v.toLocaleString('en-US'));
document.querySelectorAll('[data-tiananmen-stat]').forEach((el) => {
  const v = stats[el.dataset.tiananmenStat];
  if (v != null) el.textContent = short(v);
});

if (REDUCE) {
  /* No scroll-driven assembly and no ten-viewport track — the section
     collapses to one viewport showing the finished square. The buttons
     still work, because clicking one is a choice. */
  document.body.classList.add('gate-static');
  target = smooth = 1;
  updateParts(1);
  placeCamera(1);
  paintChrome(1);
  if (titleCard) titleCard.style.opacity = '0';
}
window.dispatchEvent(new Event('tiananmen-ready'));
