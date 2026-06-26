// ─── Premium Landscape Elements ──────────────────────────────────────────────
// Performance-optimised: module-level shared geometries + materials (created
// once, reused across every instance). LOD managed by a single useFrame in
// PlotLandscape rather than one per Tree. All components wrapped in memo().
//
// All dimensions in metres. Y=0 = ground level.
// Plot coordinate system: X = west→east, Z = south (street) → north (back).

import { useRef, useMemo, memo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LandscapeStyle } from "@/lib/houseStyle";

type V3 = [number, number, number];

const C = {
  bark:          "#7A5232",
  barkDark:      "#523820",
  canopy1:       "#3A6840",
  canopy2:       "#2C5530",
  canopy3:       "#4E8058",
  canopy4:       "#5A9060",
  potTerra:      "#B5714A",
  potRim:        "#A0603C",
  soil:          "#4A3828",
  bush1:         "#3C6238",
  bush2:         "#4E7A48",
  wallPlaster:   "#C6BDB2",
  wallCoping:    "#D8D0C8",
  pillarFace:    "#BAB2A8",
  pillarCap:     "#E0D8CE",
  gateIron:      "#28283A",
  gateBar:       "#323248",
  gateHinge:     "#8A7A44",
  driveStone:    "#B4ADA4",
  walkSlab:      "#D0C8BA",
  walkSlabAlt:   "#C4BDB0",
  shrubDark:     "#285228",
  shrubMid:      "#386434",
  shrubLight:    "#4A8840",
  flowerRed:     "#D02828",
  flowerPink:    "#C84878",
  flowerYellow:  "#E8B818",
  flowerWhite:   "#F4F0E4",
  flowerLav:     "#8868C0",
  bedSoil:       "#4A3818",
  bedEdge:       "#9E8858",
  lampIron:      "#222232",
  lampBase:      "#2C2C3C",
  lampGlass:     "#FFF8C0",
  planterFace:   "#A8A098",
  planterCap:    "#C0BAB0",
};

// ─── Module-level shared geometries ──────────────────────────────────────────
// Created once per app session; every Tree/Shrub/etc. references the same GPU
// buffer — no per-instance VBO uploads.
const G = {
  // Tree – high detail
  rootFlare:    new THREE.CylinderGeometry(0.16, 0.22, 0.24, 7),
  lowerTrunk:   new THREE.CylinderGeometry(0.09, 0.14, 1.80, 7),
  upperTrunk:   new THREE.CylinderGeometry(0.055, 0.09, 0.80, 6),
  baseCanopy:   new THREE.SphereGeometry(1.20, 8, 6),
  midCanopy:    new THREE.SphereGeometry(0.92, 7, 5),
  topCrown:     new THREE.SphereGeometry(0.68, 6, 5),
  highlight:    new THREE.SphereGeometry(0.42, 5, 4),
  // Tree – low detail
  loTrunk:      new THREE.CylinderGeometry(0.10, 0.16, 2.10, 5),
  loCanopy:     new THREE.SphereGeometry(1.30, 6, 4),
  // SmallTree – high
  stTrunk:      new THREE.CylinderGeometry(0.055, 0.085, 1.10, 7),
  stCanopy1:    new THREE.SphereGeometry(0.68, 7, 5),
  stCanopy2:    new THREE.SphereGeometry(0.50, 6, 4),
  stCanopy3:    new THREE.SphereGeometry(0.32, 5, 4),
  // SmallTree – low
  stLoTrunk:    new THREE.CylinderGeometry(0.06, 0.09, 1.10, 5),
  stLoCanopy:   new THREE.SphereGeometry(0.76, 5, 4),
  // Shrub
  shrubMain:    new THREE.SphereGeometry(0.42, 7, 5),
  shrubMed:     new THREE.SphereGeometry(0.28, 6, 4),
  shrubSm:      new THREE.SphereGeometry(0.22, 5, 4),
  // Plant pot (small)
  potBody:      new THREE.CylinderGeometry(0.14, 0.10, 0.30, 8),
  potRim:       new THREE.CylinderGeometry(0.155, 0.14, 0.025, 8),
  potSoil:      new THREE.CylinderGeometry(0.13, 0.13, 0.015, 8),
  potBush:      new THREE.SphereGeometry(0.28, 6, 4),
  potBush2:     new THREE.SphereGeometry(0.18, 5, 4),
  // LargePlant pot
  lpotBody:     new THREE.CylinderGeometry(0.22, 0.16, 0.46, 8),
  lpotRim:      new THREE.CylinderGeometry(0.235, 0.22, 0.030, 8),
  lpotSoil:     new THREE.CylinderGeometry(0.21, 0.21, 0.020, 8),
  lplantStem:   new THREE.CylinderGeometry(0.025, 0.025, 0.28, 5),
  lpBush1:      new THREE.SphereGeometry(0.40, 7, 5),
  lpBush2:      new THREE.SphereGeometry(0.28, 6, 4),
  lpBush3:      new THREE.SphereGeometry(0.24, 5, 4),
  // Lamp post
  lampBase:     new THREE.BoxGeometry(0.30, 0.26, 0.30),
  lampPost:     new THREE.CylinderGeometry(0.042, 0.068, 2.82, 8),
  lampNeck:     new THREE.CylinderGeometry(0.030, 0.042, 0.20, 7),
  lampArm:      new THREE.CylinderGeometry(0.022, 0.022, 0.64, 6),
  lampHouse:    new THREE.BoxGeometry(0.20, 0.24, 0.20),
  lampGlassBox: new THREE.BoxGeometry(0.13, 0.17, 0.13),
  // Gate pillar
  pillarFinial: new THREE.CylinderGeometry(0.025, 0.16, 0.28, 4),
  // Walkway slab (standard size)
  walkSlab:     new THREE.BoxGeometry(1.40, 0.044, 0.58),
  // Planter box soil slab
  planterSoil:  new THREE.BoxGeometry(1, 0.02, 1), // scaled per instance
  planterBall:  new THREE.SphereGeometry(0.19, 6, 5),
  planterBall2: new THREE.SphereGeometry(0.12, 5, 4),
};

