import {
  useRef, useMemo, useState, useEffect, Suspense, lazy,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, SoftShadows, Html } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import type { SceneData, BoxSpec, MeshRole } from "@/lib/geometryEngine3d";
import { FLOOR_TO_FLOOR } from "@/lib/geometryEngine3d/constants";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Lazy-loaded furniture (splits into separate JS chunk) ────────────────────
const LazyFloorFurniture = lazy(() =>
  import("@/lib/furniture/RoomFurniture").then(m => ({ default: m.FloorFurniture }))
);
const LazyPlotLandscape = lazy(() =>
  import("@/lib/furniture/landscape").then(m => ({ default: m.PlotLandscape }))
);

// ─── Procedural texture helpers ───────────────────────────────────────────────

function makeCanvas(size: number): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  return c.getContext("2d")!;
}

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function concreteTexture(opts?: { tint?: string; dark?: boolean; size?: number }): THREE.CanvasTexture {
  const size = opts?.size ?? 512;
  const ctx = makeCanvas(size);
  const rand = lcg(opts?.dark ? 2 : 1);
  const baseL = opts?.dark ? 158 : 218;
  ctx.fillStyle = opts?.tint ?? (opts?.dark ? `rgb(${baseL},${baseL-4},${baseL-8})` : `rgb(${baseL},${baseL-2},${baseL-6})`);
  ctx.fillRect(0, 0, size, size);
  const speckle = opts?.size ? Math.round(3200 * (size / 512) ** 2) : 3200;
  for (let i = 0; i < speckle; i++) {
    const x = rand() * size, y = rand() * size;
    const r = 0.8 + rand() * 2.2;
    const brightness = 180 + Math.floor(rand() * 60) - (opts?.dark ? 20 : 0);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${brightness},${brightness - 4},${brightness - 8},${0.18 + rand() * 0.22})`;
    ctx.fill();
  }
  for (let i = 0; i < 14; i++) {
    const gx = rand() * size, gy = rand() * size, gr = 40 + rand() * 80;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    const lv = opts?.dark ? 0 : Math.floor(rand() * 28) - 14;
    g.addColorStop(0, `rgba(${baseL + lv},${baseL + lv},${baseL + lv - 4},0.08)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function noiseNormalMap(seed: number, strength = 0.45, size = 256): THREE.CanvasTexture {
  const ctx = makeCanvas(size);
  const rand = lcg(seed);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0, amp = 1;
      for (let o = 0; o < 4; o++) { v += (rand() - 0.5) * amp; amp *= 0.5; }
      h[y * size + x] = v;
    }
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const r = (x + 1) % size, l = (x - 1 + size) % size;
      const u = (y - 1 + size) % size, d = (y + 1) % size;
      const dx = (h[y * size + r] - h[y * size + l]) * strength;
      const dy = (h[u * size + x] - h[d * size + x]) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const base = idx * 4;
      img.data[base]     = Math.round((-dx / len * 0.5 + 0.5) * 255);
      img.data[base + 1] = Math.round((-dy / len * 0.5 + 0.5) * 255);
      img.data[base + 2] = Math.round((1  / len * 0.5 + 0.5) * 255);
      img.data[base + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function roughnessMap(seed: number, base: number, variation = 0.12, size = 256): THREE.CanvasTexture {
  const ctx = makeCanvas(size);
  const rand = lcg(seed + 99);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(Math.max(0, Math.min(1, base + (rand() - 0.5) * variation * 2)) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function woodTexture(size = 512): THREE.CanvasTexture {
  const ctx = makeCanvas(size);
  const rand = lcg(42);
  const base = ctx.createLinearGradient(0, 0, size, 0);
  base.addColorStop(0, "#7B4A22"); base.addColorStop(0.3, "#8C5528");
  base.addColorStop(0.6, "#7A4820"); base.addColorStop(1, "#8B5230");
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    const y0 = rand() * size, thick = 0.4 + rand() * 1.6, dark = rand() > 0.5;
    ctx.strokeStyle = dark
      ? `rgba(50,28,10,${0.06 + rand() * 0.10})`
      : `rgba(180,110,60,${0.04 + rand() * 0.08})`;
    ctx.lineWidth = thick; ctx.beginPath();
    let px = 0; ctx.moveTo(0, y0);
    while (px < size) { const step = 12 + rand() * 24; ctx.lineTo(px + step, y0 + (rand() - 0.5) * 3); px += step; }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

function metalTexture(size = 256): THREE.CanvasTexture {
  const ctx = makeCanvas(size);
  const rand = lcg(13);
  ctx.fillStyle = "#C0C4C8"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 180; i++) {
    const y = rand() * size, bright = 165 + Math.floor(rand() * 80);
    ctx.strokeStyle = `rgba(${bright},${bright + 2},${bright + 4},${0.12 + rand() * 0.18})`;
    ctx.lineWidth = 0.4 + rand() * 0.6; ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(size, y + (rand() - 0.5) * 2); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

function glassTexture(): THREE.CanvasTexture {
  const size = 128;
  const ctx = makeCanvas(size);
  const rand = lcg(7);
  ctx.fillStyle = "rgba(185, 215, 235, 0.15)"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 12; i++) {
    const x = rand() * size, y = rand() * size, r = 20 + rand() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.06)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function grassTexture(size = 512): THREE.CanvasTexture {
  const ctx = makeCanvas(size);
  const rand = lcg(99);
  ctx.fillStyle = "#3D5A24"; ctx.fillRect(0, 0, size, size);
  const patches = Math.round(800 * (size / 512) ** 2);
  for (let i = 0; i < patches; i++) {
    const x = rand() * size, y = rand() * size, r = 2 + rand() * 8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    g.addColorStop(0, light ? "rgba(90,130,50,0.18)" : "rgba(20,38,10,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function paversTexture(size = 512): THREE.CanvasTexture {
  const ctx = makeCanvas(size);
  const rand = lcg(55);
  ctx.fillStyle = "#C4BFB5"; ctx.fillRect(0, 0, size, size);
  const cols = 4, rows = 6, gapX = 3, gapY = 3;
  const pw = (size - gapX * (cols + 1)) / cols;
  const ph = (size - gapY * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gapX + c * (pw + gapX), y = gapY + r * (ph + gapY);
      const v = 196 + Math.floor(rand() * 20) - 10;
      ctx.fillStyle = `rgb(${v},${v - 3},${v - 6})`; ctx.fillRect(x, y, pw, ph);
      for (let i = 0; i < 30; i++) {
        const sx = x + rand() * pw, sy = y + rand() * ph, sr = 0.5 + rand() * 1.5;
        const sv = 140 + Math.floor(rand() * 80);
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sv},${sv},${sv - 4},0.12)`; ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  return tex;
}

// ─── Texture types ────────────────────────────────────────────────────────────
type Textures = {
  concrete: THREE.CanvasTexture;
  concreteDark: THREE.CanvasTexture;
  concreteNorm: THREE.CanvasTexture;
  concreteRough: THREE.CanvasTexture;
  woodTex: THREE.CanvasTexture;
  woodNorm: THREE.CanvasTexture;
  metalTex: THREE.CanvasTexture;
  metalRough: THREE.CanvasTexture;
  glassTex: THREE.CanvasTexture;
  noiseNorm: THREE.CanvasTexture;
  pavers: THREE.CanvasTexture;
  grass: THREE.CanvasTexture;
};

// ─── Module-level texture singleton ──────────────────────────────────────────
// Created once per app lifetime, reused across ThreeViewer remounts.
let _texCache: Textures | null = null;

function buildTextures(mobile = false): Textures {
  const ns = mobile ? 128 : 256;
  const ts = mobile ? 256 : 512;
  return {
    concrete:      concreteTexture({ size: ts }),
    concreteDark:  concreteTexture({ dark: true, size: ts }),
    concreteNorm:  noiseNormalMap(1, 0.40, ns),
    concreteRough: roughnessMap(1, 0.91, 0.08, ns),
    woodTex:       woodTexture(ts),
    woodNorm:      noiseNormalMap(77, 0.25, ns),
    metalTex:      metalTexture(ns),
    metalRough:    roughnessMap(13, 0.22, 0.06, ns),
    glassTex:      glassTexture(),
    noiseNorm:     noiseNormalMap(44, 0.20, ns),
    pavers:        paversTexture(ts),
    grass:         grassTexture(ts),
  };
}

function getTextures(mobile = false): Textures {
  if (!_texCache) _texCache = buildTextures(mobile);
  return _texCache;
}

// ─── Module-level shared unit box geometry ────────────────────────────────────
// All InstancedMesh groups share this single geometry; scale is baked into matrix.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

// ─── Material spec per role ───────────────────────────────────────────────────
type MatSpec = {
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  transmission?: number;
  ior?: number;
  reflectivity?: number;
  envMapIntensity?: number;
  textureKey?: "concrete" | "concreteDark" | "wood" | "metal" | "glass" | "pavers" | "grass";
  normalKey?:   "concreteNorm" | "woodNorm" | "noiseNorm";
  roughKey?:    "concreteRough" | "metalRough";
};

const ROLE_MAT: Record<MeshRole, MatSpec> = {
  "exterior-wall":    { color: "#E8E4DC", roughness: 0.92, metalness: 0, textureKey: "concrete", normalKey: "concreteNorm", roughKey: "concreteRough", envMapIntensity: 0.05 },
  "interior-wall":    { color: "#F2EEE8", roughness: 0.88, metalness: 0, textureKey: "concrete", normalKey: "concreteNorm", envMapIntensity: 0.04 },
  "floor-slab":       { color: "#D4D0C8", roughness: 0.85, metalness: 0, textureKey: "concrete", normalKey: "concreteNorm", roughKey: "concreteRough", envMapIntensity: 0.08 },
  "roof-slab":        { color: "#C8C4BC", roughness: 0.94, metalness: 0, textureKey: "concreteDark", normalKey: "concreteNorm", envMapIntensity: 0.03 },
  "column":           { color: "#DEDAD2", roughness: 0.90, metalness: 0, textureKey: "concrete", normalKey: "concreteNorm", envMapIntensity: 0.05 },
  "parapet":          { color: "#DCDAD2", roughness: 0.91, metalness: 0, textureKey: "concrete", normalKey: "concreteNorm", envMapIntensity: 0.04 },
  "balcony-slab":     { color: "#C8C4BC", roughness: 0.88, metalness: 0, textureKey: "concreteDark", normalKey: "concreteNorm", envMapIntensity: 0.06 },
  "balcony-railing":  { color: "#B8BCBE", roughness: 0.22, metalness: 0.88, textureKey: "metal", roughKey: "metalRough", envMapIntensity: 1.2 },
  "stair-tread":      { color: "#C8C4BC", roughness: 0.87, metalness: 0, textureKey: "concrete", normalKey: "noiseNorm", envMapIntensity: 0.04 },
  "door-frame":       { color: "#6E3E18", roughness: 0.72, metalness: 0, textureKey: "wood", normalKey: "woodNorm", envMapIntensity: 0.10 },
  "door-panel":       { color: "#7A4820", roughness: 0.62, metalness: 0, textureKey: "wood", normalKey: "woodNorm", envMapIntensity: 0.14 },
  "door-handle":      { color: "#C0B8B0", roughness: 0.18, metalness: 0.85, textureKey: "metal", envMapIntensity: 1.4 },
  "window-frame":     { color: "#C8C8C4", roughness: 0.24, metalness: 0.58, textureKey: "metal", roughKey: "metalRough", envMapIntensity: 0.90 },
  "window-glass":     { color: "#B8D4E8", roughness: 0.04, metalness: 0.08, opacity: 0.22, transmission: 0.88, ior: 1.52, reflectivity: 0.85, textureKey: "glass", envMapIntensity: 1.6 },
  "window-sill":      { color: "#D8D2C8", roughness: 0.38, metalness: 0.06, textureKey: "concrete", normalKey: "noiseNorm", envMapIntensity: 0.18 },
};

const ROLE_SWATCH: Record<MeshRole, string> = Object.fromEntries(
  Object.entries(ROLE_MAT).map(([k, v]) => [k, v.color])
) as Record<MeshRole, string>;

// ─── Material factory ─────────────────────────────────────────────────────────
// Creates a fresh material per InstancedMeshGroup so opacity can be animated
// independently per (role, floor) pair without affecting other groups.
function makeMaterial(role: MeshRole, textures: Textures): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  const spec = ROLE_MAT[role];
  const isGlass = (spec.transmission ?? 0) > 0;

  const map = (() => {
    switch (spec.textureKey) {
      case "concrete":     return textures.concrete;
      case "concreteDark": return textures.concreteDark;
      case "wood":         return textures.woodTex;
      case "metal":        return textures.metalTex;
      case "glass":        return textures.glassTex;
      case "pavers":       return textures.pavers;
      case "grass":        return textures.grass;
      default:             return null;
    }
  })();

  const normalMap = (() => {
    switch (spec.normalKey) {
      case "concreteNorm": return textures.concreteNorm;
      case "woodNorm":     return textures.woodNorm;
      case "noiseNorm":    return textures.noiseNorm;
      default:             return null;
    }
  })();

  const roughnessMap = (() => {
    switch (spec.roughKey) {
      case "concreteRough": return textures.concreteRough;
      case "metalRough":    return textures.metalRough;
      default:              return null;
    }
  })();

  if (isGlass) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: spec.color,
      roughness: spec.roughness,
      metalness: spec.metalness,
      // @ts-ignore
      transmission: spec.transmission,
      ior: spec.ior ?? 1.5,
      reflectivity: spec.reflectivity ?? 0.5,
      opacity: spec.opacity ?? 1,
      transparent: true,
      depthWrite: false,
      envMapIntensity: spec.envMapIntensity ?? 1.0,
      map: map ?? undefined,
    });
    return mat;
  }

  const baseOpacity = spec.opacity ?? 1;
  const mat = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
    opacity: baseOpacity,
    transparent: baseOpacity < 1,
    depthWrite: baseOpacity >= 1,
    envMapIntensity: spec.envMapIntensity ?? 0.2,
    map: map ?? undefined,
    normalMap: normalMap ?? undefined,
    normalScale: normalMap ? new THREE.Vector2(0.6, 0.6) : undefined,
    roughnessMap: roughnessMap ?? undefined,
  });
  return mat;
}

// ─── InstancedMeshGroup ───────────────────────────────────────────────────────
// Replaces hundreds of individual <mesh> elements with a single InstancedMesh
// per (role, floor) — dramatically reduces draw calls.
//
// Instance matrix encodes: translate(cx,cy,cz) · rotateY(ry) · scale(w,h,d)
// so a shared unit BoxGeometry(1,1,1) covers all box sizes.

const _mat4  = new THREE.Matrix4();
const _pos   = new THREE.Vector3();
const _quat  = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

function InstancedMeshGroup({
  specs, role, textures, wireframe, targetOpacity,
}: {
  specs: BoxSpec[];
  role: MeshRole;
  textures: Textures;
  wireframe: boolean;
  targetOpacity: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const mat = useMemo(() => makeMaterial(role, textures), [role, textures]);

  useEffect(() => () => { mat.dispose(); }, [mat]);

  const isGlass   = (ROLE_MAT[role].transmission ?? 0) > 0;
  const baseOpacity = ROLE_MAT[role].opacity ?? 1;

  // Bake instance matrices once per specs change
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    specs.forEach((spec, i) => {
      _pos.set(spec.cx, spec.cy, spec.cz);
      _quat.setFromAxisAngle(_yAxis, spec.ry);
      _scale.set(spec.w, spec.h, spec.d);
      _mat4.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _mat4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [specs]);

  // Keep refs for useFrame to read the latest prop values without re-subscribing
  const targetOpRef  = useRef(targetOpacity);
  const wireframeRef = useRef(wireframe);
  targetOpRef.current  = targetOpacity;
  wireframeRef.current = wireframe;

  const currOpRef = useRef(targetOpacity * baseOpacity);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const want = targetOpRef.current * baseOpacity;
    currOpRef.current = THREE.MathUtils.lerp(
      currOpRef.current, want, Math.min(1, dt * 5.5)
    );
    const op = currOpRef.current;

    const m = mesh.material as THREE.MeshStandardMaterial;
    m.opacity       = op;
    m.transparent   = op < 0.998 || isGlass;
    m.depthWrite    = op > 0.95 && !isGlass;
    // Wireframe only on opaque standard (non-glass) meshes
    if (!isGlass) {
      (m as THREE.MeshStandardMaterial).wireframe = wireframeRef.current && op > 0.95;
    }
    mesh.castShadow = !isGlass && op > 0.50;
    mesh.visible    = op > 0.004;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[UNIT_BOX, mat, specs.length]}
      castShadow={!isGlass}
      receiveShadow
      frustumCulled
    />
  );
}

// ─── View presets ─────────────────────────────────────────────────────────────
export type ViewPreset =
  | "orbit" | "iso" | "top"
  | "front" | "rear" | "left" | "right"
  | "walkthrough" | "dollhouse" | "exploded" | "isolated";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function presetCamera(
  preset: ViewPreset,
  scene: SceneData,
  isoFloor: number,
): { pos: THREE.Vector3; target: THREE.Vector3 } {
  const [cx, cy, cz] = scene.center;
  const d  = scene.diagonal;
  const bh = cy * 0.55;

  switch (preset) {
    case "orbit":
    case "iso":
      return {
        pos:    new THREE.Vector3(cx + d * 0.70, cy + d * 0.65, cz + d * 0.70),
        target: new THREE.Vector3(cx, cy * 0.35, cz),
      };
    case "top":
      return {
        pos:    new THREE.Vector3(cx, cy + d * 1.65, cz + 0.001),
        target: new THREE.Vector3(cx, 0, cz),
      };
    case "front":
      return { pos: new THREE.Vector3(cx, bh, cz + d * 1.55), target: new THREE.Vector3(cx, bh, cz) };
    case "rear":
      return { pos: new THREE.Vector3(cx, bh, cz - d * 1.55), target: new THREE.Vector3(cx, bh, cz) };
    case "left":
      return { pos: new THREE.Vector3(cx - d * 1.55, bh, cz), target: new THREE.Vector3(cx, bh, cz) };
    case "right":
      return { pos: new THREE.Vector3(cx + d * 1.55, bh, cz), target: new THREE.Vector3(cx, bh, cz) };
    case "walkthrough": {
      const ey = isoFloor * FLOOR_TO_FLOOR + 1.7;
      return {
        pos:    new THREE.Vector3(cx, ey, cz + 1.5),
        target: new THREE.Vector3(cx, ey, cz - 2.5),
      };
    }
    case "dollhouse":
      return {
        pos:    new THREE.Vector3(cx + d * 0.75, cy + d * 1.10, cz + d * 0.65),
        target: new THREE.Vector3(cx, cy * 0.28, cz),
      };
    case "exploded": {
      const stackH = scene.floors * EXPLODE_GAP;
      const midH   = stackH * 0.5;
      return {
        pos:    new THREE.Vector3(cx + d * 0.95, midH + d * 0.90, cz + d * 0.95),
        target: new THREE.Vector3(cx, midH, cz),
      };
    }
    case "isolated": {
      const midY = isoFloor * FLOOR_TO_FLOOR + FLOOR_TO_FLOOR * 0.5;
      return {
        pos:    new THREE.Vector3(cx + d * 0.65, midY + d * 0.25, cz + d * 0.55),
        target: new THREE.Vector3(cx, midY, cz),
      };
    }
    default:
      return {
        pos:    new THREE.Vector3(cx + d * 0.70, cy + d * 0.65, cz + d * 0.70),
        target: new THREE.Vector3(cx, cy * 0.35, cz),
      };
  }
}

// ─── Camera controller ────────────────────────────────────────────────────────
function CameraController({
  preset, scene, isoFloor,
}: { preset: ViewPreset; scene: SceneData; isoFloor: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animRef = useRef<{
    fromPos: THREE.Vector3; fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;  toTarget: THREE.Vector3;
    t: number;
  } | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (preset !== "walkthrough") { keysRef.current.clear(); return; }
    const dn = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))
        e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
      keysRef.current.clear();
    };
  }, [preset]);

  useEffect(() => {
    const { pos, target } = presetCamera(preset, scene, isoFloor);
    animRef.current = {
      fromPos:    camera.position.clone(),
      fromTarget: controlsRef.current?.target.clone() ?? new THREE.Vector3(...scene.center),
      toPos: pos, toTarget: target, t: 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, isoFloor]);

  useFrame((_, dt) => {
    const ctrl = controlsRef.current;
    const a = animRef.current;
    if (a) {
      a.t = Math.min(1, a.t + dt * 2.0);
      const e = easeInOutCubic(a.t);
      camera.position.lerpVectors(a.fromPos, a.toPos, e);
      ctrl?.target.lerpVectors(a.fromTarget, a.toTarget, e);
      ctrl?.update();
      if (a.t >= 1) animRef.current = null;
    }

    if (preset === "walkthrough" && !a && ctrl) {
      const keys = keysRef.current;
      if (keys.size === 0) return;
      const speed = dt * 3.5;
      const eyeY  = isoFloor * FLOOR_TO_FLOOR + 1.7;
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      const move = new THREE.Vector3();
      if (keys.has("KeyW") || keys.has("ArrowUp"))    move.addScaledVector(fwd,    speed);
      if (keys.has("KeyS") || keys.has("ArrowDown"))  move.addScaledVector(fwd,   -speed);
      if (keys.has("KeyA") || keys.has("ArrowLeft"))  move.addScaledVector(right, -speed);
      if (keys.has("KeyD") || keys.has("ArrowRight")) move.addScaledVector(right,  speed);
      camera.position.add(move); ctrl.target.add(move);
      camera.position.y = eyeY; ctrl.target.y = eyeY;
      ctrl.update();
    }
  });

  const isWalk      = preset === "walkthrough";
  const isElevation = ["front", "rear", "left", "right"].includes(preset);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={isWalk ? 0.12 : 0.07}
      rotateSpeed={isWalk ? 0.50 : 0.85}
      zoomSpeed={isElevation ? 0.75 : 1.10}
      panSpeed={isWalk ? 0 : 0.85}
      enablePan={!isWalk}
      enableZoom
      minDistance={isWalk ? 0.5 : 1.0}
      maxDistance={scene.diagonal * (isWalk ? 2 : 5)}
      minPolarAngle={isWalk ? Math.PI * 0.22 : 0}
      maxPolarAngle={isWalk ? Math.PI * 0.74 : Math.PI * 0.88}
    />
  );
}

// ─── Animated floor groups ────────────────────────────────────────────────────
const EXPLODE_GAP = FLOOR_TO_FLOOR * 2.2;

function roomLabel(type: string): string {
  const MAP: Record<string, string> = {
    living: "Living Room", dining: "Dining", kitchen: "Kitchen",
    bedroom: "Bedroom", master: "Master BR", bathroom: "Bathroom",
    toilet: "WC", office: "Study / Office", study: "Study",
    staircase: "Staircase", parking: "Parking", corridor: "Corridor",
    balcony: "Balcony", store: "Store", pooja: "Puja Room",
    terrace: "Terrace", utility: "Utility",
  };
  return MAP[type] ?? (type.charAt(0).toUpperCase() + type.slice(1));
}

function floorName(f: number, total: number): string {
  if (f === 0) return "Ground Floor";
  if (f === total) return "Roof / Terrace";
  const ord = ["First","Second","Third","Fourth","Fifth"];
  return `${ord[f - 1] ?? `${f}th`} Floor`;
}

function getTargetOpacity(role: string, floor: number, preset: ViewPreset, isoFloor: number): number {
  if (preset === "isolated") return floor === isoFloor ? 1 : 0.09;
  if (preset === "dollhouse") {
    if (role === "roof-slab" || role === "parapet") return 0;
    if (floor > 0) {
      if (role === "floor-slab") return 0.07;
      if (["exterior-wall","interior-wall","column","balcony-slab","balcony-railing"].includes(role)) return 0.18;
      return 0.26;
    }
  }
  return 1;
}

// ─── Per-floor instanced rendering ───────────────────────────────────────────
// Groups BoxSpecs by role within each floor, emitting one InstancedMesh per role.
// This reduces draw calls from O(meshCount) → O(roles × floors) ≈ 15–60.

function InstancedFloor({
  floorSpecs, floor, preset, isoFloor, wireframe, textures,
}: {
  floorSpecs: BoxSpec[];
  floor: number;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  textures: Textures;
}) {
  const byRole = useMemo<Map<MeshRole, BoxSpec[]>>(() => {
    const m = new Map<MeshRole, BoxSpec[]>();
    for (const spec of floorSpecs) {
      if (!m.has(spec.role)) m.set(spec.role, []);
      m.get(spec.role)!.push(spec);
    }
    return m;
  }, [floorSpecs]);

  return (
    <>
      {[...byRole.entries()].map(([role, specs]) => (
        <InstancedMeshGroup
          key={`${role}-${specs.length}`}
          specs={specs}
          role={role}
          textures={textures}
          wireframe={wireframe}
          targetOpacity={getTargetOpacity(role, floor, preset, isoFloor)}
        />
      ))}
    </>
  );
}

function FloorGroups({
  scene, preset, isoFloor, wireframe, showFurniture, textures,
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  showFurniture: boolean;
  textures: Textures;
}) {
  const byFloor = useMemo<Map<number, BoxSpec[]>>(() => {
    const m = new Map<number, BoxSpec[]>();
    for (const spec of scene.meshes) {
      if (!m.has(spec.floor)) m.set(spec.floor, []);
      m.get(spec.floor)!.push(spec);
    }
    return m;
  }, [scene.meshes]);

  const stairCentroids = useMemo<Array<{ cx: number; cz: number; floorA: number; floorB: number }>>(() => {
    const stairs = scene.meshes.filter(m => m.role === "stair-tread");
    if (stairs.length === 0 || scene.floors < 1) return [];
    const byF = new Map<number, BoxSpec[]>();
    for (const s of stairs) {
      if (!byF.has(s.floor)) byF.set(s.floor, []);
      byF.get(s.floor)!.push(s);
    }
    const result: Array<{ cx: number; cz: number; floorA: number; floorB: number }> = [];
    const floors = [...byF.keys()].sort((a, b) => a - b);
    for (let i = 0; i < floors.length - 1; i++) {
      const fa = floors[i], fb = floors[i + 1];
      const meshesA = byF.get(fa)!;
      const cx = meshesA.reduce((s, m) => s + m.cx, 0) / meshesA.length;
      const cz = meshesA.reduce((s, m) => s + m.cz, 0) / meshesA.length;
      result.push({ cx, cz, floorA: fa, floorB: fb });
    }
    return result;
  }, [scene.meshes, scene.floors]);

  const groupRefs      = useRef<Record<number, THREE.Group | null>>({});
  const connRefs       = useRef<(THREE.Mesh | null)[]>([]);
  const currentExplode = useRef(0);
  const presetRef      = useRef(preset);
  const isoFloorRef    = useRef(isoFloor);
  presetRef.current    = preset;
  isoFloorRef.current  = isoFloor;

  useFrame((_, dt) => {
    const wantExplode = presetRef.current === "exploded" ? EXPLODE_GAP : 0;
    const speed = currentExplode.current < wantExplode ? 4.5 : 5.5;
    currentExplode.current = THREE.MathUtils.lerp(
      currentExplode.current, wantExplode, Math.min(1, dt * speed),
    );
    if (Math.abs(currentExplode.current - wantExplode) < 0.002)
      currentExplode.current = wantExplode;
    const ce = currentExplode.current;

    for (const [f, grp] of Object.entries(groupRefs.current)) {
      if (grp) grp.position.y = Number(f) * ce;
    }

    const gap = Math.max(0, ce - FLOOR_TO_FLOOR);
    connRefs.current.forEach((mesh, idx) => {
      if (!mesh || stairCentroids[idx] === undefined) return;
      const { floorA } = stairCentroids[idx];
      const gapMidY = floorA * ce + FLOOR_TO_FLOOR + gap / 2;
      mesh.position.y = gapMidY;
      mesh.scale.y    = Math.max(0.001, gap);
      mesh.visible    = gap > 0.06;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.min(1, gap / 0.5);
    });
  });

  const isExploded = preset === "exploded";

  return (
    <>
      {[...byFloor.entries()].map(([f, meshes]) => {
        const hideFurniture  = preset === "isolated" && f !== isoFloor;
        const floorRooms     = scene.rooms.filter(r => r.floor === f);

        return (
          <group key={f} ref={el => { groupRefs.current[f] = el; }}>
            {/* Instanced structural geometry — one draw call per role */}
            <InstancedFloor
              floorSpecs={meshes}
              floor={f}
              preset={preset}
              isoFloor={isoFloor}
              wireframe={wireframe}
              textures={textures}
            />

            {/* Furniture (lazy-loaded chunk) */}
            {showFurniture && !hideFurniture && (
              <Suspense fallback={null}>
                <LazyFloorFurniture floor={f} rooms={scene.rooms} />
              </Suspense>
            )}

            {/* Exploded room labels */}
            {isExploded && floorRooms.map(room => {
              if (room.type === "foyer" || room.type === "passage") return null;
              const rx = room.x + room.width  / 2;
              const rz = room.y + room.depth  / 2;
              return (
                <Html
                  key={room.id}
                  position={[rx, 0.52, rz]}
                  center
                  distanceFactor={18}
                  zIndexRange={[10, 20]}
                  style={{ pointerEvents: "none" }}
                >
                  <div style={{
                    background: "rgba(18,22,30,0.82)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 6, padding: "3px 8px",
                    color: "#D8E4F0", fontFamily: "system-ui, sans-serif",
                    fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                    letterSpacing: "0.02em", backdropFilter: "blur(4px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <span>{roomLabel(room.type)}</span>
                    <span style={{ color: "#7090A8", fontSize: 9, fontWeight: 400 }}>
                      {room.area.toFixed(0)} m²
                    </span>
                  </div>
                </Html>
              );
            })}

            {isExploded && (
              <Html
                position={[scene.plotWidth + 1.4, FLOOR_TO_FLOOR * 0.5, scene.plotDepth / 2]}
                center distanceFactor={18} zIndexRange={[10, 20]}
                style={{ pointerEvents: "none" }}
              >
                <div style={{
                  background: "rgba(220,130,40,0.92)",
                  border: "1px solid rgba(255,200,100,0.45)",
                  borderRadius: 5, padding: "2px 9px",
                  color: "#FFF8EC", fontFamily: "system-ui, sans-serif",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                  whiteSpace: "nowrap", textTransform: "uppercase",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                }}>
                  {floorName(f, scene.floors)}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Stair connector cylinders */}
      {stairCentroids.map(({ cx, cz }, idx) => (
        <mesh
          key={`stair-conn-${idx}`}
          ref={el => { connRefs.current[idx] = el; }}
          position={[cx, 0, cz]}
          visible={false}
        >
          <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
          <meshStandardMaterial
            color="#8090A0" roughness={0.7} metalness={0.1}
            opacity={0} transparent depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

// ─── Lighting ─────────────────────────────────────────────────────────────────
function Lighting({ scene, shadowMapSize }: { scene: SceneData; shadowMapSize: number }) {
  const d = scene.diagonal;
  const [cx, , cz] = scene.center;
  return (
    <>
      <ambientLight color="#F8F4EE" intensity={0.22} />
      <directionalLight
        color="#FFE8B0"
        position={[cx + d * 1.3, d * 2.0, cz + d * 0.5]}
        intensity={1.45}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-far={d * 12}
        shadow-camera-left={-d * 3.0}
        shadow-camera-right={d * 3.0}
        shadow-camera-top={d * 4.5}
        shadow-camera-bottom={-d * 2.5}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-radius={8}
      />
      <directionalLight color="#BDD4F0" position={[cx - d * 1.0, d * 0.6, cz - d * 0.7]} intensity={0.32} />
      <directionalLight color="#F0DEB8" position={[cx + d * 0.2, -d * 0.3, cz + d * 0.4]} intensity={0.10} />
      <hemisphereLight args={["#C8DCF4", "#D4C4A0", 0.48]} />
    </>
  );
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground({ scene, textures }: { scene: SceneData; textures: Textures }) {
  const { plotWidth: pw, plotDepth: pd } = scene;
  const extend = Math.max(pw, pd) * 1.8;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pw / 2, -0.004, pd / 2]} receiveShadow>
        <planeGeometry args={[pw + extend * 2, pd + extend * 2]} />
        <meshStandardMaterial color="#3A5520" map={textures.grass} roughness={0.97} metalness={0} envMapIntensity={0.04} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pw / 2, -0.001, pd / 2]} receiveShadow>
        <planeGeometry args={[pw, pd]} />
        <meshStandardMaterial
          color="#C2BDB2" map={textures.pavers}
          normalMap={textures.noiseNorm} normalScale={new THREE.Vector2(0.3, 0.3)}
          roughness={0.88} metalness={0} envMapIntensity={0.06}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pw / 2, -0.002, -1.5]} receiveShadow>
        <planeGeometry args={[pw + extend * 2, 3.0]} />
        <meshStandardMaterial color="#7A7670" map={textures.concreteDark} roughness={0.95} metalness={0} envMapIntensity={0.03} />
      </mesh>
    </group>
  );
}

// ─── Full scene ───────────────────────────────────────────────────────────────
function BuildingScene({
  scene, preset, isoFloor, wireframe, showFurniture, textures, isMobile,
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  showFurniture: boolean;
  textures: Textures;
  isMobile: boolean;
}) {
  const shadowMapSize = isMobile ? 1024 : 4096;
  const aoSamples     = isMobile ? 4 : 8;
  const aoRadius      = isMobile ? 0.8 : 1.2;

  return (
    <>
      <CameraController preset={preset} scene={scene} isoFloor={isoFloor} />
      <Lighting scene={scene} shadowMapSize={shadowMapSize} />
      <Environment preset="dawn" background={false} />

      <FloorGroups
        scene={scene}
        preset={preset}
        isoFloor={isoFloor}
        wireframe={wireframe}
        showFurniture={showFurniture}
        textures={textures}
      />

      {showFurniture && (
        <Suspense fallback={null}>
          <LazyPlotLandscape plotWidth={scene.plotWidth} plotDepth={scene.plotDepth} />
        </Suspense>
      )}

      <Ground scene={scene} textures={textures} />

      <ContactShadows
        position={[scene.center[0], 0.02, scene.center[2]]}
        scale={scene.diagonal * 2.4}
        opacity={0.48}
        blur={2.8}
        far={10}
        resolution={isMobile ? 512 : 1024}
        frames={1}
        color="#2A2010"
      />

      {!isMobile && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO
            aoRadius={aoRadius}
            intensity={1.6}
            aoSamples={aoSamples}
            denoiseSamples={4}
            denoiseRadius={10}
            distanceFalloff={1.2}
          />
        </EffectComposer>
      )}
    </>
  );
}

// ─── Toolbar helpers ──────────────────────────────────────────────────────────
function Btn({
  active, label, onClick, title, accent = false,
}: { active: boolean; label: React.ReactNode; onClick: () => void; title: string; accent?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded transition-all text-[9.5px] font-semibold shrink-0"
      style={{
        background: active ? (accent ? "rgba(100,180,80,0.20)" : "rgba(210,130,40,0.22)") : "rgba(255,255,255,0.05)",
        border: `1px solid ${active ? (accent ? "rgba(100,180,80,0.55)" : "rgba(210,130,40,0.55)") : "rgba(255,255,255,0.09)"}`,
        color: active ? (accent ? "#78D060" : "#E09858") : "#9AAAB8",
        minWidth: 44,
      }}
    >
      {label}
    </button>
  );
}

const S = (p: React.SVGProps<SVGSVGElement>) =>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p} />;

const IconOrbit  = () => <S><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 10 10M2 12a10 10 0 0 0 10 10M5 5l14 14" strokeDasharray="3 2"/></S>;
const IconIso    = () => <S><path d="M2 9l10-7 10 7v6l-10 7L2 15Z"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="9" x2="22" y2="9"/></S>;
const IconTop    = () => <S><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/></S>;
const IconFront  = () => <S><rect x="3" y="4" width="18" height="14" rx="2"/><line x1="8" y1="4" x2="8" y2="18"/><line x1="16" y1="4" x2="16" y2="18"/><line x1="3" y1="10" x2="21" y2="10"/></S>;
const IconRear   = () => <S><rect x="3" y="4" width="18" height="14" rx="2"/><line x1="12" y1="4" x2="12" y2="18"/><path d="M3 4l18 14M21 4L3 18" strokeDasharray="2 3"/></S>;
const IconLeft   = () => <S><path d="M9 18V6l-6 6z" fill="currentColor" stroke="none"/><rect x="10" y="4" width="11" height="16" rx="2"/><line x1="10" y1="12" x2="21" y2="12"/></S>;
const IconRight  = () => <S><path d="M15 6v12l6-6z" fill="currentColor" stroke="none"/><rect x="3" y="4" width="11" height="16" rx="2"/><line x1="3" y1="12" x2="14" y2="12"/></S>;
const IconWalk   = () => <S><circle cx="12" cy="5" r="2"/><path d="M10 9l-2 5h8l-2-5"/><path d="M8 14l-2 6M16 14l2 6"/><path d="M10 9l2 3 2-3"/></S>;
const IconDoll   = () => <S><path d="M3 9l9-7 9 7v11H3Z"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="9" y1="21" x2="9" y2="14"/><line x1="15" y1="21" x2="15" y2="14"/></S>;
const IconExplode= () => <S><rect x="3" y="2" width="18" height="5" rx="1"/><rect x="3" y="10" width="18" height="5" rx="1"/><rect x="3" y="18" width="18" height="4" rx="1"/></S>;
const IconWire   = () => <S><path d="M2 9l10-7 10 7v6l-10 7L2 15Z"/><path d="M2 9l10 7 10-7" strokeDasharray="3 2"/><line x1="12" y1="16" x2="12" y2="22" strokeDasharray="3 2"/></S>;
const IconSofa   = () => <S><path d="M2 10v7h20v-7"/><path d="M2 14h20"/><path d="M2 10a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3"/><line x1="5" y1="17" x2="5" y2="20"/><line x1="19" y1="17" x2="19" y2="20"/></S>;

const LEGEND_ROLES: MeshRole[] = [
  "exterior-wall","interior-wall","floor-slab","roof-slab",
  "column","parapet","balcony-slab","balcony-railing",
  "stair-tread","door-frame","door-panel","door-handle",
  "window-frame","window-glass","window-sill",
];

const TBDiv   = ({ color }: { color: string }) => <div className="w-px h-7 shrink-0" style={{ background: color }} />;
const TBLabel = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span className="text-[8px] font-bold uppercase tracking-widest shrink-0 select-none" style={{ color }}>{children}</span>
);

// ─── Main exported component ──────────────────────────────────────────────────
interface ThreeViewerProps { scene: SceneData }

export default function ThreeViewer({ scene }: ThreeViewerProps) {
  const [preset, setPreset]           = useState<ViewPreset>("iso");
  const [isoFloor, setIsoFloor]       = useState(0);
  const [wireframe, setWireframe]     = useState(false);
  const [showFurniture, setFurniture] = useState(true);

  const isMobile = useIsMobile();

  // Singleton texture cache — created once per browser session
  const textures = useMemo(() => getTextures(isMobile), [isMobile]);

  const initPos = useMemo<[number, number, number]>(() => {
    const [cx, , cz] = scene.center;
    const d = scene.diagonal;
    return [cx + d * 0.70, d * 0.65, cz + d * 0.70];
  }, [scene]);

  const floorList  = useMemo(() => Array.from({ length: scene.floors + 1 }, (_, i) => i), [scene.floors]);
  const floorNameS = (f: number) => f === 0 ? "G" : f === scene.floors ? "Rf" : `F${f}`;

  const go     = (p: ViewPreset) => setPreset(p);
  const TB     = "#18181B";
  const TBB    = "#27272A";
  const isWalk = preset === "walkthrough";
  const walkFloor = isoFloor;

  // DPR: cap at 1.5× on mobile to reduce fill-rate pressure
  const dpr: [number, number] = isMobile ? [1, 1.5] : [1, 2];
  const softShadowSamples = isMobile ? 6 : 12;

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#F0EDE8" }}>

      {/* ══ Toolbar ══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex flex-col" style={{ background: TB, borderBottom: `1px solid ${TBB}` }}>

        {/* Row 1: Camera views */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto">
          <TBLabel color="#4A5A68">Views</TBLabel>
          <Btn active={preset==="orbit"}  title="Orbit" onClick={() => go("orbit")}  label={<><IconOrbit />Orbit</>} />
          <Btn active={preset==="iso"}    title="Iso"   onClick={() => go("iso")}    label={<><IconIso />Iso</>} />
          <Btn active={preset==="top"}    title="Top"   onClick={() => go("top")}    label={<><IconTop />Top</>} />
          <TBDiv color={TBB} />
          <Btn active={preset==="front"} title="Front" onClick={() => go("front")} label={<><IconFront />Front</>} />
          <Btn active={preset==="rear"}  title="Rear"  onClick={() => go("rear")}  label={<><IconRear />Rear</>} />
          <Btn active={preset==="left"}  title="Left"  onClick={() => go("left")}  label={<><IconLeft />Left</>} />
          <Btn active={preset==="right"} title="Right" onClick={() => go("right")} label={<><IconRight />Right</>} />
          <div className="ml-auto text-[9px] shrink-0" style={{ color: "#3A4A58" }}>
            {scene.meshes.length} src · {scene.rooms.length} rooms
          </div>
        </div>

        {/* Row 2: Modes + floor + toggles */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto" style={{ borderTop: `1px solid ${TBB}` }}>
          <TBLabel color="#4A5A68">Modes</TBLabel>
          <Btn active={preset==="walkthrough"} title="Walkthrough" onClick={() => go("walkthrough")} label={<><IconWalk />Walk</>} />
          <Btn active={preset==="dollhouse"}   title="Dollhouse"   onClick={() => go("dollhouse")}   label={<><IconDoll />Doll</>} />
          <Btn active={preset==="exploded"}    title="Exploded"    onClick={() => go("exploded")}    label={<><IconExplode />Explode</>} />
          <TBDiv color={TBB} />
          <TBLabel color="#4A5A68">Floor</TBLabel>
          {floorList.map(f => (
            <button
              key={f}
              title={`Isolate floor ${floorNameS(f)}`}
              onClick={() => { setIsoFloor(f); setPreset("isolated"); }}
              className="w-7 h-7 rounded text-[10px] font-bold transition-all shrink-0"
              style={{
                background: preset === "isolated" && isoFloor === f ? "#E09040" : preset === "isolated" ? "#27272A" : "rgba(255,255,255,0.05)",
                color: preset === "isolated" && isoFloor === f ? "#FFF" : "#7A8A98",
                border: `1px solid ${preset === "isolated" && isoFloor === f ? "#E09040" : TBB}`,
              }}
            >
              {floorNameS(f)}
            </button>
          ))}
          <TBDiv color={TBB} />
          <Btn active={showFurniture} title="Toggle furniture" accent onClick={() => setFurniture(v => !v)} label={<><IconSofa />Furniture</>} />
          <Btn active={wireframe}     title="Wireframe"              onClick={() => setWireframe(v => !v)}  label={<><IconWire />Wireframe</>} />
        </div>
      </div>

      {/* ── 3D Canvas ───────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full">
        <Canvas
          shadows={{ type: THREE.PCFSoftShadowMap }}
          dpr={dpr}
          gl={{
            antialias: !isMobile,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          camera={{ position: initPos, fov: 46, near: 0.1, far: 8000 }}
          style={{ background: "#D8E4EE" }}
          resize={{ debounce: 0, scroll: false }}
        >
          <color attach="background" args={["#D8E4EE"]} />
          <fog attach="fog" args={["#D8E4EE", scene.diagonal * 5, scene.diagonal * 12]} />
          <SoftShadows size={18} focus={0.6} samples={softShadowSamples} />
          <Suspense fallback={null}>
            <BuildingScene
              scene={scene}
              preset={preset}
              isoFloor={isoFloor}
              wireframe={wireframe}
              showFurniture={showFurniture}
              textures={textures}
              isMobile={isMobile}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Walkthrough HUD ─────────────────────────────────────────────────── */}
      {isWalk && (
        <div
          className="absolute bottom-14 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 pointer-events-none flex items-center gap-3"
          style={{ background: "rgba(16,20,28,0.80)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(8px)" }}
        >
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Walkthrough</div>
          <div className="w-px h-4 bg-white/15" />
          <div className="grid grid-cols-4 gap-0.5">
            {[["W","↑"],["A","←"],["S","↓"],["D","→"]].map(([k]) => (
              <div key={k} className="flex flex-col items-center gap-0.5">
                <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold" style={{ background: "rgba(255,255,255,0.12)", color: "#E0C080" }}>{k}</span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-white/40">Move · Drag to look</div>
          <div className="w-px h-4 bg-white/15" />
          <div className="text-[9px] text-white/40">Floor {floorNameS(walkFloor)}</div>
        </div>
      )}

      {!isWalk && (
        <div className="absolute bottom-3 right-3 text-[9px] leading-relaxed pointer-events-none" style={{ color: "rgba(60,50,40,0.38)" }}>
          Drag · Scroll · Right-drag to pan
        </div>
      )}

      {/* ── Material legend ──────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-3 left-3 rounded-xl p-2.5 backdrop-blur-sm"
        style={{ background: "rgba(255,253,250,0.92)", border: "1px solid rgba(180,170,155,0.30)", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
      >
        <div className="text-[8px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6A5A48" }}>Materials</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {LEGEND_ROLES.map(role => (
            <div key={role} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: ROLE_SWATCH[role], opacity: ROLE_MAT[role].opacity ?? 1, border: "0.5px solid rgba(0,0,0,0.08)" }}
              />
              <span className="text-[8px] capitalize" style={{ color: "#7A6A58" }}>{role.replace(/-/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
