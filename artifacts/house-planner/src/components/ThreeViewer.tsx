import {
  useRef, useMemo, useState, useEffect, Suspense,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, SoftShadows } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import type { SceneData, BoxSpec, MeshRole } from "@/lib/geometryEngine3d";
import { FLOOR_TO_FLOOR } from "@/lib/geometryEngine3d/constants";
import { FloorFurniture, PlotLandscape } from "@/lib/furniture";

// ─── Procedural texture helpers ───────────────────────────────────────────────

function makeCanvas(size: number): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  return c.getContext("2d")!;
}

/** Seeded LCG for repeatable pseudo-random per-texture variation */
function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ─── Concrete texture ─────────────────────────────────────────────────────────
// Light aggregate speckle + subtle mottling
function concreteTexture(opts?: { tint?: string; dark?: boolean }): THREE.CanvasTexture {
  const size = 512;
  const ctx = makeCanvas(size);
  const rand = lcg(opts?.dark ? 2 : 1);

  // Base
  const baseL = opts?.dark ? 158 : 218;
  ctx.fillStyle = opts?.tint ?? (opts?.dark ? `rgb(${baseL},${baseL-4},${baseL-8})` : `rgb(${baseL},${baseL-2},${baseL-6})`);
  ctx.fillRect(0, 0, size, size);

  // Aggregate speckle
  for (let i = 0; i < 3200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.8 + rand() * 2.2;
    const brightness = 180 + Math.floor(rand() * 60) - (opts?.dark ? 20 : 0);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${brightness},${brightness - 4},${brightness - 8},${0.18 + rand() * 0.22})`;
    ctx.fill();
  }

  // Mottling wash
  for (let i = 0; i < 14; i++) {
    const gx = rand() * size; const gy = rand() * size;
    const gr = 40 + rand() * 80;
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

// ─── Normal map from height noise ────────────────────────────────────────────
function noiseNormalMap(seed: number, strength = 0.45): THREE.CanvasTexture {
  const size = 256;
  const ctx = makeCanvas(size);
  const rand = lcg(seed);
  const h = new Float32Array(size * size);

  // Generate height field with value noise
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 1; let freq = 1 / 32;
      for (let o = 0; o < 4; o++) {
        v += (rand() - 0.5) * amp;
        amp *= 0.5; freq *= 2;
      }
      h[y * size + x] = v;
    }
  }

  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const r = (x + 1) % size; const l = (x - 1 + size) % size;
      const u = (y - 1 + size) % size; const d = (y + 1) % size;
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

// ─── Roughness map ────────────────────────────────────────────────────────────
function roughnessMap(seed: number, base: number, variation = 0.12): THREE.CanvasTexture {
  const size = 256;
  const ctx = makeCanvas(size);
  const rand = lcg(seed + 99);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(Math.max(0, Math.min(1, base + (rand() - 0.5) * variation * 2)) * 255);
    img.data[i * 4]     = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

// ─── Wood grain texture ───────────────────────────────────────────────────────
function woodTexture(): THREE.CanvasTexture {
  const size = 512;
  const ctx = makeCanvas(size);
  const rand = lcg(42);

  // Base warm teak
  const base = ctx.createLinearGradient(0, 0, size, 0);
  base.addColorStop(0,   "#7B4A22");
  base.addColorStop(0.3, "#8C5528");
  base.addColorStop(0.6, "#7A4820");
  base.addColorStop(1,   "#8B5230");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Horizontal grain lines
  for (let i = 0; i < 60; i++) {
    const y0 = rand() * size;
    const thick = 0.4 + rand() * 1.6;
    const dark = rand() > 0.5;
    ctx.strokeStyle = dark
      ? `rgba(50,28,10,${0.06 + rand() * 0.10})`
      : `rgba(180,110,60,${0.04 + rand() * 0.08})`;
    ctx.lineWidth = thick;
    ctx.beginPath();
    let px = 0;
    ctx.moveTo(0, y0);
    while (px < size) {
      const step = 12 + rand() * 24;
      const jitter = (rand() - 0.5) * 3;
      ctx.lineTo(px + step, y0 + jitter);
      px += step;
    }
    ctx.stroke();
  }

  // Fine knot suggestion
  for (let k = 0; k < 2; k++) {
    const kx = rand() * size; const ky = rand() * size;
    for (let ring = 0; ring < 8; ring++) {
      const r = 4 + ring * 5;
      ctx.beginPath();
      ctx.ellipse(kx, ky, r * 1.6, r, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(50,24,8,${0.08 - ring * 0.008})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

// ─── Wood normal map ──────────────────────────────────────────────────────────
function woodNormalMap(): THREE.CanvasTexture {
  return noiseNormalMap(77, 0.25);
}

// ─── Brushed metal texture ────────────────────────────────────────────────────
function metalTexture(): THREE.CanvasTexture {
  const size = 256;
  const ctx = makeCanvas(size);
  const rand = lcg(13);

  ctx.fillStyle = "#C0C4C8";
  ctx.fillRect(0, 0, size, size);

  // Horizontal brush lines
  for (let i = 0; i < 180; i++) {
    const y = rand() * size;
    const bright = 165 + Math.floor(rand() * 80);
    ctx.strokeStyle = `rgba(${bright},${bright + 2},${bright + 4},${0.12 + rand() * 0.18})`;
    ctx.lineWidth = 0.4 + rand() * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

// ─── Grass texture ────────────────────────────────────────────────────────────
function grassTexture(): THREE.CanvasTexture {
  const size = 512;
  const ctx = makeCanvas(size);
  const rand = lcg(99);

  ctx.fillStyle = "#3D5A24";
  ctx.fillRect(0, 0, size, size);

  // Blade variation patches
  for (let i = 0; i < 800; i++) {
    const x = rand() * size; const y = rand() * size;
    const r = 2 + rand() * 8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    g.addColorStop(0, light ? "rgba(90,130,50,0.18)" : "rgba(20,38,10,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }

  // Fine blade streaks
  for (let i = 0; i < 600; i++) {
    const x = rand() * size; const y = rand() * size;
    ctx.strokeStyle = `rgba(${60 + Math.floor(rand() * 50)},${100 + Math.floor(rand() * 40)},${20 + Math.floor(rand() * 20)},0.15)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 4, y - 6 - rand() * 8);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