// ─── Module-level shared materials ───────────────────────────────────────────
const M = (() => {
  const s = (color: string, roughness: number, metalness = 0, extra?: Partial<THREE.MeshStandardMaterialParameters>) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

  const lampGlassMat = s(C.lampGlass, 0.08, 0, { transparent: true, opacity: 0.90 });
  lampGlassMat.emissive = new THREE.Color(C.lampGlass);
  lampGlassMat.emissiveIntensity = 0.72;

  return {
    bark:        s(C.bark,        0.91),
    barkDark:    s(C.barkDark,    0.94),
    canopy1:     s(C.canopy1,     0.91),
    canopy2:     s(C.canopy2,     0.93),
    canopy3:     s(C.canopy3,     0.89),
    canopy4:     s(C.canopy4,     0.87),
    potTerra:    s(C.potTerra,    0.80),
    potRim:      s(C.potRim,      0.75),
    soil:        s(C.soil,        0.95),
    bush1:       s(C.bush1,       0.90),
    bush2:       s(C.bush2,       0.88),
    shrubDark:   s(C.shrubDark,   0.95),
    shrubMid:    s(C.shrubMid,    0.94),
    shrubLight:  s(C.shrubLight,  0.92),
    wallPlaster: s(C.wallPlaster, 0.88),
    wallCoping:  s(C.wallCoping,  0.80),
    pillarFace:  s(C.pillarFace,  0.84),
    pillarCap:   s(C.pillarCap,   0.78),
    pillarFinial:s(C.pillarCap,   0.72),
    gateIron:    s(C.gateIron,    0.50, 0.75),
    gateIron2:   s(C.gateIron,    0.52, 0.73),
    gateBar:     s(C.gateBar,     0.48, 0.76),
    gateHinge:   s(C.gateHinge,   0.36, 0.82),
    driveStone:  s(C.driveStone,  0.88),
    walkSlabA:   s(C.walkSlab,    0.84),
    walkSlabB:   s(C.walkSlabAlt, 0.84),
    bedEdge:     s(C.bedEdge,     0.84),
    bedSoil:     s(C.bedSoil,     0.97),
    planterFace: s(C.planterFace, 0.82),
    planterCap:  s(C.planterCap,  0.76),
    lampIron:    s(C.lampIron,    0.56, 0.58),
    lampBase:    s(C.lampBase,    0.70, 0.35),
    lampGlass:   lampGlassMat,
  };
})();

// Flower palette — one material per colour, reused across all beds
const FLOWER_MATS = [C.flowerRed, C.flowerPink, C.flowerYellow, C.flowerWhite, C.flowerLav].map(color => {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
  m.emissive = new THREE.Color(color);
  m.emissiveIntensity = 0.06;
  return m;
});

// ─── LOD thresholds ───────────────────────────────────────────────────────────
const TREE_LOD_NEAR   = 22;
const STREE_LOD_NEAR  = 18;

// ─── Tree ─────────────────────────────────────────────────────────────────────
// highRef / lowRef controlled by PlotLandscape's single useFrame (no per-tree
// useFrame subscription — reduces frame-callback overhead dramatically).
interface TreeProps {
  position: V3; rotation?: number; scale?: number;
  highRef: (g: THREE.Group | null) => void;
  lowRef:  (g: THREE.Group | null) => void;
}

