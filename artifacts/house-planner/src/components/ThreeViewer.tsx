import {
  useRef, useMemo, useState, useEffect, Suspense, lazy, memo,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, SoftShadows, Html } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import type { SceneData, BoxSpec, MeshRole } from "@/lib/geometryEngine3d";
import { FLOOR_TO_FLOOR, PLINTH_H, PARAPET_H, PARAPET_CAP_T } from "@/lib/geometryEngine3d/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ArchStyle, StyleDef, StyleMatOverride } from "@/lib/houseStyle";
import { ARCH_STYLES } from "@/lib/houseStyle";

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
  ctx.fillStyle = "#4A6428"; ctx.fillRect(0, 0, size, size);
  const patches = Math.round(1200 * (size / 512) ** 2);
  for (let i = 0; i < patches; i++) {
    const x = rand() * size, y = rand() * size, r = 2 + rand() * 10;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const t = rand();
    if (t > 0.65) {
      g.addColorStop(0, "rgba(110,155,55,0.22)"); g.addColorStop(1, "rgba(0,0,0,0)");
    } else if (t > 0.35) {
      g.addColorStop(0, "rgba(30,55,12,0.18)"); g.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      g.addColorStop(0, "rgba(70,110,38,0.16)"); g.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

function stuccoTexture(size = 512): THREE.CanvasTexture {
  const ctx = makeCanvas(size);
  const rand = lcg(303);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const n = rand();
    const v = Math.round(226 + (n - 0.5) * 22);
    img.data[i * 4]     = v;
    img.data[i * 4 + 1] = v - 4;
    img.data[i * 4 + 2] = v - 9;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 60; i++) {
    const sy = rand() * size;
    const bright = Math.round(195 + rand() * 30);
    ctx.strokeStyle = `rgba(${bright},${bright - 3},${bright - 7},${0.04 + rand() * 0.07})`;
    ctx.lineWidth = 0.3 + rand() * 0.8;
    ctx.beginPath();
    ctx.moveTo(rand() * size, sy);
    ctx.lineTo(rand() * size + (rand() - 0.5) * 20, sy + (rand() - 0.5) * 8);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function tileSlabTexture(size = 512): THREE.CanvasTexture {
  const ctx = makeCanvas(size);
  const rand = lcg(175);
  ctx.fillStyle = "#C8C0B0"; ctx.fillRect(0, 0, size, size);
  const cols = 3, rows = 3, gap = 6;
  const tw = (size - gap * (cols + 1)) / cols;
  const th = (size - gap * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gap + c * (tw + gap), y = gap + r * (th + gap);
      const base = 200 + Math.floor(rand() * 18) - 9;
      ctx.fillStyle = `rgb(${base},${base - 2},${base - 6})`; ctx.fillRect(x, y, tw, th);
      for (let v = 0; v < 3; v++) {
        if (rand() > 0.5) {
          ctx.strokeStyle = `rgba(155,145,130,${0.03 + rand() * 0.05})`;
          ctx.lineWidth = 0.3 + rand() * 0.7;
          ctx.beginPath();
          ctx.moveTo(x + rand() * tw, y + rand() * th);
          ctx.lineTo(x + rand() * tw, y + rand() * th);
          ctx.stroke();
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
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
  stucco: THREE.CanvasTexture;
  tileSlab: THREE.CanvasTexture;
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
    concreteNorm:  noiseNormalMap(1, 0.35, ns),
    concreteRough: roughnessMap(1, 0.88, 0.07, ns),
    woodTex:       woodTexture(ts),
    woodNorm:      noiseNormalMap(77, 0.28, ns),
    metalTex:      metalTexture(ns),
    metalRough:    roughnessMap(13, 0.18, 0.05, ns),
    glassTex:      glassTexture(),
    noiseNorm:     noiseNormalMap(44, 0.18, ns),
    pavers:        paversTexture(ts),
    grass:         grassTexture(ts),
    stucco:        stuccoTexture(ts),
    tileSlab:      tileSlabTexture(ts),
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
  textureKey?: "concrete" | "concreteDark" | "wood" | "metal" | "glass" | "pavers" | "grass" | "stucco" | "tileSlab";
  normalKey?:   "concreteNorm" | "woodNorm" | "noiseNorm";
  roughKey?:    "concreteRough" | "metalRough";
};

const ROLE_MAT: Record<MeshRole, MatSpec> = {
  "exterior-wall":    { color: "#EAE4D8", roughness: 0.90, metalness: 0, textureKey: "stucco",       normalKey: "concreteNorm", roughKey: "concreteRough", envMapIntensity: 0.08 },
  "interior-wall":    { color: "#F5F0E8", roughness: 0.86, metalness: 0, textureKey: "concrete",     normalKey: "concreteNorm", envMapIntensity: 0.05 },
  "floor-slab":       { color: "#D0C8BC", roughness: 0.80, metalness: 0, textureKey: "tileSlab",     normalKey: "noiseNorm",    roughKey: "concreteRough", envMapIntensity: 0.12 },
  "roof-slab":        { color: "#B4B0A8", roughness: 0.93, metalness: 0, textureKey: "concreteDark", normalKey: "concreteNorm", envMapIntensity: 0.04 },
  "column":           { color: "#E8E2D8", roughness: 0.88, metalness: 0, textureKey: "stucco",       normalKey: "concreteNorm", envMapIntensity: 0.07 },
  "parapet":          { color: "#E0DCD4", roughness: 0.89, metalness: 0, textureKey: "stucco",       normalKey: "concreteNorm", envMapIntensity: 0.06 },
  "balcony-slab":     { color: "#C4C0B8", roughness: 0.86, metalness: 0, textureKey: "concreteDark", normalKey: "concreteNorm", envMapIntensity: 0.07 },
  "balcony-railing":  { color: "#D0D4D8", roughness: 0.18, metalness: 0.82, textureKey: "metal",    roughKey: "metalRough",    envMapIntensity: 1.40 },
  "stair-tread":      { color: "#C8C4B8", roughness: 0.85, metalness: 0, textureKey: "tileSlab",     normalKey: "noiseNorm",    envMapIntensity: 0.06 },
  "door-frame":       { color: "#5C3010", roughness: 0.70, metalness: 0, textureKey: "wood",         normalKey: "woodNorm",     envMapIntensity: 0.14 },
  "door-panel":       { color: "#7A5028", roughness: 0.58, metalness: 0, textureKey: "wood",         normalKey: "woodNorm",     envMapIntensity: 0.20 },
  "door-handle":      { color: "#D4C090", roughness: 0.14, metalness: 0.92, textureKey: "metal",    envMapIntensity: 1.80 },
  "window-frame":     { color: "#E0E0DC", roughness: 0.20, metalness: 0.65, textureKey: "metal",    roughKey: "metalRough",    envMapIntensity: 1.10 },
  "window-glass":     { color: "#9EC8DC", roughness: 0.03, metalness: 0.10, opacity: 0.18, transmission: 0.90, ior: 1.52, reflectivity: 0.90, textureKey: "glass", envMapIntensity: 2.0 },
  "window-sill":      { color: "#E0D8CC", roughness: 0.32, metalness: 0.04, textureKey: "stucco",   normalKey: "noiseNorm",    envMapIntensity: 0.20 },
};

const ROLE_SWATCH: Record<MeshRole, string> = Object.fromEntries(
  Object.entries(ROLE_MAT).map(([k, v]) => [k, v.color])
) as Record<MeshRole, string>;

// ─── Material factory ─────────────────────────────────────────────────────────
// Creates a fresh material per InstancedMeshGroup so opacity can be animated
// independently per (role, floor) pair without affecting other groups.
// An optional styleOverride merges on top of the role defaults.
function makeMaterial(role: MeshRole, textures: Textures, styleOverride?: StyleMatOverride): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  const base = ROLE_MAT[role];
  // Merge override fields on top of base defaults
  const spec = styleOverride ? { ...base, ...styleOverride } : base;
  const isGlass = (base.transmission ?? 0) > 0;

  const resolveTexKey = (key?: string) => {
    switch (key) {
      case "concrete":     return textures.concrete;
      case "concreteDark": return textures.concreteDark;
      case "wood":         return textures.woodTex;
      case "metal":        return textures.metalTex;
      case "glass":        return textures.glassTex;
      case "pavers":       return textures.pavers;
      case "grass":        return textures.grass;
      case "stucco":       return textures.stucco;
      case "tileSlab":     return textures.tileSlab;
      default:             return null;
    }
  };

  const map       = resolveTexKey(spec.textureKey);
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
      transmission: base.transmission,
      ior: base.ior ?? 1.5,
      reflectivity: base.reflectivity ?? 0.5,
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

const InstancedMeshGroup = memo(function InstancedMeshGroup({
  specs, role, textures, wireframe, targetOpacity, styleOverride,
}: {
  specs: BoxSpec[];
  role: MeshRole;
  textures: Textures;
  wireframe: boolean;
  targetOpacity: number;
  styleOverride?: StyleMatOverride;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { invalidate } = useThree();

  const mat = useMemo(() => makeMaterial(role, textures, styleOverride), [role, textures, styleOverride]);

  useEffect(() => () => { mat.dispose(); }, [mat]);

  const isGlass     = (ROLE_MAT[role].transmission ?? 0) > 0;
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
    invalidate();
  }, [specs, invalidate]);

  const targetOpRef  = useRef(targetOpacity);
  const wireframeRef = useRef(wireframe);
  targetOpRef.current  = targetOpacity;
  wireframeRef.current = wireframe;

  const currOpRef    = useRef(targetOpacity * baseOpacity);
  const needsAnimRef = useRef(false);

  // Kick off animation when opacity or wireframe changes
  useEffect(() => {
    needsAnimRef.current = true;
    invalidate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetOpacity, wireframe]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const want = targetOpRef.current * baseOpacity;
    const diff = Math.abs(currOpRef.current - want);

    // Skip when settled and no animation pending
    if (!needsAnimRef.current && diff < 0.002) return;

    currOpRef.current = THREE.MathUtils.lerp(
      currOpRef.current, want, Math.min(1, dt * 5.5)
    );
    if (diff < 0.002) {
      currOpRef.current = want;
      needsAnimRef.current = false;
    }
    const op = currOpRef.current;

    const m = mesh.material as THREE.MeshStandardMaterial;
    m.opacity     = op;
    m.transparent = op < 0.998 || isGlass;
    m.depthWrite  = op > 0.95 && !isGlass;
    if (!isGlass) {
      (m as THREE.MeshStandardMaterial).wireframe = wireframeRef.current && op > 0.95;
    }
    mesh.castShadow = !isGlass && op > 0.50;
    mesh.visible    = op > 0.004;

    if (needsAnimRef.current) invalidate();
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
});

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

// ── Pre-allocated scratch vectors for walkthrough (avoids per-frame GC) ───────
const _wFwd   = new THREE.Vector3();
const _wRight = new THREE.Vector3();
const _wUp    = new THREE.Vector3(0, 1, 0);
const _wMove  = new THREE.Vector3();

// ─── Camera controller ────────────────────────────────────────────────────────
function CameraController({
  preset, scene, isoFloor,
}: { preset: ViewPreset; scene: SceneData; isoFloor: number }) {
  const { camera, invalidate } = useThree();
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
      invalidate(); // Begin render loop while keys are held
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
      keysRef.current.clear();
    };
  }, [preset, invalidate]);

  useEffect(() => {
    const { pos, target } = presetCamera(preset, scene, isoFloor);
    animRef.current = {
      fromPos:    camera.position.clone(),
      fromTarget: controlsRef.current?.target.clone() ?? new THREE.Vector3(...scene.center),
      toPos: pos, toTarget: target, t: 0,
    };
    invalidate(); // Kick off camera animation
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
      if (a.t < 1) invalidate(); // Keep animating until done
      else animRef.current = null;
    }

    if (preset === "walkthrough" && !a && ctrl) {
      const keys = keysRef.current;
      if (keys.size === 0) return;
      const speed = dt * 3.5;
      const eyeY  = isoFloor * FLOOR_TO_FLOOR + 1.7;
      _wFwd.set(0, 0, 0);
      camera.getWorldDirection(_wFwd); _wFwd.y = 0; _wFwd.normalize();
      _wRight.crossVectors(_wFwd, _wUp).normalize();
      _wMove.set(0, 0, 0);
      if (keys.has("KeyW") || keys.has("ArrowUp"))    _wMove.addScaledVector(_wFwd,    speed);
      if (keys.has("KeyS") || keys.has("ArrowDown"))  _wMove.addScaledVector(_wFwd,   -speed);
      if (keys.has("KeyA") || keys.has("ArrowLeft"))  _wMove.addScaledVector(_wRight, -speed);
      if (keys.has("KeyD") || keys.has("ArrowRight")) _wMove.addScaledVector(_wRight,  speed);
      camera.position.add(_wMove); ctrl.target.add(_wMove);
      camera.position.y = eyeY; ctrl.target.y = eyeY;
      ctrl.update();
      invalidate(); // Keep rendering while keys are pressed
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
  floorSpecs, floor, preset, isoFloor, wireframe, textures, matOverrides,
}: {
  floorSpecs: BoxSpec[];
  floor: number;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  textures: Textures;
  matOverrides: Partial<Record<MeshRole, StyleMatOverride>>;
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
          styleOverride={matOverrides[role]}
        />
      ))}
    </>
  );
}

function FloorGroups({
  scene, preset, isoFloor, wireframe, showFurniture, textures, matOverrides, slopedRoofRef,
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  showFurniture: boolean;
  textures: Textures;
  matOverrides: Partial<Record<MeshRole, StyleMatOverride>>;
  slopedRoofRef?: React.RefObject<THREE.Group | null>;
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

  const { invalidate } = useThree();
  const explodeSettled = useRef(true);

  // Kick off explode animation when preset changes
  useEffect(() => {
    explodeSettled.current = false;
    invalidate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  useFrame((_, dt) => {
    if (explodeSettled.current) return;

    const wantExplode = presetRef.current === "exploded" ? EXPLODE_GAP : 0;
    const speed = currentExplode.current < wantExplode ? 4.5 : 5.5;
    currentExplode.current = THREE.MathUtils.lerp(
      currentExplode.current, wantExplode, Math.min(1, dt * speed),
    );
    if (Math.abs(currentExplode.current - wantExplode) < 0.002) {
      currentExplode.current = wantExplode;
      explodeSettled.current = true;
    }
    const ce = currentExplode.current;

    for (const [f, grp] of Object.entries(groupRefs.current)) {
      if (grp) grp.position.y = Number(f) * ce;
    }
    if (slopedRoofRef?.current) {
      slopedRoofRef.current.position.y = scene.floors * ce;
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

    if (!explodeSettled.current) invalidate();
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
              matOverrides={matOverrides}
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
              const labelY = PLINTH_H + f * FLOOR_TO_FLOOR + 0.52;
              return (
                <Html
                  key={room.id}
                  position={[rx, labelY, rz]}
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
                position={[scene.plotWidth + 1.4, PLINTH_H + f * FLOOR_TO_FLOOR + FLOOR_TO_FLOOR * 0.5, scene.plotDepth / 2]}
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
const Lighting = memo(function Lighting({ scene, shadowMapSize }: { scene: SceneData; shadowMapSize: number }) {
  const d = scene.diagonal;
  const [cx, , cz] = scene.center;
  return (
    <>
      {/* Soft ambient — slightly warm */}
      <ambientLight color="#F2EDE4" intensity={0.18} />
      {/* Primary sun — warm afternoon (high elevation, WSW azimuth) */}
      <directionalLight
        color="#FFE9B8"
        position={[cx + d * 1.5, d * 2.2, cz - d * 0.4]}
        intensity={1.80}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-far={d * 14}
        shadow-camera-left={-d * 3.2}
        shadow-camera-right={d * 3.2}
        shadow-camera-top={d * 4.8}
        shadow-camera-bottom={-d * 2.8}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-radius={10}
      />
      {/* Cool sky fill — from opposite side + slightly low (bounced sky) */}
      <directionalLight color="#B8D0F4" position={[cx - d * 1.2, d * 0.5, cz + d * 0.9]} intensity={0.28} />
      {/* Warm ground bounce */}
      <directionalLight color="#F0DDB4" position={[cx, -d * 0.5, cz]} intensity={0.12} />
      {/* Sky hemisphere: rich blue sky / warm earth */}
      <hemisphereLight args={["#A8C8F0", "#C8A870", 0.55]} />
    </>
  );
});

// ─── Sloped Roof Overlay (Traditional Indian style) ───────────────────────────
// A gabled / hipped roof geometry placed on top of the flat slab.
// Uses two rotated box meshes for the front and rear slopes, plus
// two triangular end gables built from scaled, rotated boxes.
const SlopedRoofOverlay = memo(function SlopedRoofOverlay({
  scene, tileColor, floors,
}: {
  scene: SceneData;
  tileColor: string;
  floors: number;
}) {
  const pw = scene.plotWidth;
  const pd = scene.plotDepth;
  // Top of parapet / roof surface
  const baseY = PLINTH_H + floors * FLOOR_TO_FLOOR + PARAPET_H + PARAPET_CAP_T + 0.05;
  const overhang = 0.55;
  const rw = pw + overhang * 2;
  const rd = pd + overhang * 2;
  const ridgeH = Math.min(rw, rd) * 0.18;
  const halfW  = rw / 2;
  const halfD  = rd / 2;
  const cx = pw / 2, cz = pd / 2;

  // Gabled roof: ridge runs along depth (Z) axis
  // Each slope: width = halfW, height = ridgeH, depth = rd
  const slopeLen = Math.sqrt(halfW * halfW + ridgeH * ridgeH);
  const angle = Math.atan2(ridgeH, halfW);

  const tileMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.88, metalness: 0.02 }),
    [tileColor],
  );
  useEffect(() => () => { tileMat.dispose(); }, [tileMat]);

  // End gable panels (triangular prism approximated via scale)
  const gableH = ridgeH;
  const gableD = 0.22;

  return (
    <group>
      {/* Left slope (West) */}
      <mesh
        position={[cx - halfW / 2, baseY + ridgeH / 2, cz]}
        rotation={[0, 0, angle]}
        material={tileMat}
        castShadow receiveShadow
      >
        <boxGeometry args={[slopeLen, 0.18, rd]} />
      </mesh>

      {/* Right slope (East) */}
      <mesh
        position={[cx + halfW / 2, baseY + ridgeH / 2, cz]}
        rotation={[0, 0, -angle]}
        material={tileMat}
        castShadow receiveShadow
      >
        <boxGeometry args={[slopeLen, 0.18, rd]} />
      </mesh>

      {/* Ridge beam */}
      <mesh position={[cx, baseY + ridgeH, cz]} material={tileMat} castShadow>
        <boxGeometry args={[0.28, 0.20, rd + 0.20]} />
      </mesh>

      {/* Eave overhang strip (front) */}
      <mesh position={[cx, baseY + 0.05, -overhang / 2]} material={tileMat} receiveShadow>
        <boxGeometry args={[rw, 0.14, overhang]} />
      </mesh>

      {/* Eave overhang strip (rear) */}
      <mesh position={[cx, baseY + 0.05, pd + overhang / 2]} material={tileMat} receiveShadow>
        <boxGeometry args={[rw, 0.14, overhang]} />
      </mesh>

      {/* North gable triangle (scaled box approximation) */}
      <mesh
        position={[cx, baseY + gableH / 2, -overhang - gableD / 2]}
        material={tileMat}
        castShadow
      >
        <boxGeometry args={[rw, gableH, gableD]} />
      </mesh>

      {/* South gable triangle */}
      <mesh
        position={[cx, baseY + gableH / 2, pd + overhang + gableD / 2]}
        material={tileMat}
        castShadow
      >
        <boxGeometry args={[rw, gableH, gableD]} />
      </mesh>
    </group>
  );
});

// ─── Ground ───────────────────────────────────────────────────────────────────
const Ground = memo(function Ground({ scene, textures }: { scene: SceneData; textures: Textures }) {
  const { plotWidth: pw, plotDepth: pd } = scene;
  const extend = Math.max(pw, pd) * 2.5;
  return (
    <group>
      {/* Surrounding lawn — extends well beyond plot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pw / 2, -0.006, pd / 2]} receiveShadow>
        <planeGeometry args={[pw + extend * 2, pd + extend * 2]} />
        <meshStandardMaterial
          color="#4A6030" map={textures.grass}
          roughness={0.96} metalness={0} envMapIntensity={0.05}
        />
      </mesh>
      {/* Plot interior surface — cream pavers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pw / 2, -0.002, pd / 2]} receiveShadow>
        <planeGeometry args={[pw, pd]} />
        <meshStandardMaterial
          color="#C8C2B6" map={textures.pavers}
          normalMap={textures.noiseNorm} normalScale={new THREE.Vector2(0.25, 0.25)}
          roughness={0.84} metalness={0} envMapIntensity={0.08}
        />
      </mesh>
      {/* Street / road in front of plot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pw / 2, -0.003, -2.5]} receiveShadow>
        <planeGeometry args={[pw + extend * 2, 5.0]} />
        <meshStandardMaterial color="#68645E" roughness={0.97} metalness={0} envMapIntensity={0.02} />
      </mesh>
      {/* Kerb strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pw / 2, 0.002, -0.12]} receiveShadow>
        <planeGeometry args={[pw + extend * 2, 0.24]} />
        <meshStandardMaterial color="#A8A298" roughness={0.88} metalness={0} />
      </mesh>
    </group>
  );
});

// ─── Full scene ───────────────────────────────────────────────────────────────
function BuildingScene({
  scene, preset, isoFloor, wireframe, showFurniture, textures, isMobile, style,
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  showFurniture: boolean;
  textures: Textures;
  isMobile: boolean;
  style: StyleDef;
}) {
  const shadowMapSize = isMobile ? 1024 : 2048;
  const aoSamples     = isMobile ? 4 : 12;
  const aoRadius      = isMobile ? 0.9 : 1.6;
  const slopedRoofRef = useRef<THREE.Group>(null);

  return (
    <>
      <CameraController preset={preset} scene={scene} isoFloor={isoFloor} />
      <Lighting scene={scene} shadowMapSize={shadowMapSize} />
      {/* Hemisphere light replaces CDN-fetched HDR environment — sky/ground IBL approximation */}
      <hemisphereLight args={["#C8D8E8", "#8A7A6A", 0.55]} />

      {/* Style-driven sky & fog */}
      <color attach="background" args={[style.skyColor]} />
      <fog attach="fog" args={[style.fogColor, scene.diagonal * 7, scene.diagonal * 16]} />

      <FloorGroups
        scene={scene}
        preset={preset}
        isoFloor={isoFloor}
        wireframe={wireframe}
        slopedRoofRef={slopedRoofRef}
        showFurniture={showFurniture}
        textures={textures}
        matOverrides={style.matOverrides}
      />

      {/* Sloped roof overlay for Traditional Indian style — wrapped in animated group */}
      {style.roofType === "sloped" && (
        <group ref={slopedRoofRef}>
          <SlopedRoofOverlay
            scene={scene}
            tileColor={style.roofTileColor}
            floors={scene.floors}
          />
        </group>
      )}

      {showFurniture && (
        <Suspense fallback={null}>
          <LazyPlotLandscape
            plotWidth={scene.plotWidth}
            plotDepth={scene.plotDepth}
            landscapeStyle={style.landscape}
          />
        </Suspense>
      )}

      <Ground scene={scene} textures={textures} />

      <ContactShadows
        position={[scene.center[0], 0.015, scene.center[2]]}
        scale={scene.diagonal * 2.8}
        opacity={0.60}
        blur={1.8}
        far={14}
        resolution={isMobile ? 512 : 1024}
        frames={1}
        color="#1E1808"
      />

      {!isMobile && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO
            aoRadius={aoRadius}
            intensity={2.2}
            aoSamples={aoSamples}
            denoiseSamples={4}
            denoiseRadius={12}
            distanceFalloff={1.0}
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
        background: active ? (accent ? "rgba(128,184,80,0.18)" : "rgba(200,120,56,0.18)") : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? (accent ? "rgba(128,184,80,0.45)" : "rgba(200,120,56,0.45)") : "rgba(78,118,46,0.18)"}`,
        color: active ? (accent ? "#88C060" : "#D08848") : "#7A9068",
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

const TBDiv   = ({ color }: { color: string }) => <div className="w-px h-5 shrink-0" style={{ background: color }} />;
const TBLabel = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span className="text-[8px] font-bold uppercase tracking-widest shrink-0 select-none" style={{ color }}>{children}</span>
);

// ─── Main exported component ──────────────────────────────────────────────────
interface ThreeViewerProps {
  scene: SceneData;
  styleName?: ArchStyle;
}

export default function ThreeViewer({ scene, styleName = "modern-minimal" }: ThreeViewerProps) {
  const [preset, setPreset]           = useState<ViewPreset>("iso");
  const [isoFloor, setIsoFloor]       = useState(0);
  const [wireframe, setWireframe]     = useState(false);
  const [showFurniture, setFurniture] = useState(true);

  const isMobile = useIsMobile();

  // Singleton texture cache — created once per browser session
  const textures = useMemo(() => getTextures(isMobile), [isMobile]);

  // Resolved style definition — changes instantly on styleName change
  const style = useMemo(() => ARCH_STYLES[styleName], [styleName]);

  const initPos = useMemo<[number, number, number]>(() => {
    const [cx, , cz] = scene.center;
    const d = scene.diagonal;
    return [cx + d * 0.70, d * 0.65, cz + d * 0.70];
  }, [scene]);

  const floorList  = useMemo(() => Array.from({ length: scene.floors + 1 }, (_, i) => i), [scene.floors]);
  const floorNameS = (f: number) => f === 0 ? "G" : f === scene.floors ? "Rf" : `F${f}`;

  const go     = (p: ViewPreset) => setPreset(p);
  const TB     = "#0d1509";
  const TBB    = "rgba(78,118,46,0.20)";
  const isWalk = preset === "walkthrough";
  const walkFloor = isoFloor;

  // DPR: cap at 1.5× on mobile to reduce fill-rate pressure
  const dpr: [number, number] = isMobile ? [1, 1.5] : [1, 2];
  const softShadowSamples = isMobile ? 6 : 12;

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#0d1509" }}>

      {/* ══ Toolbar ══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex flex-col" style={{ background: TB, borderBottom: `1px solid ${TBB}` }}>

        {/* Row 1: Camera views */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto">
          <TBLabel color="#5a7a48">Views</TBLabel>
          <Btn active={preset==="orbit"}  title="Orbit" onClick={() => go("orbit")}  label={<><IconOrbit />Orbit</>} />
          <Btn active={preset==="iso"}    title="Iso"   onClick={() => go("iso")}    label={<><IconIso />Iso</>} />
          <Btn active={preset==="top"}    title="Top"   onClick={() => go("top")}    label={<><IconTop />Top</>} />
          <TBDiv color={TBB} />
          <Btn active={preset==="front"} title="Front" onClick={() => go("front")} label={<><IconFront />Front</>} />
          <Btn active={preset==="rear"}  title="Rear"  onClick={() => go("rear")}  label={<><IconRear />Rear</>} />
          <Btn active={preset==="left"}  title="Left"  onClick={() => go("left")}  label={<><IconLeft />Left</>} />
          <Btn active={preset==="right"} title="Right" onClick={() => go("right")} label={<><IconRight />Right</>} />
          <div className="ml-auto text-[9px] shrink-0" style={{ color: "#4a6838" }}>
            {scene.meshes.length} src · {scene.rooms.length} rooms
          </div>
        </div>

        {/* Row 2: Modes + floor + toggles */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto" style={{ borderTop: `1px solid ${TBB}` }}>
          <TBLabel color="#5a7a48">Modes</TBLabel>
          <Btn active={preset==="walkthrough"} title="Walkthrough" onClick={() => go("walkthrough")} label={<><IconWalk />Walk</>} />
          <Btn active={preset==="dollhouse"}   title="Dollhouse"   onClick={() => go("dollhouse")}   label={<><IconDoll />Doll</>} />
          <Btn active={preset==="exploded"}    title="Exploded"    onClick={() => go("exploded")}    label={<><IconExplode />Explode</>} />
          <TBDiv color={TBB} />
          <TBLabel color="#5a7a48">Floor</TBLabel>
          {floorList.map(f => (
            <button
              key={f}
              title={`Isolate floor ${floorNameS(f)}`}
              onClick={() => { setIsoFloor(f); setPreset("isolated"); }}
              className="w-7 h-7 rounded text-[10px] font-bold transition-all shrink-0"
              style={{
                background: preset === "isolated" && isoFloor === f ? "rgba(200,120,56,0.22)" : "rgba(255,255,255,0.03)",
                color: preset === "isolated" && isoFloor === f ? "#D08848" : "#6a8458",
                border: `1px solid ${preset === "isolated" && isoFloor === f ? "rgba(200,120,56,0.50)" : "rgba(78,118,46,0.18)"}`,
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
          frameloop="demand"
          performance={{ min: 0.5 }}
          dpr={dpr}
          gl={{
            antialias: !isMobile,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
          }}
          camera={{ position: initPos, fov: 44, near: 0.1, far: 8000 }}
          style={{ background: style.skyColor }}
          resize={{ debounce: 0, scroll: false }}
        >
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
              style={style}
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
        style={{
          background: "rgba(10,18,6,0.82)",
          border: "1px solid rgba(78,118,46,0.22)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.40)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="text-[8px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#7a9868" }}>
          {style.name}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {LEGEND_ROLES.map(role => (
            <div key={role} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: style.matOverrides[role]?.color ?? ROLE_SWATCH[role], opacity: ROLE_MAT[role].opacity ?? 1, border: "0.5px solid rgba(255,255,255,0.12)" }}
              />
              <span className="text-[8px] capitalize" style={{ color: "#6a8060" }}>{role.replace(/-/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