// ─── Concrete pavers texture ──────────────────────────────────────────────────
function paversTexture(): THREE.CanvasTexture {
  const size = 512;
  const ctx = makeCanvas(size);
  const rand = lcg(55);

  ctx.fillStyle = "#C4BFB5";
  ctx.fillRect(0, 0, size, size);

  // Paver slabs
  const cols = 4; const rows = 6;
  const gapX = 3; const gapY = 3;
  const pw = (size - gapX * (cols + 1)) / cols;
  const ph = (size - gapY * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gapX + c * (pw + gapX);
      const y = gapY + r * (ph + gapY);
      const variation = Math.floor(rand() * 20) - 10;
      const base = 196 + variation;
      ctx.fillStyle = `rgb(${base},${base - 3},${base - 6})`;
      ctx.fillRect(x, y, pw, ph);

      // Subtle aggregate on each paver
      for (let i = 0; i < 30; i++) {
        const sx = x + rand() * pw; const sy = y + rand() * ph;
        const sr = 0.5 + rand() * 1.5;
        const sv = 140 + Math.floor(rand() * 80);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sv},${sv},${sv - 4},0.12)`;
        ctx.fill();
      }
    }
  }

  // Grout lines (gaps already show base color)
  ctx.fillStyle = "#A8A29A";
  for (let c = 0; c <= cols; c++) {
    ctx.fillRect(c * (pw + gapX), 0, gapX, size);
  }
  for (let r = 0; r <= rows; r++) {
    ctx.fillRect(0, r * (ph + gapY), size, gapY);
  }

  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  return tex;
}

// ─── Glass texture (subtle smear) ────────────────────────────────────────────
function glassTexture(): THREE.CanvasTexture {
  const size = 128;
  const ctx = makeCanvas(size);
  const rand = lcg(7);

  ctx.fillStyle = "rgba(185, 215, 235, 0.15)";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 12; i++) {
    const x = rand() * size; const y = rand() * size;
    const r = 20 + rand() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Material spec per role ───────────────────────────────────────────────────
type MatSpec = {
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  // PBR extras
  transmission?: number;
  ior?: number;
  reflectivity?: number;
  envMapIntensity?: number;
  textureKey?: "concrete" | "concreteDark" | "wood" | "metal" | "glass" | "pavers" | "grass";
  normalKey?:   "concreteNorm" | "woodNorm" | "noiseNorm";
  roughKey?:    "concreteRough" | "metalRough";
};

const ROLE_MAT: Record<MeshRole, MatSpec> = {
  "exterior-wall": {
    color: "#E8E4DC", roughness: 0.92, metalness: 0,
    textureKey: "concrete", normalKey: "concreteNorm", roughKey: "concreteRough",
    envMapIntensity: 0.05,
  },
  "interior-wall": {
    color: "#F2EEE8", roughness: 0.88, metalness: 0,
    textureKey: "concrete", normalKey: "concreteNorm",
    envMapIntensity: 0.04,
  },
  "floor-slab": {
    color: "#D4D0C8", roughness: 0.85, metalness: 0,
    textureKey: "concrete", normalKey: "concreteNorm", roughKey: "concreteRough",
    envMapIntensity: 0.08,
  },
  "roof-slab": {
    color: "#C8C4BC", roughness: 0.94, metalness: 0,
    textureKey: "concreteDark", normalKey: "concreteNorm",
    envMapIntensity: 0.03,
  },
  "column": {
    color: "#DEDAD2", roughness: 0.90, metalness: 0,
    textureKey: "concrete", normalKey: "concreteNorm",
    envMapIntensity: 0.05,
  },
  "parapet": {
    color: "#DCDAD2", roughness: 0.91, metalness: 0,
    textureKey: "concrete", normalKey: "concreteNorm",
    envMapIntensity: 0.04,
  },
  "balcony-slab": {
    color: "#C8C4BC", roughness: 0.88, metalness: 0,
    textureKey: "concreteDark", normalKey: "concreteNorm",
    envMapIntensity: 0.06,
  },
  "balcony-railing": {
    color: "#B8BCBE", roughness: 0.22, metalness: 0.88,
    textureKey: "metal", roughKey: "metalRough",
    envMapIntensity: 1.2,
  },
  "stair-tread": {
    color: "#C8C4BC", roughness: 0.87, metalness: 0,
    textureKey: "concrete", normalKey: "noiseNorm",
    envMapIntensity: 0.04,
  },
  "door-frame": {
    color: "#6E3E18", roughness: 0.72, metalness: 0,
    textureKey: "wood", normalKey: "woodNorm",
    envMapIntensity: 0.10,
  },
  "door-panel": {
    color: "#7A4820", roughness: 0.62, metalness: 0,
    textureKey: "wood", normalKey: "woodNorm",
    envMapIntensity: 0.14,
  },
  "door-handle": {
    color: "#C0B8B0", roughness: 0.18, metalness: 0.85,
    textureKey: "metal",
    envMapIntensity: 1.4,
  },
  "window-frame": {
    color: "#C8C8C4", roughness: 0.24, metalness: 0.58,
    textureKey: "metal", roughKey: "metalRough",
    envMapIntensity: 0.90,
  },
  "window-glass": {
    color: "#B8D4E8", roughness: 0.04, metalness: 0.08,
    opacity: 0.22,
    transmission: 0.88, ior: 1.52, reflectivity: 0.85,
    textureKey: "glass",
    envMapIntensity: 1.6,
  },
  "window-sill": {
    color: "#D8D2C8", roughness: 0.38, metalness: 0.06,
    textureKey: "concrete", normalKey: "noiseNorm",
    envMapIntensity: 0.18,
  },
};

// ─── Legend color per role (swatch) ──────────────────────────────────────────
const ROLE_SWATCH: Record<MeshRole, string> = Object.fromEntries(
  Object.entries(ROLE_MAT).map(([k, v]) => [k, v.color])
) as Record<MeshRole, string>;

// ─── Texture cache hook ───────────────────────────────────────────────────────
function useTextures() {
  return useMemo(() => ({
    concrete:      concreteTexture(),
    concreteDark:  concreteTexture({ dark: true }),
    concreteNorm:  noiseNormalMap(1, 0.40),
    concreteRough: roughnessMap(1, 0.91, 0.08),
    woodTex:       woodTexture(),
    woodNorm:      woodNormalMap(),
    metalTex:      metalTexture(),
    metalRough:    roughnessMap(13, 0.22, 0.06),
    glassTex:      glassTexture(),
    noiseNorm:     noiseNormalMap(44, 0.20),
    pavers:        paversTexture(),
    grass:         grassTexture(),
  }), []);
}

// ─── PBR material resolver ────────────────────────────────────────────────────
function PBRMesh({
  spec,
  textures,
  wireframe,
  dimOpacity,
}: {
  spec: BoxSpec;
  textures: ReturnType<typeof useTextures>;
  wireframe: boolean;
  dimOpacity?: number;
}) {
  const mat = ROLE_MAT[spec.role];
  const baseOpacity = mat.opacity ?? 1;
  const opacity = dimOpacity !== undefined ? baseOpacity * dimOpacity : baseOpacity;
  const transparent = opacity < 0.999 || (mat.transmission ?? 0) > 0;

  // Map texture key → actual texture
  const map = useMemo(() => {
    switch (mat.textureKey) {
      case "concrete":     return textures.concrete;
      case "concreteDark": return textures.concreteDark;
      case "wood":         return textures.woodTex;
      case "metal":        return textures.metalTex;
      case "glass":        return textures.glassTex;
      case "pavers":       return textures.pavers;
      case "grass":        return textures.grass;
      default:             return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mat.textureKey]);

  const normalMap = useMemo(() => {
    switch (mat.normalKey) {
      case "concreteNorm": return textures.concreteNorm;
      case "woodNorm":     return textures.woodNorm;
      case "noiseNorm":    return textures.noiseNorm;
      default:             return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mat.normalKey]);

  const roughMap = useMemo(() => {
    switch (mat.roughKey) {
      case "concreteRough": return textures.concreteRough;
      case "metalRough":    return textures.metalRough;
      default:              return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mat.roughKey]);

  const isGlass = (mat.transmission ?? 0) > 0;

  return (
    <mesh
      position={[spec.cx, spec.cy, spec.cz]}
      rotation={[0, spec.ry, 0]}
      castShadow={!isGlass}
      receiveShadow
    >
      <boxGeometry args={[spec.w, spec.h, spec.d]} />
      {isGlass ? (
        // @ts-ignore — MeshPhysicalMaterial props differ between R3F versions
        <meshPhysicalMaterial
          color={mat.color}
          roughness={mat.roughness}
          metalness={mat.metalness}
          transmission={mat.transmission}
          ior={mat.ior ?? 1.5}
          reflectivity={mat.reflectivity ?? 0.5}
          opacity={opacity}
          transparent={transparent}
          envMapIntensity={mat.envMapIntensity ?? 1.0}
          map={map}
          wireframe={false}
        />
      ) : (
        <meshStandardMaterial
          color={mat.color}
          roughness={mat.roughness}
          metalness={mat.metalness}
          opacity={opacity}
          transparent={transparent}
          envMapIntensity={mat.envMapIntensity ?? 0.2}
          map={map ?? undefined}
          normalMap={normalMap ?? undefined}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughnessMap={roughMap ?? undefined}
          wireframe={wireframe && !transparent}
        />
      )}
    </mesh>
  );
}

// ─── View presets ─────────────────────────────────────────────────────────────
export type ViewPreset = "iso" | "top" | "dollhouse" | "exploded" | "isolated";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function presetCamera(
  preset: ViewPreset,
  scene: SceneData,
  isoFloor: number,
): { pos: THREE.Vector3; target: THREE.Vector3 } {
  const [cx, cy, cz] = scene.center;
  const d = scene.diagonal;

  switch (preset) {
    case "top":
      return {
        pos:    new THREE.Vector3(cx, cy + d * 1.6, cz + 0.02),
        target: new THREE.Vector3(cx, 0, cz),
      };
    case "dollhouse":
      return {
        pos:    new THREE.Vector3(cx - d * 0.45, cy + d * 1.15, cz + d * 0.45),
        target: new THREE.Vector3(cx, cy * 0.25, cz),
      };
    case "exploded": {
      const extra = scene.floors * FLOOR_TO_FLOOR * 1.4;
      return {
        pos:    new THREE.Vector3(cx + d * 0.85, cy + d * 0.8 + extra * 0.4, cz + d * 0.85),
        target: new THREE.Vector3(cx, cy + extra * 0.35, cz),
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
  preset,
  scene,
  isoFloor,
}: {
  preset: ViewPreset;
  scene: SceneData;
  isoFloor: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animRef = useRef<{
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
  } | null>(null);

  useEffect(() => {
    const { pos, target } = presetCamera(preset, scene, isoFloor);
    animRef.current = {
      fromPos:    camera.position.clone(),
      fromTarget: controlsRef.current?.target.clone()
                    ?? new THREE.Vector3(...scene.center),
      toPos:    pos,
      toTarget: target,
      t: 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, isoFloor]);

  useFrame((_, dt) => {
    const a = animRef.current;
    if (!a || !controlsRef.current) return;
    a.t = Math.min(1, a.t + dt * 2.4);
    const e = easeInOutCubic(a.t);
    camera.position.lerpVectors(a.fromPos, a.toPos, e);
    controlsRef.current.target.lerpVectors(a.fromTarget, a.toTarget, e);
    controlsRef.current.update();
    if (a.t >= 1) animRef.current = null;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      rotateSpeed={0.85}
      zoomSpeed={1.1}
      panSpeed={0.85}
      minDistance={1}
      maxDistance={scene.diagonal * 4}
      maxPolarAngle={Math.PI * 0.88}
    />
  );
}

// ─── Animated floor groups (exploded view) ────────────────────────────────────
const EXPLODE_GAP = FLOOR_TO_FLOOR * 1.6;

function FloorGroups({
  scene,
  preset,
  isoFloor,
  wireframe,
  showFurniture,
  textures,
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  showFurniture: boolean;
  textures: ReturnType<typeof useTextures>;
}) {
  const byFloor = useMemo<Map<number, BoxSpec[]>>(() => {
    const m = new Map<number, BoxSpec[]>();
    for (const spec of scene.meshes) {
      if (!m.has(spec.floor)) m.set(spec.floor, []);
      m.get(spec.floor)!.push(spec);
    }
    return m;
  }, [scene.meshes]);

  const groupRefs = useRef<Record<number, THREE.Group | null>>({});
  const currentExplode = useRef(0);

  useFrame((_, dt) => {
    const want = preset === "exploded" ? EXPLODE_GAP : 0;
    currentExplode.current = THREE.MathUtils.lerp(currentExplode.current, want, dt * 3.5);
    for (const [f, grp] of Object.entries(groupRefs.current)) {
      if (grp) grp.position.y = Number(f) * currentExplode.current;
    }
  });

  const hideRoof = preset === "dollhouse";

  return (
    <>
      {[...byFloor.entries()].map(([f, meshes]) => {
        const dimmed = preset === "isolated" && f !== isoFloor;
        return (
          <group key={f} ref={el => { groupRefs.current[f] = el; }}>
            {meshes.map(spec => {
              if (hideRoof && (spec.role === "roof-slab" || spec.role === "parapet")) return null;
              return (
                <PBRMesh
                  key={spec.id}
                  spec={spec}
                  textures={textures}
                  wireframe={wireframe}
                  dimOpacity={dimmed ? 0.10 : undefined}
                />
              );
            })}
            {showFurniture && !dimmed && (
              <Suspense fallback={null}>
                <FloorFurniture floor={f} rooms={scene.rooms} />
              </Suspense>
            )}
          </group>
        );
      })}
    </>
  );
}

// ─── Lighting — modern architectural daylight ─────────────────────────────────
// Balanced for contemporary residential visualization:
// - Soft warm sun (10 am east-southeast elevation)
// - Cool diffuse sky fill from the opposite quadrant
// - Gentle ground bounce
// - Hemisphere gradient for overall atmospheric wrap
function Lighting({ scene }: { scene: SceneData }) {
  const d = scene.diagonal;
  const [cx, , cz] = scene.center;
  return (
    <>
      {/* Soft ambient — keeps shadow areas from going fully black */}
      <ambientLight color="#F8F4EE" intensity={0.22} />

      {/* Primary sun — warm 10 am east-southeast, elevated 55°
          Lower intensity + 4096 shadow map + radius → soft natural edges */}
      <directionalLight
        color="#FFE8B0"
        position={[cx + d * 1.3, d * 2.0, cz + d * 0.5]}
        intensity={1.45}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={d * 8}
        shadow-camera-left={-d * 2.2}
        shadow-camera-right={d * 2.2}
        shadow-camera-top={d * 2.2}
        shadow-camera-bottom={-d * 2.2}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-radius={8}
      />

      {/* Sky fill — soft blue from northwest (overcast sky GI simulation) */}
      <directionalLight
        color="#BDD4F0"
        position={[cx - d * 1.0, d * 0.6, cz - d * 0.7]}
        intensity={0.32}
      />

      {/* Bounce fill — warm reflected ground light */}
      <directionalLight
        color="#F0DEB8"
        position={[cx + d * 0.2, -d * 0.3, cz + d * 0.4]}
        intensity={0.10}
      />

      {/* Hemisphere — sky/ground atmosphere wrap */}
      <hemisphereLight args={["#C8DCF4", "#D4C4A0", 0.48]} />
    </>
  );
}

// ─── Ground — textured grass + concrete pavers ────────────────────────────────
function Ground({ scene, textures }: { scene: SceneData; textures: ReturnType<typeof useTextures> }) {
  const { plotWidth: pw, plotDepth: pd } = scene;
  const extend = Math.max(pw, pd) * 1.8;

  return (
    <group>
      {/* Green lawn */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[pw / 2, -0.004, pd / 2]}
        receiveShadow
      >
        <planeGeometry args={[pw + extend * 2, pd + extend * 2]} />
        <meshStandardMaterial
          color="#3A5520"
          map={textures.grass}
          roughness={0.97}
          metalness={0}
          envMapIntensity={0.04}
        />
      </mesh>

      {/* Plot paving — concrete pavers */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[pw / 2, -0.001, pd / 2]}
        receiveShadow
      >
        <planeGeometry args={[pw, pd]} />
        <meshStandardMaterial
          color="#C2BDB2"
          map={textures.pavers}
          normalMap={textures.noiseNorm}
          normalScale={new THREE.Vector2(0.3, 0.3)}
          roughness={0.88}
          metalness={0}
          envMapIntensity={0.06}
        />
      </mesh>

      {/* Road strip */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[pw / 2, -0.002, -1.5]}
        receiveShadow
      >
        <planeGeometry args={[pw + extend * 2, 3.0]} />
        <meshStandardMaterial
          color="#7A7670"
          map={textures.concreteDark}
          roughness={0.95}
          metalness={0}
          envMapIntensity={0.03}
        />
      </mesh>
    </group>
  );
}

// ─── Full scene ────────────────────────────────────────────────────────────────
function BuildingScene({
  scene,
  preset,
  isoFloor,
  wireframe,
  showFurniture,
  textures,
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  showFurniture: boolean;
  textures: ReturnType<typeof useTextures>;
}) {
  return (
    <>
      <CameraController preset={preset} scene={scene} isoFloor={isoFloor} />
      <Lighting scene={scene} />

      {/* Warm morning daylight HDRI — drives reflections on glass & metal */}
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
          <PlotLandscape plotWidth={scene.plotWidth} plotDepth={scene.plotDepth} />
        </Suspense>
      )}
      <Ground scene={scene} textures={textures} />

      {/* Contact shadows — soft grounding of the building on terrain */}
      <ContactShadows
        position={[scene.center[0], 0.02, scene.center[2]]}
        scale={scene.diagonal * 2.4}
        opacity={0.48}
        blur={2.8}
        far={10}
        resolution={1024}
        frames={1}
        color="#2A2010"
      />

      {/* Screen-space ambient occlusion — adds depth to corners & crevices */}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO
          aoRadius={1.2}
          intensity={1.6}
          aoSamples={8}
          denoiseSamples={4}
          denoiseRadius={10}
          distanceFalloff={1.2}
        />
      </EffectComposer>
    </>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function PresetBtn({
  active, label, onClick, title,
}: {
  active: boolean; label: React.ReactNode; onClick: () => void; title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded transition-all text-[10px] font-semibold"
      style={{
        background: active ? "rgba(210,130,40,0.22)" : "rgba(255,255,255,0.05)",
        border:     `1px solid ${active ? "rgba(210,130,40,0.55)" : "rgba(255,255,255,0.09)"}`,
        color:      active ? "#E09858" : "#9AAAB8",
        minWidth: 48,
      }}
    >
      {label}
    </button>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const IconTop = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);
const IconIso = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 9l10-7 10 7v6l-10 7L2 15Z" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="9" x2="22" y2="9" />
  </svg>
);
const IconDoll = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11H3Z" /><line x1="3" y1="14" x2="21" y2="14" /><line x1="9" y1="21" x2="9" y2="14" /><line x1="15" y1="21" x2="15" y2="14" />
  </svg>
);
const IconExplode = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="17" width="18" height="4" rx="1" />
  </svg>
);
const IconFloor = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="10" rx="2" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="7" y1="7" x2="7" y2="17" />
  </svg>
);
const IconWire = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 9l10-7 10 7v6l-10 7L2 15Z" /><path d="M2 9l10 7 10-7" strokeDasharray="3 2" /><line x1="12" y1="16" x2="12" y2="22" strokeDasharray="3 2" />
  </svg>
);
const IconSofa = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 10v7h20v-7" /><path d="M2 14h20" /><path d="M2 10a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3" /><line x1="5" y1="17" x2="5" y2="20" /><line x1="19" y1="17" x2="19" y2="20" />
  </svg>
);

// ─── Legend labels ────────────────────────────────────────────────────────────
const LEGEND_ROLES: MeshRole[] = [
  "exterior-wall","interior-wall","floor-slab","roof-slab",
  "column","parapet","balcony-slab","balcony-railing",
  "stair-tread","door-frame","door-panel","door-handle",
  "window-frame","window-glass","window-sill",
];

// ─── Main exported component ──────────────────────────────────────────────────
interface ThreeViewerProps { scene: SceneData }

export default function ThreeViewer({ scene }: ThreeViewerProps) {
  const [preset, setPreset]           = useState<ViewPreset>("iso");
  const [isoFloor, setIsoFloor]       = useState(0);
  const [wireframe, setWireframe]     = useState(false);
  const [showFurniture, setFurniture] = useState(true);

  const textures = useTextures();

  const initPos = useMemo<[number, number, number]>(() => {
    const [cx, , cz] = scene.center;
    const d = scene.diagonal;
    return [cx + d * 0.70, d * 0.65, cz + d * 0.70];
  }, [scene]);

  const floorList = useMemo(
    () => Array.from({ length: scene.floors + 1 }, (_, i) => i),
    [scene.floors],
  );
  const floorName = (f: number) =>
    f === 0 ? "G" : f === scene.floors ? "Rf" : `F${f}`;

  const presets: Array<{ id: ViewPreset; label: React.ReactNode; title: string }> = [
    { id: "iso",       label: <><IconIso />Isometric</>,    title: "Isometric view" },
    { id: "top",       label: <><IconTop />Top View</>,     title: "Orthographic top-down" },
    { id: "dollhouse", label: <><IconDoll />Dollhouse</>,   title: "Dollhouse (roof hidden)" },
    { id: "exploded",  label: <><IconExplode />Exploded</>, title: "Exploded floors" },
    { id: "isolated",  label: <><IconFloor />Isolate</>,    title: "Isolate one floor" },
  ];

  const TB = "#18181B";
  const TBB = "#27272A";

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#F0EDE8" }}>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 overflow-x-auto"
        style={{ background: TB, borderBottom: `1px solid ${TBB}` }}
      >
        <div className="flex items-center gap-1.5 mr-1">
          {presets.map(p => (
            <PresetBtn key={p.id} active={preset === p.id} label={p.label} title={p.title} onClick={() => setPreset(p.id)} />
          ))}
        </div>

        <div className="w-px h-8 shrink-0" style={{ background: TBB }} />

        <div className="flex items-center gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wide mr-0.5" style={{ color: "#5A6A78" }}>
            Floor
          </span>
          {floorList.map(f => (
            <button
              key={f}
              onClick={() => { setIsoFloor(f); if (preset !== "isolated") setPreset("isolated"); }}
              className="w-8 h-7 rounded text-[11px] font-bold transition-all"
              style={{
                background: preset === "isolated" && isoFloor === f ? "#E09040" : preset === "isolated" ? "#27272A" : "rgba(255,255,255,0.05)",
                color:  preset === "isolated" && isoFloor === f ? "#FFF" : "#7A8A98",
                border: `1px solid ${preset === "isolated" && isoFloor === f ? "#E09040" : TBB}`,
              }}
            >
              {floorName(f)}
            </button>
          ))}
        </div>

        <div className="w-px h-8 shrink-0" style={{ background: TBB }} />

        <PresetBtn active={showFurniture} label={<><IconSofa />Furniture</>} title="Toggle furniture & landscape" onClick={() => setFurniture(v => !v)} />
        <PresetBtn active={wireframe}     label={<><IconWire />Wireframe</>}  title="Wireframe overlay"            onClick={() => setWireframe(v => !v)} />

        <div className="ml-auto text-[10px]" style={{ color: "#4A5A68" }}>
          {scene.meshes.length} meshes · {scene.rooms.length} rooms
        </div>
      </div>

      {/* ── 3D Canvas ────────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full">
        <Canvas
          shadows={{ type: THREE.PCFSoftShadowMap }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
          camera={{ position: initPos, fov: 46, near: 0.1, far: 8000 }}
          style={{ background: "#D8E4EE" }}
          resize={{ debounce: 0, scroll: false }}
        >
          <color attach="background" args={["#D8E4EE"]} />
          <fog attach="fog" args={["#D8E4EE", scene.diagonal * 5, scene.diagonal * 12]} />
          {/* Soft shadow penumbra — spreads PCF taps for natural feathering */}
          <SoftShadows size={18} focus={0.6} samples={12} />
          <Suspense fallback={null}>
            <BuildingScene
              scene={scene}
              preset={preset}
              isoFloor={isoFloor}
              wireframe={wireframe}
              showFurniture={showFurniture}
              textures={textures}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Interaction hint ──────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-3 right-3 text-[9px] leading-relaxed pointer-events-none"
        style={{ color: "rgba(60,50,40,0.38)" }}
      >
        Drag · Scroll · Right-drag to pan
      </div>

      {/* ── Material legend ───────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-3 left-3 rounded-xl p-2.5 backdrop-blur-sm"
        style={{
          background: "rgba(255,253,250,0.92)",
          border: "1px solid rgba(180,170,155,0.30)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div className="text-[8px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6A5A48" }}>
          Materials
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {LEGEND_ROLES.map(role => (
            <div key={role} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{
                  background: ROLE_SWATCH[role],
                  opacity: ROLE_MAT[role].opacity ?? 1,
                  border: "0.5px solid rgba(0,0,0,0.08)",
                }}
              />
              <span className="text-[8px] capitalize" style={{ color: "#7A6A58" }}>
                {role.replace(/-/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