export const Tree = memo(function Tree({ position, rotation = 0, scale = 1, highRef, lowRef }: TreeProps) {
  const s = scale;
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={[s, s, s]}>
      <group ref={highRef}>
        <mesh geometry={G.rootFlare}  material={M.barkDark} position={[0, 0.12, 0]} receiveShadow />
        <mesh geometry={G.lowerTrunk} material={M.bark}     position={[0, 1.05, 0]} castShadow receiveShadow />
        <mesh geometry={G.upperTrunk} material={M.bark}     position={[0, 2.10, 0]} castShadow />
        <mesh geometry={G.baseCanopy} material={M.canopy2}  position={[0, 2.65, 0]} castShadow />
        <mesh geometry={G.midCanopy}  material={M.canopy1}  position={[0.30, 3.10, 0.20]} castShadow />
        <mesh geometry={G.topCrown}   material={M.canopy3}  position={[-0.18, 3.65, -0.12]} castShadow />
        <mesh geometry={G.highlight}  material={M.canopy4}  position={[0.10, 3.90, 0.08]} castShadow />
      </group>
      <group ref={lowRef}>
        <mesh geometry={G.loTrunk}  material={M.bark}    position={[0, 1.05, 0]} />
        <mesh geometry={G.loCanopy} material={M.canopy2} position={[0, 2.90, 0]} castShadow />
      </group>
    </group>
  );
});

// ─── SmallTree ────────────────────────────────────────────────────────────────
interface SmallTreeProps {
  position: V3; rotation?: number;
  highRef: (g: THREE.Group | null) => void;
  lowRef:  (g: THREE.Group | null) => void;
}

export const SmallTree = memo(function SmallTree({ position, rotation = 0, highRef, lowRef }: SmallTreeProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={highRef}>
        <mesh geometry={G.stTrunk}   material={M.bark}    position={[0, 0.55, 0]} castShadow receiveShadow />
        <mesh geometry={G.stCanopy1} material={M.canopy2} position={[0, 1.40, 0]} castShadow />
        <mesh geometry={G.stCanopy2} material={M.canopy1} position={[0.14, 1.75, 0.10]} castShadow />
        <mesh geometry={G.stCanopy3} material={M.canopy3} position={[-0.10, 1.95, -0.08]} castShadow />
      </group>
      <group ref={lowRef}>
        <mesh geometry={G.stLoTrunk}  material={M.bark}    position={[0, 0.55, 0]} />
        <mesh geometry={G.stLoCanopy} material={M.canopy2} position={[0, 1.58, 0]} castShadow />
      </group>
    </group>
  );
});

// ─── Potted Plant ─────────────────────────────────────────────────────────────
export const Plant = memo(function Plant({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={G.potBody}  material={M.potTerra} position={[0, 0.16, 0]} castShadow receiveShadow />
      <mesh geometry={G.potRim}   material={M.potRim}   position={[0, 0.31, 0]} />
      <mesh geometry={G.potSoil}  material={M.soil}     position={[0, 0.32, 0]} />
      <mesh geometry={G.potBush}  material={M.bush1}    position={[0, 0.60, 0]} castShadow />
      <mesh geometry={G.potBush2} material={M.bush2}    position={[0.08, 0.70, 0.06]} castShadow />
    </group>
  );
});

// ─── Large Decorative Plant ───────────────────────────────────────────────────
export const LargePlant = memo(function LargePlant({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={G.lpotBody}    material={M.potTerra} position={[0, 0.24, 0]} castShadow receiveShadow />
      <mesh geometry={G.lpotRim}     material={M.potRim}   position={[0, 0.47, 0]} />
      <mesh geometry={G.lpotSoil}    material={M.soil}     position={[0, 0.49, 0]} />
      <mesh geometry={G.lplantStem}  material={M.bark}     position={[0, 0.65, 0]} castShadow />
      <mesh geometry={G.lpBush1}     material={M.bush1}    position={[0, 0.95, 0]} castShadow />
      <mesh geometry={G.lpBush2}     material={M.bush2}    position={[0.18, 1.12, 0.14]} castShadow />
      <mesh geometry={G.lpBush3}     material={M.canopy3}  position={[-0.14, 1.08, -0.10]} castShadow />
    </group>
  );
});

