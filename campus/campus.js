/* campus.js — the media campus, built out of boxes, extrusions and canvas
   textures. Nothing is loaded from a model file: every mesh here is written
   down, and every texture is painted into a <canvas> at runtime.

   The page owns the timeline. #build is a tall section with a sticky stage
   inside it (the same idiom as the scroll-scrubbed film bands on the home
   page): that section's scroll progress assembles the campus phase by phase
   and flies the camera along a fixed spline. Progress 0 is bare ground,
   1 is the finished campus. */
const stage = document.querySelector('three-d-stage');
// If three.js never loads, the stage rejects; index.html's overlay reports
// that to the reader, and this module simply stops here (awaiting a promise
// that never settles) instead of piling an unhandled rejection on top.
const { THREE } = await stage.ready.catch(() => new Promise(() => {}));
const renderer = stage._renderer, scene = stage._scene, camera = stage._camera, controls = stage._controls;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ---------- canvas texture helpers ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
let seed = 13;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Glass curtain-wall: 8 bays of 64px = 24m world. Varied reflective tints + mullions.
const glassMap = canvasTex(512, 128, (x) => {
  x.fillStyle = '#1e2830'; x.fillRect(0, 0, 512, 128);
  for (let b = 0; b < 16; b++) {
    const t = rnd() * 0.25;
    x.fillStyle = `rgb(${34 + t * 40 | 0},${48 + t * 40 | 0},${60 + t * 44 | 0})`;
    x.fillRect(b * 32 + 1, 3, 30, 122);
    x.fillStyle = 'rgba(220,235,245,0.09)';
    x.fillRect(b * 32 + 1, 3, 30, 14 + rnd() * 18);
    x.fillStyle = '#10161c'; x.fillRect(b * 32, 0, 1, 128);
  }
  x.fillStyle = '#10161c'; x.fillRect(0, 0, 512, 2); x.fillRect(0, 126, 512, 2);
});
const glassEmit = canvasTex(512, 128, (x) => {
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 128);
  for (let b = 0; b < 8; b++) if (rnd() < 0.3) {
    x.fillStyle = rnd() < 0.7 ? '#ffb763' : '#ffe3b0';
    x.fillRect(b * 64 + 6, 14, 52, 100);
  }
});
// White facade panels: joints every 4m (64px), occasional dark inset window patch.
const panelMap = canvasTex(1024, 128, (x) => {
  x.fillStyle = '#f0f2f4'; x.fillRect(0, 0, 1024, 128);
  for (let b = 0; b < 32; b++) {
    const v = 236 + rnd() * 12 | 0;
    x.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    x.fillRect(b * 32 + 1, 1, 30, 126);
    x.fillStyle = 'rgba(150,158,166,0.45)'; x.fillRect(b * 32, 0, 1, 128);
  }
  x.fillStyle = 'rgba(150,158,166,0.4)'; x.fillRect(0, 0, 1024, 1); x.fillRect(0, 127, 1024, 1);
});
// Podium curtain wall (box faces, tiled)
const podiumMap = canvasTex(512, 256, (x) => {
  x.fillStyle = '#232f2b'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
    const t = rnd() * 0.18;
    x.fillStyle = `rgb(${38 + t * 60 | 0},${52 + t * 60 | 0},${49 + t * 60 | 0})`;
    x.fillRect(i * 32 + 1, j * 64 + 1, 30, 62);
    x.fillStyle = 'rgba(200,225,235,0.05)'; x.fillRect(i * 32 + 1, j * 64 + 1, 30, 16);
  }
});
const podiumEmit = canvasTex(512, 256, (x) => {
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) if (rnd() < 0.3) {
    x.fillStyle = rnd() < 0.6 ? '#ffb763' : '#ffd9a0';
    x.fillRect(i * 32 + 2, j * 64 + 2, 28, 60);
  }
});
const drumMap = canvasTex(512, 256, (x) => {
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#a6aaae'); g.addColorStop(0.5, '#c2c6ca'); g.addColorStop(1, '#94989c');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.fillStyle = 'rgba(60,62,66,0.35)';
  for (let j = 0; j < 4; j++) x.fillRect(0, j * 64, 512, 2);
  for (let i = 0; i < 16; i++) x.fillRect(i * 32, 0, 1, 256);
});
const lawnMap = canvasTex(256, 256, (x) => {
  x.fillStyle = '#4d7738'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const t = rnd();
    x.fillStyle = t < 0.5 ? 'rgba(36,72,26,0.30)' : 'rgba(112,148,72,0.25)';
    x.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 2 + rnd() * 3);
  }
});
lawnMap.repeat.set(10, 6);
const asphaltMap = canvasTex(256, 256, (x) => {
  x.fillStyle = '#4c4e52'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(${120 + rnd() * 60 | 0},${120 + rnd() * 60 | 0},${125 + rnd() * 60 | 0},0.12)`;
    x.fillRect(rnd() * 256, rnd() * 256, 2, 2);
  }
  x.fillStyle = '#c9c9c4';
  for (let i = 0; i < 8; i++) x.fillRect(i * 32 + 6, 126, 20, 4);
});
asphaltMap.repeat.set(14, 1);
const paveMap = canvasTex(256, 256, (x) => {
  x.fillStyle = '#b3afa2'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(110,106,96,0.35)'; x.lineWidth = 1;
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 32); x.lineTo(256, i * 32); x.stroke(); }
});
paveMap.repeat.set(40, 30);

// ---------- materials ----------
const M = {};
function mat(name, opts, Cls = THREE.MeshStandardMaterial) { const m = new Cls(opts); m.name = name; M[name] = m; return m; }
mat('panel_white', { map: panelMap, color: 0xffffff, roughness: 0.34, metalness: 0.4, envMapIntensity: 0.7 });
M.panel_white.map = panelMap.clone(); M.panel_white.map.repeat.set(1 / 96, 1 / 2.65);
mat('glass_band', { map: glassMap, emissiveMap: glassEmit, emissive: 0xffffff, emissiveIntensity: 0, color: 0xffffff, roughness: 0.08, metalness: 0.65, envMapIntensity: 1.5 });
M.glass_band.map = glassMap.clone(); M.glass_band.map.repeat.set(1 / 24, 1 / 1.4);
M.glass_band.emissiveMap = glassEmit.clone(); M.glass_band.emissiveMap.repeat.set(1 / 24, 1 / 1.4);
mat('glass_green', { map: podiumMap, emissiveMap: podiumEmit, emissive: 0xffffff, emissiveIntensity: 0, color: 0xffffff, roughness: 0.10, metalness: 0.5, envMapIntensity: 1.4 });
M.glass_green.map.repeat.set(3, 1.4); M.glass_green.emissiveMap.repeat.copy(M.glass_green.map.repeat);
mat('metal_bronze', { map: drumMap, color: 0xffffff, roughness: 0.22, metalness: 0.75, envMapIntensity: 1.2 });
M.metal_bronze.map.repeat.set(6, 1);
mat('concrete', { color: 0xb4b1a8, roughness: 0.85, metalness: 0.05 });
mat('roof_grey', { color: 0x9fa3a8, roughness: 0.85, metalness: 0.1 });
mat('lawn', { map: lawnMap, color: 0xffffff, roughness: 1 });
mat('roof_green', { map: lawnMap.clone(), color: 0xcfe0c0, roughness: 1 });
M.roof_green.map.repeat.set(4, 2);
mat('leaf', { color: 0x3d652b, roughness: 0.95, flatShading: true });
mat('leaf_dark', { color: 0x2c4d1e, roughness: 0.95, flatShading: true });
mat('leaf_lt', { color: 0x4c7331, roughness: 0.95, flatShading: true });
mat('trunk', { color: 0x584431, roughness: 0.9 });
mat('asphalt', { map: asphaltMap, color: 0xffffff, roughness: 0.95 });
mat('pavement', { map: paveMap, color: 0xffffff, roughness: 0.9 });
mat('screen_dark', { color: 0x0d0f13, roughness: 0.25, metalness: 0.3, emissive: 0x2a6fdb, emissiveIntensity: 0 });
mat('lamp_glow', { color: 0xfff3dd, emissive: 0xffc27a, emissiveIntensity: 0 });
M.soffit_dark = new THREE.MeshStandardMaterial({ color: 0x33343a, roughness: 0.6, metalness: 0.2 }); M.soffit_dark.name = 'soffit_dark';

const model = new THREE.Group();
model.name = 'media_campus';
let uid = 0;
function add(parent, geo, material, name, x, y, z, phase, ry) {
  const m = new THREE.Mesh(geo, material);
  m.name = name + '_' + (uid++);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  m.userData.phase = phase;
  parent.add(m);
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r, h, s = 64) => new THREE.CylinderGeometry(r, r, h, s);

function hullShape(k = 1) {
  const s = new THREE.Shape();
  s.moveTo(88 * k, 0);
  s.quadraticCurveTo(30 * k, 26 * k, -55 * k, 24 * k);
  s.absarc(-55 * k, 0, 24 * k, Math.PI / 2, Math.PI * 1.5, false);
  s.quadraticCurveTo(30 * k, -26 * k, 88 * k, 0);
  return s;
}
function hullLayer(k, h) {
  const g = new THREE.ExtrudeGeometry(hullShape(k), { depth: h, bevelEnabled: false, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);
  return g;
}

// ---------- phase 0: ground ----------
add(model, box(360, 0.4, 300), M.pavement, 'ground_plate', 0, -0.2, 0, 0);
add(model, box(360, 0.22, 14), M.asphalt, 'road_south', 0, 0.02, 120, 0);
add(model, box(360, 0.22, 14), M.asphalt, 'road_north', 0, 0.02, -120, 0);
add(model, box(14, 0.22, 226), M.asphalt, 'road_east', 165, 0.02, 0, 0, Math.PI / 2);
add(model, box(14, 0.22, 226), M.asphalt, 'road_west', -165, 0.02, 0, 0, Math.PI / 2);
add(model, box(202, 0.34, 72), M.concrete, 'lawn_curb', -20, 0.14, 72, 0);
add(model, box(200, 0.3, 70), M.lawn, 'lawn_main', -20, 0.2, 72, 0);
add(model, box(60, 0.3, 40), M.lawn, 'lawn_east', 120, 0.2, 60, 0);
add(model, box(3, 0.42, 70), M.pavement, 'path_1', -50, 0.2, 72, 0);
add(model, box(3, 0.42, 70), M.pavement, 'path_2', 20, 0.2, 72, 0, 0.18);
add(model, box(140, 0.42, 3), M.pavement, 'path_3', -20, 0.2, 55, 0);

// ---------- phase 1: podium ----------
add(model, box(100, 25, 48), M.glass_green, 'podium_main', -42, 12.5, 0, 1);
add(model, box(42, 18, 32), M.glass_green, 'podium_annex', 16, 9, -12, 1);
add(model, box(30, 10, 24), M.glass_green, 'podium_front', 8, 5, 16, 1);
add(model, box(16, 9, 0.6), M.screen_dark, 'media_screen', -2, 9, 28.4, 1);
add(model, box(26, 0.7, 8), M.panel_white, 'entry_canopy', 8, 8.2, 30, 1);
add(model, cyl(0.35, 8, 12), M.concrete, 'canopy_post_a', -2, 4, 32, 1);
add(model, cyl(0.35, 8, 12), M.concrete, 'canopy_post_b', 18, 4, 32, 1);
add(model, box(100, 0.8, 6), M.panel_white, 'terrace_edge_1', -44, 22.4, 25.5, 1);
add(model, box(100, 1.2, 3.4), M.roof_green, 'terrace_planting_1', -44, 23.2, 25.2, 1);
add(model, box(70, 0.8, 5), M.panel_white, 'terrace_edge_2', -30, 14.4, 27.5, 1);
add(model, box(70, 1.2, 3), M.roof_green, 'terrace_planting_2', -30, 15.2, 27.2, 1);

// ---------- phase 2: cores + columns ----------
add(model, box(14, 25, 16), M.concrete, 'core_west', -18, 12.5, 0, 2);
add(model, box(12, 25, 14), M.concrete, 'core_east', 34, 12.5, 4, 2);
for (let i = 0; i < 4; i++) add(model, cyl(1.1, 25, 24), M.concrete, 'column', 50 + i * 9, 12.5, -2 + (i % 2) * 6, 2);

// ---------- phase 3: drums ----------
const drum = new THREE.Group(); drum.name = 'drum_theatre'; drum.userData.phase = 3;
drum.position.set(56, 0, 42); model.add(drum);
add(drum, cyl(23, 6), M.glass_green, 'drum_glass_base', 0, 3, 0, 3);
add(drum, cyl(23.4, 15), M.metal_bronze, 'drum_body', 0, 13.5, 0, 3);
add(drum, cyl(22.2, 1.2), M.roof_green, 'drum_green_roof', 0, 21.6, 0, 3);
const drum2 = new THREE.Group(); drum2.name = 'drum_small'; drum2.userData.phase = 3;
drum2.position.set(96, 0, 14); model.add(drum2);
add(drum2, cyl(13, 4), M.glass_green, 'drum2_glass', 0, 2, 0, 3);
add(drum2, cyl(13.3, 11), M.metal_bronze, 'drum2_body', 0, 9.5, 0, 3);
add(drum2, cyl(12.4, 1), M.roof_grey, 'drum2_roof', 0, 15.5, 0, 3);

// ---------- phase 4: hull (two-tier: lower inset, upper overhangs) ----------
const KL = 0.97;
let y = 25;
add(model, hullLayer(KL, 1.2), M.soffit_dark, 'hull_soffit', 0, y, 0, 4); y += 1.2;
for (let f = 0; f < 3; f++) {
  add(model, hullLayer(KL, 2.65), M.panel_white, 'hull_band', 0, y, 0, 4.1 + f * 0.1); y += 2.65;
  add(model, hullLayer(KL * 0.985, 1.4), M.glass_band, 'hull_glass', 0, y, 0, 4.1 + f * 0.1); y += 1.4;
}
add(model, hullLayer(1, 0.9), M.soffit_dark, 'hull_belt_soffit', 0, y, 0, 4.45); y += 0.9;
add(model, hullLayer(1.003, 1.5), M.panel_white, 'hull_belt', 0, y, 0, 4.45); y += 1.5;
for (let f = 0; f < 4; f++) {
  add(model, hullLayer(1, 2.65), M.panel_white, 'hull_band_up', 0, y, 0, 4.5 + f * 0.1); y += 2.65;
  add(model, hullLayer(0.985, 1.4), M.glass_band, 'hull_glass_up', 0, y, 0, 4.5 + f * 0.1); y += 1.4;
}
add(model, hullLayer(1, 2.0), M.panel_white, 'hull_parapet', 0, y, 0, 5); y += 2.0;

// ---------- phase 5: roof ----------
add(model, hullLayer(0.965, 0.5), M.roof_grey, 'hull_roof', 0, y, 0, 5);
add(model, box(34, 1.1, 12), M.roof_green, 'roof_garden', -18, y + 0.8, 2, 5);
add(model, box(10, 1.6, 8), M.roof_grey, 'roof_plant', 8, y + 1, -6, 5);
add(model, cyl(0.14, 9, 8), M.concrete, 'roof_mast', -40, y + 4.5, 0, 5);
add(model, cyl(0.1, 6, 8), M.concrete, 'roof_mast_b', -52, y + 3, 6, 5);

// ---------- phase 6: trees + streetlamps ----------
const trees = [];
function tree(x, z, s) {
  const t = new THREE.Group(); t.name = 'tree_' + (uid++); t.userData.phase = 6;
  t.position.set(x, 0, z);
  const leafM = [M.leaf, M.leaf_dark, M.leaf_lt][(rnd() * 3) | 0];
  add(t, new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 3.0 * s, 7), M.trunk, 'trunk', 0, 1.5 * s, 0, 6);
  const c1 = add(t, new THREE.IcosahedronGeometry(1.7 * s, 1), leafM, 'crown', 0, 3.9 * s, 0, 6);
  c1.scale.set(1.15, 0.72, 1.0); c1.rotation.y = rnd() * 3;
  const c2 = add(t, new THREE.IcosahedronGeometry(1.15 * s, 1), leafM === M.leaf ? M.leaf_dark : M.leaf, 'crown2', 1.0 * s, 3.3 * s, 0.35 * s, 6);
  c2.scale.set(1.1, 0.66, 0.95); c2.rotation.y = rnd() * 3;
  const c3 = add(t, new THREE.IcosahedronGeometry(0.95 * s, 1), M.leaf_lt, 'crown3', -0.9 * s, 3.4 * s, -0.45 * s, 6);
  c3.scale.set(1.05, 0.7, 1.0); c3.rotation.y = rnd() * 3;
  model.add(t); trees.push(t);
  return t;
}
for (let i = 0; i < 30; i++) tree(-118 + rnd() * 200, 46 + rnd() * 58, 0.8 + rnd() * 1.0);
for (let i = 0; i < 9; i++) tree(-152 + rnd() * 30, -90 + rnd() * 150, 0.9 + rnd() * 0.8);
for (let i = 0; i < 7; i++) tree(120 + rnd() * 32, -60 + rnd() * 105, 0.8 + rnd() * 0.7);
for (let i = 0; i < 6; i++) {
  const lp = new THREE.Group(); lp.name = 'lamp_' + i; lp.userData.phase = 6;
  lp.position.set(-140 + i * 52, 0, 110); model.add(lp);
  add(lp, cyl(0.12, 7, 8), M.concrete, 'lamp_pole', 0, 3.5, 0, 6);
  add(lp, new THREE.SphereGeometry(0.45, 12, 8), M.lamp_glow, 'lamp_head', 0, 7, 0.6, 6);
}

// ---------- surroundings: hedges, shrubs, beds, street trees, context city ----------
mat('flower', { color: 0x9c4652, roughness: 0.9, flatShading: true });
mat('ctx_grey', { color: 0xc0c4c9, roughness: 0.6, metalness: 0.15 });
mat('ctx_glass', { color: 0x5d6d78, roughness: 0.18, metalness: 0.5, envMapIntensity: 1.0 });
function hedge(x, z, len, ry) {
  const h = add(model, box(len, 1.3, 2.2), M.leaf_dark, 'hedge', x, 0.75, z, 6, ry || 0);
  trees.push(h);
}
function shrubBed(x, z, n) {
  const g = new THREE.Group(); g.name = 'bed_' + (uid++); g.userData.phase = 6;
  g.position.set(x, 0, z); model.add(g); trees.push(g);
  add(g, box(n * 1.6, 0.5, 3), M.concrete, 'bed_curb', 0, 0.25, 0, 6);
  for (let i = 0; i < n; i++) {
    const s = 0.5 + rnd() * 0.5;
    add(g, new THREE.IcosahedronGeometry(0.8 * s, 1), rnd() < 0.35 ? M.flower : [M.leaf, M.leaf_lt][(rnd() * 2) | 0], 'shrub', -n * 0.8 + 0.8 + i * 1.6, 0.7 * s + 0.4, (rnd() - 0.5) * 1.2, 6).scale.y = 0.7;
  }
}
hedge(-70, 30, 60); hedge(10, 32, 34); hedge(-20, 89, 120); hedge(-124, 72, 3, Math.PI / 2);
hedge(-96, 106, 90); hedge(60, 106, 70);
shrubBed(-6, 34, 8); shrubBed(26, 34, 6); shrubBed(-58, 50, 7); shrubBed(34, 60, 6); shrubBed(88, 66, 7); shrubBed(-104, 88, 6);
for (let i = 0; i < 16; i++) tree(-136 + i * 18, 108 + (rnd() - 0.5) * 3, 0.75 + rnd() * 0.4);
for (let i = 0; i < 9; i++) tree(-150 + (rnd() - 0.5) * 4, -85 + i * 20, 0.8 + rnd() * 0.5);
for (let i = 0; i < 8; i++) tree(150 + (rnd() - 0.5) * 5, -75 + i * 19, 0.75 + rnd() * 0.5);
for (let i = 0; i < 22; i++) tree(-118 + rnd() * 205, 42 + rnd() * 62, 0.7 + rnd() * 1.1);
for (let i = 0; i < 10; i++) tree(-140 + rnd() * 60, -100 + rnd() * 40, 0.8 + rnd() * 0.7);
// context city blocks beyond the roads (always present, fade into haze)
function ctxBldg(x, z, w, h, d, m) { add(model, box(w, h, d), m, 'ctx_bldg', x, h / 2, z, 0); }
ctxBldg(-130, -170, 55, 22, 34, M.ctx_grey);
ctxBldg(-58, -178, 48, 34, 40, M.ctx_glass);
ctxBldg(14, -168, 42, 16, 30, M.ctx_grey);
ctxBldg(84, -180, 60, 42, 44, M.ctx_glass);
ctxBldg(152, -166, 40, 26, 32, M.ctx_grey);
ctxBldg(212, -60, 44, 30, 52, M.ctx_glass);
ctxBldg(214, 30, 38, 18, 40, M.ctx_grey);
ctxBldg(210, 118, 48, 24, 44, M.ctx_glass);
ctxBldg(-214, -30, 42, 26, 48, M.ctx_glass);
ctxBldg(-216, 70, 40, 15, 42, M.ctx_grey);
ctxBldg(-116, 172, 52, 20, 36, M.ctx_grey);
ctxBldg(-20, 180, 46, 30, 40, M.ctx_glass);
ctxBldg(88, 174, 56, 16, 34, M.ctx_grey);

stage.setObject(model);
camera.position.set(-135, 34, 248); // first waypoint of the scroll path below
controls.target.set(-5, 12, 0);
controls.update();

// ---------- sky dome ----------
function skyTex(top, mid, hor, clouds) {
  return canvasTex(512, 256, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(0.78, hor); g.addColorStop(1, hor);
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < clouds / 3; i++) {
      const cx = rnd() * 512, cy = 22 + rnd() * 80, r = 14 + rnd() * 22;
      for (let k = 0; k < 4; k++) {
        const ox = cx + (rnd() - 0.5) * r * 2.2, oy = cy + (rnd() - 0.5) * r * 0.5, rr = r * (0.5 + rnd() * 0.6);
        const cg = x.createRadialGradient(ox, oy, 1, ox, oy, rr);
        cg.addColorStop(0, 'rgba(255,255,255,0.5)'); cg.addColorStop(0.75, 'rgba(255,255,255,0.14)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = cg;
        x.beginPath(); x.ellipse(ox, oy, rr, rr * 0.32, 0, 0, Math.PI * 2); x.fill();
      }
    }
  });
}
const dome = new THREE.Mesh(new THREE.SphereGeometry(750, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false }));
dome.name = 'sky_dome';
scene.add(dome);
const earth = new THREE.Mesh(new THREE.CircleGeometry(760, 48), new THREE.MeshStandardMaterial({ color: 0x77806c, roughness: 1 }));
earth.rotation.x = -Math.PI / 2; earth.position.y = -0.55; earth.name = 'earth';
earth.receiveShadow = true;
scene.add(earth);
scene.fog = new THREE.Fog(0xdfe9f0, 400, 1400);

// ---------- lighting rig ----------
const hemi = scene.children.find((o) => o.isHemisphereLight);
const key = stage._key;
const fill = scene.children.find((o) => o.isDirectionalLight && o !== key);
const pmrem = new THREE.PMREMGenerator(renderer);
function envFor(cfg) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 16, 12), new THREE.MeshBasicMaterial({ color: cfg.skyMid, side: THREE.BackSide })));
  const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 8), new THREE.MeshBasicMaterial({ color: cfg.sunColor }));
  sun.material.color.multiplyScalar(6);
  sun.position.set(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]).normalize();
  sun.position.multiplyScalar(45);
  s.add(sun);
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshBasicMaterial({ color: 0x55604e }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.y = -12; s.add(gnd);
  return pmrem.fromScene(s, 0.05).texture;
}
const TOD = {
  Noon: { skyTop: '#3e81bd', skyMid: '#8db9dd', skyHor: '#dce9f2', clouds: 34, sunColor: 0xfff3e0, sunInt: 2.0, sunPos: [120, 190, 90], hemiInt: 0.5, fillInt: 0.3, fog: 0xd6e3ec, lights: 0, screen: 0 },
  Morning: { skyTop: '#7aa8cd', skyMid: '#d8d9c9', skyHor: '#f6e3c4', clouds: 18, sunColor: 0xffd9a0, sunInt: 2.2, sunPos: [220, 70, 140], hemiInt: 0.6, fillInt: 0.35, fog: 0xeee5d4, lights: 0.4, screen: 0.5 },
  Dusk: { skyTop: '#101f42', skyMid: '#28407a', skyHor: '#c8763c', clouds: 8, sunColor: 0xff8c4a, sunInt: 0.7, sunPos: [-240, 35, 60], hemiInt: 0.22, fillInt: 0.12, fog: 0x25355c, lights: 1.6, screen: 1.4 },
};
const cache = { env: {}, sky: {} };

const state = { timeOfDay: 'Noon', exposure: 1.0, reflections: 1.0, haze: 0.2, greenery: 1.0, lights: 'Auto' };
function applyState(s) {
  Object.assign(state, s);
  const cfg = TOD[state.timeOfDay] || TOD.Noon;
  renderer.toneMappingExposure = state.exposure;
  if (!cache.sky[state.timeOfDay]) cache.sky[state.timeOfDay] = skyTex(cfg.skyTop, cfg.skyMid, cfg.skyHor, cfg.clouds);
  dome.material.map = cache.sky[state.timeOfDay];
  dome.material.needsUpdate = true;
  if (!cache.env[state.timeOfDay]) cache.env[state.timeOfDay] = envFor(cfg);
  scene.environment = cache.env[state.timeOfDay];
  key.color.set(cfg.sunColor); key.intensity = cfg.sunInt;
  key.position.set(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]);
  hemi.intensity = cfg.hemiInt;
  if (fill) fill.intensity = cfg.fillInt;
  scene.fog.color.set(cfg.fog);
  scene.fog.near = 420 - state.haze * 300;
  scene.fog.far = 2200 - state.haze * 1200;
  const li = state.lights === 'Auto' ? cfg.lights : state.lights === 'On' ? 1.6 : 0;
  M.glass_band.emissiveIntensity = li;
  M.glass_green.emissiveIntensity = li;
  M.lamp_glow.emissiveIntensity = li * 2;
  M.screen_dark.emissiveIntensity = state.lights === 'Off' ? 0 : (state.lights === 'On' ? 1.4 : cfg.screen);
  Object.values(M).forEach((m) => { if ('envMapIntensity' in m) m.envMapIntensity = (m.userData.envBase ?? (m.userData.envBase = m.envMapIntensity)) * state.reflections; });
  trees.forEach((t, i) => { t.userData.g = i / trees.length < state.greenery; });
  setProgress(progress);
}

// ================= camera + scroll choreography =================
const track = document.getElementById('build');
const railFill = document.getElementById('railFill');
const railLabel = document.getElementById('railLabel');
const titleCard = document.getElementById('titleCard');
const hint = document.getElementById('scrollHint');

const CENTER = new THREE.Vector3(-5, 22, 5);
let orbiting = false, orbitT = 0, lastTime = performance.now();
const btnOrbit = document.getElementById('btnOrbit');
function tickOrbit(now) {
  if (!orbiting) return;
  const dt = Math.min((now - lastTime) / 1000, 0.05); lastTime = now;
  orbitT += dt;
  const a = orbitT * (Math.PI * 2 / 36) + Math.PI * 0.25;
  const r = 195 + 35 * Math.sin(orbitT * 0.35);
  const h = 55 + 40 * Math.sin(orbitT * 0.22 + 1.2);
  camera.position.set(CENTER.x + r * Math.cos(a), Math.max(14, h), CENTER.z + r * Math.sin(a));
  controls.target.copy(CENTER);
  requestAnimationFrame(tickOrbit);
}
function setOrbit(on) {
  orbiting = on;
  btnOrbit.classList.toggle('active', on);
  btnOrbit.textContent = on ? 'Stop drone orbit' : 'Drone orbit';
  if (on) { lastTime = performance.now(); requestAnimationFrame(tickOrbit); }
}
btnOrbit.addEventListener('click', () => setOrbit(!orbiting));
controls.addEventListener('start', () => { if (orbiting) setOrbit(false); });

const parts = [];
model.children.forEach((c) => { if ((c.userData.phase || 0) > 0) parts.push(c); });
parts.sort((a, b) => (a.userData.phase - b.userData.phase) || (a.position.y - b.position.y));
parts.forEach((p) => { p.userData.fy = p.position.y; });

/* Each phase owns a slice of the scroll, and its own parts spread across that
   slice. Handing every part an equal slice instead would give the landscape
   three quarters of the timeline — there are ~130 trees, hedges and beds
   against ~45 building parts — and the building itself would top out in the
   first screen. The hull is the show, so the hull gets the longest slice. */
const CHAPTERS = [
  { until: 2, share: 0.13, label: 'Podium and terraces' },
  { until: 3, share: 0.07, label: 'Cores and columns' },
  { until: 4, share: 0.08, label: 'Theatre drums' },
  { until: 4.5, share: 0.18, label: 'Hull — lower tiers' },
  { until: 5, share: 0.20, label: 'Hull — upper tiers' },
  { until: 6, share: 0.09, label: 'Roof gardens and masts' },
  { until: Infinity, share: 0.25, label: 'Trees, hedges and lamps' },
];
{
  let at = 0;
  for (const ch of CHAPTERS) {
    // chapters ascend, so anything still unassigned and under the cut is ours
    const members = parts.filter((p) => p.userData.t0 === undefined && p.userData.phase < ch.until);
    members.forEach((p, j) => { p.userData.t0 = at + (j / Math.max(1, members.length)) * ch.share; });
    ch.from = at;
    at += ch.share;
  }
}
const RISE = 0.12; // share of the scroll one part takes to rise into place
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
let progress = 1;
function setProgress(p) {
  progress = Math.max(0, Math.min(1, p));
  const span = 1 - RISE;
  parts.forEach((part) => {
    const lt = Math.max(0, Math.min(1, (progress - part.userData.t0 * span) / RISE));
    const grown = lt > 0 && part.userData.g !== false;
    part.visible = grown;
    part.position.y = part.userData.fy - 7 * (1 - easeOut(lt));
  });
  if (railFill) railFill.style.width = (progress * 100).toFixed(1) + '%';
  if (railLabel) {
    const c = caption(progress);
    if (c !== railLabel.textContent) railLabel.textContent = c;
  }
}
/* Name the chapter the leading edge of the assembly is in. */
function caption(p) {
  if (p <= 0.002) return 'Ground, roads and lawns';
  if (p >= 0.998) return 'Campus complete';
  const q = p / (1 - RISE);
  let label = CHAPTERS[0].label;
  for (const ch of CHAPTERS) if (q >= ch.from) label = ch.label;
  return label;
}
window.campusAPI = { apply: applyState, setProgress };

// scroll-driven assembly + camera path
/* Ends of the path are lifted clear of the context blocks on the southern
   approach: at 24m the first and last frames looked through a neighbour's
   wall instead of at the site. */
const camCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-135, 34, 248),
  new THREE.Vector3(-205, 42, 130),
  new THREE.Vector3(-185, 78, -70),
  new THREE.Vector3(35, 122, -185),
  new THREE.Vector3(215, 82, -40),
  new THREE.Vector3(180, 42, 150),
  new THREE.Vector3(-45, 62, 240),
]);
// The page scroll drives the camera, so the wheel must stay with the page.
controls.enableZoom = false;
// Touch: one finger scrolls the page (that is what builds the campus), two
// fingers orbit. OrbitControls sets touch-action:none on the canvas, which
// would otherwise swallow every vertical swipe over a full-screen stage.
renderer.domElement.style.touchAction = 'pan-y';
controls.touches.ONE = -1; // no single-finger gesture — falls through to STATE.NONE
controls.addEventListener('start', () => { if (orbiting) setOrbit(false); });

/* #build is 600svh tall with a sticky stage inside it: its own scroll
   progress is the build timeline, so the notes below the section can scroll
   normally over a finished campus. */
function scrollProgress() {
  const r = track.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
}
const btnBuild = document.getElementById('btnBuild');
function sync() {
  const p = scrollProgress();
  setProgress(p);
  if (hint) hint.style.opacity = p > 0.02 ? '0' : '1';
  if (titleCard) titleCard.style.opacity = String(Math.max(0, 1 - p / 0.06));
  if (btnBuild) btnBuild.textContent = p > 0.9 ? 'Rewind the build' : 'Play the build';
  if (!orbiting) {
    camCurve.getPoint(p, camera.position);
    controls.target.set(-5, 12 + 10 * p, 0);
  }
}
let queued = false;
function requestSync() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; sync(); });
}
/* Reduced motion: no scroll-driven assembly and no six-screen scroll track —
   the section collapses to one viewport showing the finished campus. The
   buttons still work, because clicking one is a choice. */
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!REDUCE) {
  window.addEventListener('scroll', requestSync, { passive: true });
  window.addEventListener('resize', requestSync);
}

btnBuild.addEventListener('click', () => {
  const r = track.getBoundingClientRect();
  const top = r.top + window.scrollY;
  const span = Math.max(0, r.height - window.innerHeight);
  window.scrollTo({ top: scrollProgress() > 0.9 ? top : top + span, behavior: 'smooth' });
});
document.getElementById('btnReset').addEventListener('click', () => {
  setOrbit(false);
  sync();
});

/* Don't render a hidden canvas: the notes below the build section are a
   long read, and a 60fps WebGL loop behind them is pure battery burn. */
new IntersectionObserver((entries) => {
  const visible = entries.some((e) => e.isIntersecting);
  renderer.setAnimationLoop(visible ? stage._loop : null);
  if (!visible && orbiting) setOrbit(false);
}, { rootMargin: '120px' }).observe(track);

// Export buttons live in the page's own HUD (the stage runs hide-chrome).
document.querySelectorAll('[data-campus-export]').forEach((btn) => {
  btn.disabled = false;
  btn.addEventListener('click', () => stage.download(btn.dataset.campusExport));
});

/* Counted from the finished scene rather than typed into the copy, so the
   numbers in the notes below can never drift from the model. */
let meshCount = 0, triCount = 0, treeCount = 0;
const materialSet = new Set();
model.traverse((o) => {
  if (o.isGroup && /^tree_/.test(o.name)) treeCount++;
  if (!o.isMesh) return;
  meshCount++;
  (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && materialSet.add(m));
  const g = o.geometry;
  if (g && g.attributes.position) triCount += (g.index ? g.index.count : g.attributes.position.count) / 3;
});
const stats = {
  meshes: meshCount,
  materials: materialSet.size,
  triangles: Math.round(triCount),
  trees: treeCount,
};
document.querySelectorAll('[data-campus-stat]').forEach((el) => {
  const v = stats[el.dataset.campusStat];
  if (v == null) return;
  el.textContent = v >= 10000 ? Math.round(v / 1000) + 'k' : v.toLocaleString('en-US');
});

applyState({});
if (REDUCE) {
  document.body.classList.add('campus-static');
  setProgress(1);
  camCurve.getPoint(0.55, camera.position);
  controls.target.set(-5, 22, 0);
  controls.update();
  if (hint) hint.style.opacity = '0';
  if (titleCard) titleCard.style.opacity = '0';
} else {
  sync();
}
window.dispatchEvent(new Event('campus-ready'));