// ─── Wall panel with coping strip ─────────────────────────────────────────────
const WallPanel = memo(function WallPanel({
  cx, cz, length, axis, height = 1.50, thick = 0.22,
  wallColor, copingColor,
}: {
  cx: number; cz: number; length: number; axis: "x" | "z";
  height?: number; thick?: number;
  wallColor?: string; copingColor?: string;
}) {
  const [bw, bd] = axis === "x" ? [length, thick] : [thick, length];
  const cw = bw + 0.06, cd = bd + 0.06;
  const wallGeo   = useMemo(() => new THREE.BoxGeometry(bw, height, bd), [bw, height, bd]);
  const copingGeo = useMemo(() => new THREE.BoxGeometry(cw, 0.096, cd), [cw, cd]);
  return (
    <group>
      <mesh geometry={wallGeo}   position={[cx, height / 2, cz]} castShadow receiveShadow>
        {wallColor
          ? <meshStandardMaterial color={wallColor}   roughness={0.88} metalness={0} />
          : <primitive object={M.wallPlaster} attach="material" />}
      </mesh>
      <mesh geometry={copingGeo} position={[cx, height + 0.048, cz]}>
        {copingColor
          ? <meshStandardMaterial color={copingColor} roughness={0.80} metalness={0} />
          : <primitive object={M.wallCoping} attach="material" />}
      </mesh>
    </group>
  );
});

// ─── Gate pillar ──────────────────────────────────────────────────────────────
const GatePillar = memo(function GatePillar({
  cx, cz, pillarColor, pillarCapColor,
}: { cx: number; cz: number; pillarColor?: string; pillarCapColor?: string }) {
  const pw = 0.42, ph = 2.10;
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(pw, ph, pw), []);
  const capGeo  = useMemo(() => new THREE.BoxGeometry(pw + 0.12, 0.104, pw + 0.12), []);
  return (
    <group>
      <mesh geometry={bodyGeo} position={[cx, ph / 2, cz]} castShadow receiveShadow>
        {pillarColor
          ? <meshStandardMaterial color={pillarColor} roughness={0.84} metalness={0} />
          : <primitive object={M.pillarFace} attach="material" />}
      </mesh>
      <mesh geometry={capGeo} position={[cx, ph + 0.052, cz]}>
        {pillarCapColor
          ? <meshStandardMaterial color={pillarCapColor} roughness={0.78} metalness={0} />
          : <primitive object={M.pillarCap} attach="material" />}
      </mesh>
      <mesh geometry={G.pillarFinial} material={M.pillarFinial} position={[cx, ph + 0.104 + 0.14, cz]} />
    </group>
  );
});

// ─── Gate leaf ────────────────────────────────────────────────────────────────
const GateLeaf = memo(function GateLeaf({
  hingeX, cz, leafWidth, openDir, gateColor, gateMetal,
}: {
  hingeX: number; cz: number; leafWidth: number; openDir: 1 | -1;
  gateColor?: string; gateMetal?: number;
}) {
  const h = 1.52, nBars = 6, panelW = leafWidth - 0.08, openAngle = openDir * 1.92;
  const topRailGeo  = useMemo(() => new THREE.BoxGeometry(panelW, 0.075, 0.048), [panelW]);
  const midRailGeo  = useMemo(() => new THREE.BoxGeometry(panelW, 0.056, 0.044), [panelW]);
  const barGeo      = useMemo(() => new THREE.BoxGeometry(0.044, h * 0.92, 0.038), []);
  const hingeOrnGeo = useMemo(() => new THREE.BoxGeometry(0.09, 0.09, 0.06), []);
  const barXs = useMemo(
    () => Array.from({ length: nBars }, (_, i) => -panelW / 2 + (panelW / (nBars - 1)) * i),
    [panelW, nBars],
  );

  const styleMat = useMemo(
    () => gateColor
      ? new THREE.MeshStandardMaterial({ color: gateColor, roughness: 0.50, metalness: gateMetal ?? 0.75 })
      : null,
    [gateColor, gateMetal],
  );

  const railMat = styleMat ?? M.gateIron;
  const barMat  = styleMat ?? M.gateBar;
  const hingeMat = styleMat ?? M.gateHinge;

  return (
    <group position={[hingeX, 0, cz]} rotation={[0, openAngle, 0]}>
      <group position={[openDir * leafWidth / 2, 0, 0]}>
        <mesh geometry={topRailGeo}  material={railMat} position={[0, h - 0.07, 0]}  castShadow />
        <mesh geometry={midRailGeo}  material={railMat} position={[0, h * 0.58, 0]}  castShadow />
        <mesh geometry={topRailGeo}  material={railMat} position={[0, 0.12, 0]}       castShadow />
        {barXs.map((bx, i) => (
          <mesh key={i} geometry={barGeo} material={barMat} position={[bx, h / 2, 0]} castShadow />
        ))}
        <mesh
          geometry={hingeOrnGeo}
          material={hingeMat}
          position={[openDir * -(panelW / 2 - 0.06), h - 0.18, -0.032]}
          castShadow
        />
      </group>
    </group>
  );
});

// ─── Lamp post ────────────────────────────────────────────────────────────────
export const LampPost = memo(function LampPost({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={G.lampBase}    material={M.lampBase} position={[0, 0.13, 0]} receiveShadow castShadow />
      <mesh geometry={G.lampPost}    material={M.lampIron} position={[0, 1.64, 0]} castShadow />
      <mesh geometry={G.lampNeck}    material={M.lampIron} position={[0, 2.96, 0]} castShadow />
      <mesh geometry={G.lampArm}     material={M.lampIron} position={[0.30, 3.00, 0]} rotation={[0, 0, Math.PI * 0.08]} castShadow />
      <mesh geometry={G.lampHouse}   material={M.lampIron} position={[0.62, 2.98, 0]} castShadow />
      <mesh geometry={G.lampGlassBox} material={M.lampGlass} position={[0.62, 2.98, 0]} />
    </group>
  );
});

// ─── Hedge shrub ──────────────────────────────────────────────────────────────
export const Shrub = memo(function Shrub({
  position, scale = 1, rotation = 0,
}: { position: V3; scale?: number; rotation?: number }) {
  const s = scale;
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={[s, s, s]}>
      <mesh geometry={G.shrubMain} material={M.shrubMid}   position={[0, 0.36, 0]} castShadow receiveShadow />
      <mesh geometry={G.shrubMed}  material={M.shrubDark}  position={[0.24, 0.40, 0.14]} castShadow />
      <mesh geometry={G.shrubSm}   material={M.shrubLight} position={[-0.18, 0.52, 0.10]} castShadow />
    </group>
  );
});

// ─── Flower bed ───────────────────────────────────────────────────────────────
export const FlowerBed = memo(function FlowerBed({
  position, width = 1.2, depth = 0.6,
}: { position: V3; width?: number; depth?: number }) {
  const [px, , pz] = position;
  const h = 0.28;
  const cols = Math.max(1, Math.floor(width / 0.22));
  const rows = Math.max(1, Math.floor(depth / 0.22));

  const { edgeGeo, soilGeo, flowers } = useMemo(() => {
    const edgeGeo = new THREE.BoxGeometry(width, h, depth);
    const soilGeo = new THREE.BoxGeometry(width - 0.07, h - 0.06, depth - 0.07);
    const fl: Array<{ x: number; z: number; matIdx: number; r: number; geo: THREE.SphereGeometry }> = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const jx = Math.sin(c * 3.7 + r * 1.3) * 0.055;
        const jz = Math.cos(c * 2.1 + r * 4.9) * 0.055;
        const fR = 0.058 + Math.abs(Math.sin(c * r + 1.2)) * 0.038;
        fl.push({
          x: -width / 2 + 0.11 + (c + 0.5) * (width / cols) + jx,
          z: -depth / 2 + 0.11 + (r + 0.5) * (depth / rows) + jz,
          matIdx: (c * rows + r) % FLOWER_MATS.length,
          r: fR,
          geo: new THREE.SphereGeometry(fR, 5, 4),
        });
      }
    }
    return { edgeGeo, soilGeo, flowers: fl };
  }, [width, depth, cols, rows]);

  return (
    <group position={[px, 0, pz]}>
      <mesh geometry={edgeGeo} material={M.bedEdge} position={[0, h / 2, 0]} receiveShadow />
      <mesh geometry={soilGeo} material={M.bedSoil} position={[0, h * 0.52, 0]} />
      {flowers.map((f, i) => (
        <mesh key={i} geometry={f.geo} material={FLOWER_MATS[f.matIdx]} position={[f.x, h + f.r, f.z]} castShadow />
      ))}
    </group>
  );
});

// ─── Planter box ──────────────────────────────────────────────────────────────
export const PlanterBox = memo(function PlanterBox({
  position, width = 0.52, depth = 0.52,
}: { position: V3; width?: number; depth?: number }) {
  const [px, , pz] = position;
  const h = 0.46;
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(width, h, depth), [width, depth]);
  const rimGeo  = useMemo(() => new THREE.BoxGeometry(width + 0.05, 0.056, depth + 0.05), [width, depth]);
  const soilGeo = useMemo(() => new THREE.BoxGeometry(width - 0.08, 0.02, depth - 0.08), [width, depth]);
  return (
    <group position={[px, 0, pz]}>
      <mesh geometry={bodyGeo}         material={M.planterFace} position={[0, h / 2, 0]} castShadow receiveShadow />
      <mesh geometry={rimGeo}          material={M.planterCap}  position={[0, h + 0.028, 0]} />
      <mesh geometry={soilGeo}         material={M.soil}        position={[0, h + 0.04, 0]} />
      <mesh geometry={G.planterBall}   material={M.bush1}       position={[0, h + 0.13, 0]} castShadow />
      <mesh geometry={G.planterBall2}  material={M.bush2}       position={[0.09, h + 0.21, 0.06]} castShadow />
    </group>
  );
});

// ─── Walkway paving slab strip ────────────────────────────────────────────────
const WalkwayPath = memo(function WalkwayPath({
  cx, startZ, endZ, width = 1.40,
}: { cx: number; startZ: number; endZ: number; width?: number }) {
  const slabLen = 0.58, gap = 0.09, step = slabLen + gap;
  const count = Math.max(0, Math.floor((endZ - startZ) / step));
  // Shared geometry for this width (usually 1.40 always)
  const slabGeo = useMemo(
    () => width === 1.40 ? G.walkSlab : new THREE.BoxGeometry(width, 0.044, slabLen),
    [width],
  );
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const sz = startZ + i * step + slabLen / 2;
        return (
          <mesh
            key={i}
            geometry={slabGeo}
            material={i % 2 === 0 ? M.walkSlabA : M.walkSlabB}
            position={[cx, 0.022, sz]}
            receiveShadow
          />
        );
      })}
    </>
  );
});

// ─── Driveway surface panel ───────────────────────────────────────────────────
const DrivewaySurface = memo(function DrivewaySurface({
  cx, cz, width, depth,
}: { cx: number; cz: number; width: number; depth: number }) {
  const geo = useMemo(() => new THREE.BoxGeometry(width, 0.024, depth), [width, depth]);
  return <mesh geometry={geo} material={M.driveStone} position={[cx, 0.012, cz]} receiveShadow />;
});

// ════════════════════════════════════════════════════════════════════════════════
// ── PlotLandscape — full-plot composition with batched LOD ────────────────────
// ════════════════════════════════════════════════════════════════════════════════
export const PlotLandscape = memo(function PlotLandscape({
  plotWidth: pw, plotDepth: pd, landscapeStyle,
}: { plotWidth: number; plotDepth: number; landscapeStyle?: LandscapeStyle }) {
  const ls = landscapeStyle;
  const WALL_H   = 1.50, WALL_T = 0.22, PILLAR_W = 0.44;
  const GATE_HALF = 1.65, gc = pw / 2;
  const leftPX  = gc - GATE_HALF, rightPX = gc + GATE_HALF;
  const leftWallLen  = Math.max(0.3, leftPX  - PILLAR_W / 2);
  const rightWallLen = Math.max(0.3, pw - (rightPX + PILLAR_W / 2));
  const leftWallCX   = leftWallLen / 2;
  const rightWallCX  = rightPX + PILLAR_W / 2 + rightWallLen / 2;
  const setback = Math.min(pd * 0.28, 5.2);
  const walkCX = gc, walkW = 1.40;
  const walkZ0 = WALL_T + 0.08, walkZ1 = setback - 0.1;
  const driveX0 = WALL_T + 0.30, driveX1 = gc - GATE_HALF + 0.05;
  const driveW  = Math.max(0, driveX1 - driveX0);
  const driveCX = (driveX0 + driveX1) / 2;
  const driveCZ = (walkZ0 + setback) / 2;
  const driveD  = setback - walkZ0;
  const lmpZ1 = walkZ0 + 1.0, lmpZ2 = walkZ1 - 0.8;
  const fbHalf = (leftPX - PILLAR_W / 2) * 0.85;
  const fbW    = Math.max(0.4, fbHalf - 0.4);
  const fbCX_L = fbHalf / 2 + WALL_T * 0.5, fbCX_R = pw - fbCX_L;
  const fbZ = 1.8, rbZ = setback + 0.3;
  const planterZ = setback - 0.45;

  const shrubs: Array<{ pos: V3; scale: number; rot: number }> = useMemo(() => {
    const s: Array<{ pos: V3; scale: number; rot: number }> = [];
    for (let z = 2.2; z < pd - 2.0; z += 2.6) s.push({ pos: [WALL_T + 0.58, 0, z] as V3, scale: 0.78, rot: z * 0.9 });
    for (let z = 2.2; z < pd - 2.0; z += 2.6) s.push({ pos: [pw - WALL_T - 0.58, 0, z] as V3, scale: 0.72, rot: z * 1.1 });
    for (let x = 2.0; x < pw - 2.0; x += 3.0) s.push({ pos: [x, 0, pd - WALL_T - 0.58] as V3, scale: 0.80, rot: x * 0.7 });
    s.push({ pos: [leftPX - 1.0, 0, 1.3] as V3, scale: 0.65, rot: 0.4 });
    s.push({ pos: [rightPX + 1.0, 0, 1.3] as V3, scale: 0.65, rot: 1.8 });
    return s;
  }, [pw, pd]);

  const trees: Array<{ pos: V3; rot: number; scale: number }> = useMemo(() => [
    { pos: [1.6,       0, pd - 2.0] as V3, rot: 0.3,  scale: 1.0  },
    { pos: [pw - 1.6,  0, pd - 2.0] as V3, rot: 1.4,  scale: 1.0  },
    { pos: [pw * 0.50, 0, pd - 2.5] as V3, rot: 0.9,  scale: 0.90 },
    { pos: [1.4,       0, pd * 0.54] as V3, rot: 0.5,  scale: 0.82 },
    { pos: [pw - 1.4,  0, pd * 0.54] as V3, rot: 1.2,  scale: 0.82 },
  ], [pw, pd]);

  const smallTrees: Array<{ pos: V3; rot: number }> = useMemo(() => {
    const st: Array<{ pos: V3; rot: number }> = [];
    const rearZ = pd - 1.0;
    if (pw > 7) {
      st.push({ pos: [pw * 0.25, 0, rearZ] as V3, rot: 2.1 });
      st.push({ pos: [pw * 0.75, 0, rearZ] as V3, rot: 0.7 });
    }
    const sideStep = Math.max(3.5, pd / 3);
    for (let z = setback + sideStep; z < pd - 1.5; z += sideStep) {
      if (z < pd - 1.5) {
        st.push({ pos: [WALL_T + 0.9, 0, z] as V3, rot: z * 0.8 });
        st.push({ pos: [pw - WALL_T - 0.9, 0, z] as V3, rot: z * 0.5 });
      }
    }
    return st;
  }, [pw, pd, setback]);

  // ─── Batched LOD refs ───────────────────────────────────────────────────────
  // Single useFrame per PlotLandscape (instead of one per Tree) updates all
  // high/low refs based on camera distance.
  const treeHighRefs   = useRef<Array<THREE.Group | null>>(Array(trees.length).fill(null));
  const treeLowRefs    = useRef<Array<THREE.Group | null>>(Array(trees.length).fill(null));
  const streeHighRefs  = useRef<Array<THREE.Group | null>>(Array(smallTrees.length).fill(null));
  const streeLowRefs   = useRef<Array<THREE.Group | null>>(Array(smallTrees.length).fill(null));

  const treeVecs  = useMemo(() => trees.map(t => new THREE.Vector3(...t.pos)), [trees]);
  const streeVecs = useMemo(() => smallTrees.map(t => new THREE.Vector3(...t.pos)), [smallTrees]);

  const { camera, invalidate } = useThree();

  useFrame(() => {
    let changed = false;
    treeVecs.forEach((v, i) => {
      const near = camera.position.distanceTo(v) < TREE_LOD_NEAR;
      const h = treeHighRefs.current[i], l = treeLowRefs.current[i];
      if (h && l && h.visible !== near) { h.visible = near; l.visible = !near; changed = true; }
    });
    streeVecs.forEach((v, i) => {
      const near = camera.position.distanceTo(v) < STREE_LOD_NEAR;
      const h = streeHighRefs.current[i], l = streeLowRefs.current[i];
      if (h && l && h.visible !== near) { h.visible = near; l.visible = !near; changed = true; }
    });
    if (changed) invalidate();
  });

  const showLamps   = ls?.showLamps   ?? true;
  const showFlowers = ls?.showFlowers ?? true;
  const showPlanters = ls?.showPlanters ?? true;
  const vegDensity  = ls?.vegDensity  ?? 1.0;

  // Filter trees/shrubs based on density
  const activeShrubs = useMemo(
    () => vegDensity >= 1.0 ? shrubs : shrubs.filter((_, i) => i % Math.ceil(1 / vegDensity) === 0),
    [shrubs, vegDensity],
  );
  const activeTrees = useMemo(
    () => vegDensity >= 0.8 ? trees : trees.slice(0, Math.max(2, Math.ceil(trees.length * vegDensity))),
    [trees, vegDensity],
  );
  const activeSmallTrees = useMemo(
    () => vegDensity >= 0.8 ? smallTrees : smallTrees.slice(0, Math.max(1, Math.ceil(smallTrees.length * vegDensity))),
    [smallTrees, vegDensity],
  );

  return (
    <>
      {/* ── Boundary walls ── */}
      {leftWallLen > 0.4  && (
        <WallPanel cx={leftWallCX}  cz={WALL_T / 2} length={leftWallLen}  axis="x" height={WALL_H}
          wallColor={ls?.wallColor} copingColor={ls?.wallCopingColor} />
      )}
      {rightWallLen > 0.4 && (
        <WallPanel cx={rightWallCX} cz={WALL_T / 2} length={rightWallLen} axis="x" height={WALL_H}
          wallColor={ls?.wallColor} copingColor={ls?.wallCopingColor} />
      )}
      <WallPanel cx={WALL_T / 2}      cz={pd / 2}          length={pd} axis="z" height={WALL_H}
        wallColor={ls?.wallColor} copingColor={ls?.wallCopingColor} />
      <WallPanel cx={pw - WALL_T / 2} cz={pd / 2}          length={pd} axis="z" height={WALL_H}
        wallColor={ls?.wallColor} copingColor={ls?.wallCopingColor} />
      <WallPanel cx={pw / 2}          cz={pd - WALL_T / 2} length={pw} axis="x" height={WALL_H}
        wallColor={ls?.wallColor} copingColor={ls?.wallCopingColor} />

      {/* ── Gate ── */}
      <GatePillar cx={leftPX}  cz={WALL_T / 2}
        pillarColor={ls?.pillarColor} pillarCapColor={ls?.pillarCapColor} />
      <GatePillar cx={rightPX} cz={WALL_T / 2}
        pillarColor={ls?.pillarColor} pillarCapColor={ls?.pillarCapColor} />
      <GateLeaf hingeX={leftPX  + PILLAR_W / 2} cz={WALL_T / 2}
        leafWidth={GATE_HALF - PILLAR_W / 2 - 0.06} openDir={-1}
        gateColor={ls?.gateColor} gateMetal={ls?.gateMetal} />
      <GateLeaf hingeX={rightPX - PILLAR_W / 2} cz={WALL_T / 2}
        leafWidth={GATE_HALF - PILLAR_W / 2 - 0.06} openDir={1}
        gateColor={ls?.gateColor} gateMetal={ls?.gateMetal} />

      {/* ── Driveway + walkway ── */}
      {driveW > 0.5 && <DrivewaySurface cx={driveCX} cz={driveCZ} width={driveW} depth={driveD} />}
      <WalkwayPath cx={walkCX} startZ={walkZ0} endZ={walkZ1} width={walkW} />

      {/* ── Lamp posts (style-conditional) ── */}
      {showLamps && (
        <>
          <LampPost position={[walkCX - walkW * 0.80, 0, lmpZ1]} />
          <LampPost position={[walkCX + walkW * 0.80, 0, lmpZ1]} rotation={Math.PI} />
          {walkZ1 - lmpZ1 > 2.5 && (
            <>
              <LampPost position={[walkCX - walkW * 0.80, 0, lmpZ2]} />
              <LampPost position={[walkCX + walkW * 0.80, 0, lmpZ2]} rotation={Math.PI} />
            </>
          )}
        </>
      )}

      {/* ── Flower beds (style-conditional) ── */}
      {showFlowers && fbW > 0.4 && (
        <>
          <FlowerBed position={[fbCX_L, 0, fbZ]} width={fbW} depth={0.68} />
          <FlowerBed position={[fbCX_R, 0, fbZ]} width={fbW} depth={0.68} />
        </>
      )}
      {showFlowers && (
        <>
          <FlowerBed position={[walkCX - walkW * 0.85 - 0.50, 0, rbZ]} width={1.0} depth={0.55} />
          <FlowerBed position={[walkCX + walkW * 0.85 + 0.50, 0, rbZ]} width={1.0} depth={0.55} />
        </>
      )}

      {/* ── Planter boxes (style-conditional) ── */}
      {showPlanters && (
        <>
          <PlanterBox position={[walkCX - 1.10, 0, planterZ]} />
          <PlanterBox position={[walkCX + 1.10, 0, planterZ]} />
        </>
      )}

      {/* ── Shrubs (density-controlled) ── */}
      {activeShrubs.map((s, i) => <Shrub key={i} position={s.pos} scale={s.scale} rotation={s.rot} />)}

      {/* ── Trees (LOD managed by single useFrame above) ── */}
      {activeTrees.map((t, i) => (
        <Tree
          key={i}
          position={t.pos}
          rotation={t.rot}
          scale={t.scale}
          highRef={el => { treeHighRefs.current[i] = el; }}
          lowRef={el  => { treeLowRefs.current[i]  = el; }}
        />
      ))}

      {/* ── Small trees (density-controlled) ── */}
      {activeSmallTrees.map((t, i) => (
        <SmallTree
          key={i}
          position={t.pos}
          rotation={t.rot}
          highRef={el => { streeHighRefs.current[i] = el; }}
          lowRef={el  => { streeLowRefs.current[i]  = el; }}
        />
      ))}
    </>
  );
});
