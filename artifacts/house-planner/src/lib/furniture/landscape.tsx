// ─── Premium Landscape Elements ──────────────────────────────────────────────
// All dimensions in metres. Y=0 = ground level.
// Plot coordinate system: X = west→east, Z = south (street) → north (back).

import { useRef, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type V3 = [number, number, number];

const C = {
  // ── Tree / plant ──────────────────────────────────────────────────────────
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
  // ── Boundary wall ──────────────────────────────────────────────────────────
  wallPlaster:   "#C6BDB2",
  wallCoping:    "#D8D0C8",
  pillarFace:    "#BAB2A8",
  pillarCap:     "#E0D8CE",
  // ── Gate (iron + brass trim) ───────────────────────────────────────────────
  gateIron:      "#28283A",
  gateBar:       "#323248",
  gateHinge:     "#8A7A44",
  // ── Driveway & paths ───────────────────────────────────────────────────────
  driveStone:    "#B4ADA4",
  walkSlab:      "#D0C8BA",
  walkSlabAlt:   "#C4BDB0",
  // ── Planting ───────────────────────────────────────────────────────────────
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
  // ── Lamp post ──────────────────────────────────────────────────────────────
  lampIron:      "#222232",
  lampBase:      "#2C2C3C",
  lampGlass:     "#FFF8C0",
  // ── Planter box ────────────────────────────────────────────────────────────
  planterFace:   "#A8A098",
  planterCap:    "#C0BAB0",
};

// ═══ EXISTING ELEMENTS (unchanged API for backward compatibility) ═════════════

// ── LOD distance threshold (metres from camera) ────────────────────────────
const TREE_LOD_NEAR = 22;
const SMALL_TREE_LOD_NEAR = 18;

// ── Tree — LOD: high detail when camera is close, billboard sphere when far ──
export function Tree({
  position, rotation = 0, scale = 1,
}: { position: V3; rotation?: number; scale?: number }) {
  const s = scale;
  const highRef = useRef<THREE.Group>(null);
  const lowRef  = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const posVec = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position[0], position[1], position[2]],
  );

  useFrame(() => {
    const near = camera.position.distanceTo(posVec) < TREE_LOD_NEAR;
    if (highRef.current) highRef.current.visible = near;
    if (lowRef.current)  lowRef.current.visible  = !near;
  });

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={[s, s, s]}>
      {/* ── High detail (near camera) ── */}
      <group ref={highRef}>
        {/* Root flare */}
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[0.16, 0.22, 0.24, 7]} />
          <meshStandardMaterial color={C.barkDark} roughness={0.94} />
        </mesh>
        {/* Lower trunk */}
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.09, 0.14, 1.80, 7]} />
          <meshStandardMaterial color={C.bark} roughness={0.91} />
        </mesh>
        {/* Upper trunk */}
        <mesh position={[0, 2.10, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.09, 0.80, 6]} />
          <meshStandardMaterial color={C.bark} roughness={0.89} />
        </mesh>
        {/* Base canopy — large, deep green */}
        <mesh position={[0, 2.65, 0]} castShadow>
          <sphereGeometry args={[1.20, 8, 6]} />
          <meshStandardMaterial color={C.canopy2} roughness={0.93} />
        </mesh>
        {/* Mid canopy cluster — offset left-forward */}
        <mesh position={[0.30, 3.10, 0.20]} castShadow>
          <sphereGeometry args={[0.92, 7, 5]} />
          <meshStandardMaterial color={C.canopy1} roughness={0.91} />
        </mesh>
        {/* Top crown */}
        <mesh position={[-0.18, 3.65, -0.12]} castShadow>
          <sphereGeometry args={[0.68, 6, 5]} />
          <meshStandardMaterial color={C.canopy3} roughness={0.89} />
        </mesh>
        {/* Light highlight cluster */}
        <mesh position={[0.10, 3.90, 0.08]} castShadow>
          <sphereGeometry args={[0.42, 5, 4]} />
          <meshStandardMaterial color={C.canopy4} roughness={0.87} />
        </mesh>
      </group>

      {/* ── Low detail (far — single trunk + single sphere) ── */}
      <group ref={lowRef}>
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.10, 0.16, 2.10, 5]} />
          <meshStandardMaterial color={C.bark} roughness={0.91} />
        </mesh>
        <mesh position={[0, 2.90, 0]} castShadow>
          <sphereGeometry args={[1.30, 6, 4]} />
          <meshStandardMaterial color={C.canopy2} roughness={0.93} />
        </mesh>
      </group>
    </group>
  );
}

// ── Small Tree — LOD ──────────────────────────────────────────────────────────
export function SmallTree({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const highRef = useRef<THREE.Group>(null);
  const lowRef  = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const posVec = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position[0], position[1], position[2]],
  );

  useFrame(() => {
    const near = camera.position.distanceTo(posVec) < SMALL_TREE_LOD_NEAR;
    if (highRef.current) highRef.current.visible = near;
    if (lowRef.current)  lowRef.current.visible  = !near;
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── High detail ── */}
      <group ref={highRef}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.085, 1.10, 7]} />
          <meshStandardMaterial color={C.bark} roughness={0.92} />
        </mesh>
        <mesh position={[0, 1.40, 0]} castShadow>
          <sphereGeometry args={[0.68, 7, 5]} />
          <meshStandardMaterial color={C.canopy2} roughness={0.92} />
        </mesh>
        <mesh position={[0.14, 1.75, 0.10]} castShadow>
          <sphereGeometry args={[0.50, 6, 4]} />
          <meshStandardMaterial color={C.canopy1} roughness={0.90} />
        </mesh>
        <mesh position={[-0.10, 1.95, -0.08]} castShadow>
          <sphereGeometry args={[0.32, 5, 4]} />
          <meshStandardMaterial color={C.canopy3} roughness={0.88} />
        </mesh>
      </group>

      {/* ── Low detail ── */}
      <group ref={lowRef}>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.06, 0.09, 1.10, 5]} />
          <meshStandardMaterial color={C.bark} roughness={0.92} />
        </mesh>
        <mesh position={[0, 1.58, 0]} castShadow>
          <sphereGeometry args={[0.76, 5, 4]} />
          <meshStandardMaterial color={C.canopy2} roughness={0.92} />
        </mesh>
      </group>
    </group>
  );
}

// ── Potted Plant ──────────────────────────────────────────────────────────────
export function Plant({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.10, 0.30, 8]} />
        <meshStandardMaterial color={C.potTerra} roughness={0.80} />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.155, 0.14, 0.025, 8]} />
        <meshStandardMaterial color={C.potRim} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.015, 8]} />
        <meshStandardMaterial color={C.soil} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.60, 0]} castShadow>
        <sphereGeometry args={[0.28, 6, 4]} />
        <meshStandardMaterial color={C.bush1} roughness={0.90} />
      </mesh>
      <mesh position={[0.08, 0.70, 0.06]} castShadow>
        <sphereGeometry args={[0.18, 5, 4]} />
        <meshStandardMaterial color={C.bush2} roughness={0.88} />
      </mesh>
    </group>
  );
}

// ── Large Decorative Plant ────────────────────────────────────────────────────
export function LargePlant({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.16, 0.46, 8]} />
        <meshStandardMaterial color={C.potTerra} roughness={0.80} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.235, 0.22, 0.030, 8]} />
        <meshStandardMaterial color={C.potRim} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.49, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.020, 8]} />
        <meshStandardMaterial color={C.soil} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.28, 5]} />
        <meshStandardMaterial color={C.bark} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.40, 7, 5]} />
        <meshStandardMaterial color={C.bush1} roughness={0.90} />
      </mesh>
      <mesh position={[0.18, 1.12, 0.14]} castShadow>
        <sphereGeometry args={[0.28, 6, 4]} />
        <meshStandardMaterial color={C.bush2} roughness={0.88} />
      </mesh>
      <mesh position={[-0.14, 1.08, -0.10]} castShadow>
        <sphereGeometry args={[0.24, 5, 4]} />
        <meshStandardMaterial color={C.canopy3} roughness={0.88} />
      </mesh>
    </group>
  );
}

// ═══ NEW PREMIUM ELEMENTS ════════════════════════════════════════════════════

// ── Wall panel with coping strip ─────────────────────────────────────────────
function WallPanel({
  cx, cz, length, axis, height = 1.50, thick = 0.22,
}: {
  cx: number; cz: number; length: number; axis: "x" | "z";
  height?: number; thick?: number;
}) {
  const [bw, bd] = axis === "x" ? [length, thick] : [thick, length];
  const cw = bw + 0.06;
  const cd = bd + 0.06;
  return (
    <group>
      <mesh position={[cx, height / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[bw, height, bd]} />
        <meshStandardMaterial color={C.wallPlaster} roughness={0.88} metalness={0} />
      </mesh>
      {/* Coping strip */}
      <mesh position={[cx, height + 0.048, cz]}>
        <boxGeometry args={[cw, 0.096, cd]} />
        <meshStandardMaterial color={C.wallCoping} roughness={0.80} metalness={0} />
      </mesh>
    </group>
  );
}

// ── Gate pillar with cap and finial ──────────────────────────────────────────
function GatePillar({ cx, cz }: { cx: number; cz: number }) {
  const pw = 0.42;
  const ph = 2.10;
  return (
    <group>
      <mesh position={[cx, ph / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[pw, ph, pw]} />
        <meshStandardMaterial color={C.pillarFace} roughness={0.84} metalness={0} />
      </mesh>
      {/* Wide cap step */}
      <mesh position={[cx, ph + 0.052, cz]}>
        <boxGeometry args={[pw + 0.12, 0.104, pw + 0.12]} />
        <meshStandardMaterial color={C.pillarCap} roughness={0.78} metalness={0} />
      </mesh>
      {/* Pyramid finial */}
      <mesh position={[cx, ph + 0.104 + 0.14, cz]}>
        <cylinderGeometry args={[0.025, 0.16, 0.28, 4]} />
        <meshStandardMaterial color={C.pillarCap} roughness={0.72} metalness={0} />
      </mesh>
    </group>
  );
}

// ── Gate leaf (one panel, hinged open) ────────────────────────────────────────
// The leaf is hinged at `hingeX`, rotated outward to ~110° "open" position.
function GateLeaf({
  hingeX, cz, leafWidth, openDir,
}: {
  hingeX: number; cz: number; leafWidth: number; openDir: 1 | -1;
}) {
  const h = 1.52;
  const nBars = 6;
  const panelW = leafWidth - 0.08;
  const openAngle = openDir * 1.92; // ~110° open

  // Bar positions along the panel width
  const barXs = Array.from({ length: nBars }, (_, i) =>
    -panelW / 2 + (panelW / (nBars - 1)) * i
  );

  return (
    // Hinge group — rotate around pillar face
    <group position={[hingeX, 0, cz]} rotation={[0, openAngle, 0]}>
      {/* Translate so hinge is at the pillar face */}
      <group position={[openDir * leafWidth / 2, 0, 0]}>
        {/* Top rail */}
        <mesh position={[0, h - 0.07, 0]} castShadow>
          <boxGeometry args={[panelW, 0.075, 0.048]} />
          <meshStandardMaterial color={C.gateIron} roughness={0.50} metalness={0.75} />
        </mesh>
        {/* Mid rail */}
        <mesh position={[0, h * 0.58, 0]} castShadow>
          <boxGeometry args={[panelW, 0.056, 0.044]} />
          <meshStandardMaterial color={C.gateIron} roughness={0.52} metalness={0.73} />
        </mesh>
        {/* Bottom rail */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[panelW, 0.075, 0.048]} />
          <meshStandardMaterial color={C.gateIron} roughness={0.50} metalness={0.75} />
        </mesh>
        {/* Vertical bars */}
        {barXs.map((bx, i) => (
          <mesh key={i} position={[bx, h / 2, 0]} castShadow>
            <boxGeometry args={[0.044, h * 0.92, 0.038]} />
            <meshStandardMaterial color={C.gateBar} roughness={0.48} metalness={0.76} />
          </mesh>
        ))}
        {/* Hinge ornament */}
        <mesh
          position={[openDir * -(panelW / 2 - 0.06), h - 0.18, -0.032]}
          castShadow
        >
          <boxGeometry args={[0.09, 0.09, 0.06]} />
          <meshStandardMaterial color={C.gateHinge} roughness={0.36} metalness={0.82} />
        </mesh>
      </group>
    </group>
  );
}

// ── Lamp post ─────────────────────────────────────────────────────────────────
export function LampPost({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Base plinth */}
      <mesh position={[0, 0.13, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.30, 0.26, 0.30]} />
        <meshStandardMaterial color={C.lampBase} roughness={0.70} metalness={0.35} />
      </mesh>
      {/* Tapered post */}
      <mesh position={[0, 1.64, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.068, 2.82, 8]} />
        <meshStandardMaterial color={C.lampIron} roughness={0.56} metalness={0.58} />
      </mesh>
      {/* Curved arm base (neck) */}
      <mesh position={[0, 2.96, 0]} castShadow>
        <cylinderGeometry args={[0.030, 0.042, 0.20, 7]} />
        <meshStandardMaterial color={C.lampIron} roughness={0.55} metalness={0.60} />
      </mesh>
      {/* Horizontal arm */}
      <mesh
        position={[0.30, 3.00, 0]}
        rotation={[0, 0, Math.PI * 0.08]}
        castShadow
      >
        <cylinderGeometry args={[0.022, 0.022, 0.64, 6]} />
        <meshStandardMaterial color={C.lampIron} roughness={0.55} metalness={0.60} />
      </mesh>
      {/* Lantern housing */}
      <mesh position={[0.62, 2.98, 0]} castShadow>
        <boxGeometry args={[0.20, 0.24, 0.20]} />
        <meshStandardMaterial color={C.lampIron} roughness={0.52} metalness={0.62} />
      </mesh>
      {/* Glowing glass */}
      <mesh position={[0.62, 2.98, 0]}>
        <boxGeometry args={[0.13, 0.17, 0.13]} />
        <meshStandardMaterial
          color={C.lampGlass}
          roughness={0.08}
          metalness={0}
          emissive={C.lampGlass}
          emissiveIntensity={0.72}
          transparent
          opacity={0.90}
        />
      </mesh>
    </group>
  );
}

// ── Hedge shrub ───────────────────────────────────────────────────────────────
export function Shrub({
  position, scale = 1, rotation = 0,
}: { position: V3; scale?: number; rotation?: number }) {
  const s = scale;
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={[s, s, s]}>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.42, 7, 5]} />
        <meshStandardMaterial color={C.shrubMid} roughness={0.94} metalness={0} />
      </mesh>
      <mesh position={[0.24, 0.40, 0.14]} castShadow>
        <sphereGeometry args={[0.28, 6, 4]} />
        <meshStandardMaterial color={C.shrubDark} roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[-0.18, 0.52, 0.10]} castShadow>
        <sphereGeometry args={[0.22, 5, 4]} />
        <meshStandardMaterial color={C.shrubLight} roughness={0.92} metalness={0} />
      </mesh>
    </group>
  );
}

// ── Flower bed ────────────────────────────────────────────────────────────────
export function FlowerBed({
  position, width = 1.2, depth = 0.6,
}: { position: V3; width?: number; depth?: number }) {
  const [px, , pz] = position;
  const h = 0.28;
  const palette = [C.flowerRed, C.flowerPink, C.flowerYellow, C.flowerWhite, C.flowerLav];
  const cols = Math.max(1, Math.floor(width / 0.22));
  const rows = Math.max(1, Math.floor(depth / 0.22));
  const flowers: Array<{ x: number; z: number; color: string; r: number }> = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const jx = Math.sin(c * 3.7 + r * 1.3) * 0.055;
      const jz = Math.cos(c * 2.1 + r * 4.9) * 0.055;
      flowers.push({
        x: -width / 2 + 0.11 + (c + 0.5) * (width / cols) + jx,
        z: -depth / 2 + 0.11 + (r + 0.5) * (depth / rows) + jz,
        color: palette[(c * rows + r) % palette.length],
        r: 0.058 + Math.abs(Math.sin(c * r + 1.2)) * 0.038,
      });
    }
  }

  return (
    <group position={[px, 0, pz]}>
      {/* Sandstone edge surround */}
      <mesh position={[0, h / 2, 0]} receiveShadow>
        <boxGeometry args={[width, h, depth]} />
        <meshStandardMaterial color={C.bedEdge} roughness={0.84} metalness={0} />
      </mesh>
      {/* Soil interior */}
      <mesh position={[0, h * 0.52, 0]}>
        <boxGeometry args={[width - 0.07, h - 0.06, depth - 0.07]} />
        <meshStandardMaterial color={C.bedSoil} roughness={0.97} metalness={0} />
      </mesh>
      {/* Flowers */}
      {flowers.map((f, i) => (
        <mesh key={i} position={[f.x, h + f.r, f.z]} castShadow>
          <sphereGeometry args={[f.r, 5, 4]} />
          <meshStandardMaterial
            color={f.color} roughness={0.78} metalness={0}
            emissive={f.color} emissiveIntensity={0.06}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Planter box ───────────────────────────────────────────────────────────────
export function PlanterBox({
  position, width = 0.52, depth = 0.52,
}: { position: V3; width?: number; depth?: number }) {
  const [px, , pz] = position;
  const h = 0.46;
  return (
    <group position={[px, 0, pz]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, h, depth]} />
        <meshStandardMaterial color={C.planterFace} roughness={0.82} metalness={0} />
      </mesh>
      {/* Rim cap */}
      <mesh position={[0, h + 0.028, 0]}>
        <boxGeometry args={[width + 0.05, 0.056, depth + 0.05]} />
        <meshStandardMaterial color={C.planterCap} roughness={0.76} metalness={0} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, h + 0.04, 0]}>
        <boxGeometry args={[width - 0.08, 0.02, depth - 0.08]} />
        <meshStandardMaterial color={C.soil} roughness={0.97} metalness={0} />
      </mesh>
      {/* Clipped ball plant */}
      <mesh position={[0, h + 0.13, 0]} castShadow>
        <sphereGeometry args={[0.19, 6, 5]} />
        <meshStandardMaterial color={C.bush1} roughness={0.90} metalness={0} />
      </mesh>
      <mesh position={[0.09, h + 0.21, 0.06]} castShadow>
        <sphereGeometry args={[0.12, 5, 4]} />
        <meshStandardMaterial color={C.bush2} roughness={0.88} metalness={0} />
      </mesh>
    </group>
  );
}

// ── Walkway paving slab strip ─────────────────────────────────────────────────
function WalkwayPath({
  cx, startZ, endZ, width = 1.40,
}: { cx: number; startZ: number; endZ: number; width?: number }) {
  const slabLen = 0.58;
  const gap     = 0.09;
  const step    = slabLen + gap;
  const count   = Math.max(0, Math.floor((endZ - startZ) / step));
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const sz  = startZ + i * step + slabLen / 2;
        const alt = i % 2 === 0;
        return (
          <mesh key={i} position={[cx, 0.022, sz]} receiveShadow>
            <boxGeometry args={[width, 0.044, slabLen]} />
            <meshStandardMaterial
              color={alt ? C.walkSlab : C.walkSlabAlt}
              roughness={0.84}
              metalness={0}
            />
          </mesh>
        );
      })}
    </>
  );
}

// ── Low driveway surface panel ────────────────────────────────────────────────
function DrivewaySurface({
  cx, cz, width, depth,
}: { cx: number; cz: number; width: number; depth: number }) {
  return (
    <mesh position={[cx, 0.012, cz]} receiveShadow>
      <boxGeometry args={[width, 0.024, depth]} />
      <meshStandardMaterial color={C.driveStone} roughness={0.88} metalness={0} />
    </mesh>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ── PlotLandscape — premium full-plot composition ────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════
export function PlotLandscape({
  plotWidth: pw, plotDepth: pd,
}: { plotWidth: number; plotDepth: number }) {
  // ── Constants ──────────────────────────────────────────────────────────────
  const WALL_H    = 1.50;
  const WALL_T    = 0.22;
  const PILLAR_W  = 0.44;
  const GATE_HALF = 1.65;   // half opening = 3.3 m drivable width
  const gc        = pw / 2; // gate centre X

  const leftPX    = gc - GATE_HALF;           // left pillar centre X
  const rightPX   = gc + GATE_HALF;           // right pillar centre X
  const leftWallLen  = Math.max(0.3, leftPX  - PILLAR_W / 2);
  const rightWallLen = Math.max(0.3, pw - (rightPX + PILLAR_W / 2));
  const leftWallCX   = leftWallLen / 2;
  const rightWallCX  = rightPX + PILLAR_W / 2 + rightWallLen / 2;

  // setback from street where building begins
  const setback = Math.min(pd * 0.28, 5.2);

  // ── Walkway ────────────────────────────────────────────────────────────────
  const walkCX  = gc;
  const walkW   = 1.40;
  const walkZ0  = WALL_T + 0.08;
  const walkZ1  = setback - 0.1;

  // ── Driveway (left half of plot front, alongside walkway) ─────────────────
  const driveX0 = WALL_T + 0.30;
  const driveX1 = gc - GATE_HALF + 0.05;  // right edge = left of gate
  const driveW  = Math.max(0, driveX1 - driveX0);
  const driveCX = (driveX0 + driveX1) / 2;
  const driveCZ = (walkZ0 + setback) / 2;
  const driveD  = setback - walkZ0;

  // ── Lamp post positions ───────────────────────────────────────────────────
  const lmpZ1 = walkZ0 + 1.0;
  const lmpZ2 = walkZ1 - 0.8;

  // ── Flower bed positions ──────────────────────────────────────────────────
  const fbHalf = (leftPX - PILLAR_W / 2) * 0.85;
  const fbW    = Math.max(0.4, fbHalf - 0.4);
  const fbCX_L = fbHalf / 2 + WALL_T * 0.5;
  const fbCX_R = pw - fbCX_L;
  const fbZ    = 1.8;

  // ── Additional rear flower beds ───────────────────────────────────────────
  const rbZ    = setback + 0.3;

  // ── Shrub positions (inner boundary face) ─────────────────────────────────
  const shrubs: Array<{ pos: V3; scale: number; rot: number }> = [];
  // Left side wall inner face
  for (let z = 2.2; z < pd - 2.0; z += 2.6) {
    shrubs.push({ pos: [WALL_T + 0.58, 0, z], scale: 0.78, rot: z * 0.9 });
  }
  // Right side wall inner face
  for (let z = 2.2; z < pd - 2.0; z += 2.6) {
    shrubs.push({ pos: [pw - WALL_T - 0.58, 0, z], scale: 0.72, rot: z * 1.1 });
  }
  // Back wall inner face
  for (let x = 2.0; x < pw - 2.0; x += 3.0) {
    shrubs.push({ pos: [x, 0, pd - WALL_T - 0.58], scale: 0.80, rot: x * 0.7 });
  }
  // Flanking gate area (front, between wall and gate) — trimmed topiary
  shrubs.push({ pos: [leftPX - 1.0, 0, 1.3], scale: 0.65, rot: 0.4 });
  shrubs.push({ pos: [rightPX + 1.0, 0, 1.3], scale: 0.65, rot: 1.8 });

  // ── Tree positions (rear + sides — never block front building view) ────────
  const trees: Array<{ pos: V3; rot: number; scale: number }> = [
    { pos: [1.6,      0, pd - 2.0], rot: 0.3,  scale: 1.0 },
    { pos: [pw - 1.6, 0, pd - 2.0], rot: 1.4,  scale: 1.0 },
    { pos: [pw * 0.50, 0, pd - 2.5], rot: 0.9,  scale: 0.90 },
    { pos: [1.4,       0, pd * 0.54], rot: 0.5,  scale: 0.82 },
    { pos: [pw - 1.4,  0, pd * 0.54], rot: 1.2,  scale: 0.82 },
  ];

  // ── Planter boxes at front entrance ───────────────────────────────────────
  const planterZ = setback - 0.45;

  return (
    <>
      {/* ════════════ BOUNDARY WALLS ════════════ */}
      {/* Front left section */}
      {leftWallLen > 0.4 && (
        <WallPanel
          cx={leftWallCX} cz={WALL_T / 2}
          length={leftWallLen} axis="x"
          height={WALL_H}
        />
      )}
      {/* Front right section */}
      {rightWallLen > 0.4 && (
        <WallPanel
          cx={rightWallCX} cz={WALL_T / 2}
          length={rightWallLen} axis="x"
          height={WALL_H}
        />
      )}
      {/* Left side wall */}
      <WallPanel cx={WALL_T / 2} cz={pd / 2} length={pd} axis="z" height={WALL_H} />
      {/* Right side wall */}
      <WallPanel cx={pw - WALL_T / 2} cz={pd / 2} length={pd} axis="z" height={WALL_H} />
      {/* Back wall */}
      <WallPanel cx={pw / 2} cz={pd - WALL_T / 2} length={pw} axis="x" height={WALL_H} />

      {/* ════════════ GATE PILLARS ════════════ */}
      <GatePillar cx={leftPX}  cz={WALL_T / 2} />
      <GatePillar cx={rightPX} cz={WALL_T / 2} />

      {/* ════════════ GATE LEAVES (open inward) ════════════ */}
      {/* Left leaf — hinged at right face of left pillar, swings left */}
      <GateLeaf
        hingeX={leftPX + PILLAR_W / 2}
        cz={WALL_T / 2}
        leafWidth={GATE_HALF - PILLAR_W / 2 - 0.06}
        openDir={-1}
      />
      {/* Right leaf — hinged at left face of right pillar, swings right */}
      <GateLeaf
        hingeX={rightPX - PILLAR_W / 2}
        cz={WALL_T / 2}
        leafWidth={GATE_HALF - PILLAR_W / 2 - 0.06}
        openDir={1}
      />

      {/* ════════════ DRIVEWAY SURFACE ════════════ */}
      {driveW > 0.5 && (
        <DrivewaySurface
          cx={driveCX} cz={driveCZ}
          width={driveW} depth={driveD}
        />
      )}

      {/* ════════════ WALKWAY SLABS ════════════ */}
      <WalkwayPath cx={walkCX} startZ={walkZ0} endZ={walkZ1} width={walkW} />

      {/* ════════════ OUTDOOR LAMP POSTS ════════════ */}
      {/* Entry row — flanking walkway at gate */}
      <LampPost position={[walkCX - walkW * 0.80, 0, lmpZ1]} />
      <LampPost position={[walkCX + walkW * 0.80, 0, lmpZ1]} rotation={Math.PI} />
      {/* Mid row — flanking walkway near building */}
      {walkZ1 - lmpZ1 > 2.5 && (
        <>
          <LampPost position={[walkCX - walkW * 0.80, 0, lmpZ2]} />
          <LampPost position={[walkCX + walkW * 0.80, 0, lmpZ2]} rotation={Math.PI} />
        </>
      )}

      {/* ════════════ FLOWER BEDS ════════════ */}
      {/* Front — flanking gate on both sides */}
      {fbW > 0.4 && (
        <>
          <FlowerBed position={[fbCX_L, 0, fbZ]} width={fbW} depth={0.68} />
          <FlowerBed position={[fbCX_R, 0, fbZ]} width={fbW} depth={0.68} />
        </>
      )}
      {/* Front entrance beds — along walkway sides just before building */}
      <FlowerBed position={[walkCX - walkW * 0.85 - 0.50, 0, rbZ]} width={1.0} depth={0.55} />
      <FlowerBed position={[walkCX + walkW * 0.85 + 0.50, 0, rbZ]} width={1.0} depth={0.55} />

      {/* ════════════ PLANTER BOXES (entrance) ════════════ */}
      <PlanterBox position={[walkCX - 1.10, 0, planterZ]} />
      <PlanterBox position={[walkCX + 1.10, 0, planterZ]} />

      {/* ════════════ SHRUBS ════════════ */}
      {shrubs.map((s, i) => (
        <Shrub key={`sh-${i}`} position={s.pos} scale={s.scale} rotation={s.rot} />
      ))}

      {/* ════════════ TREES ════════════ */}
      {trees.map((t, i) => (
        <Tree key={`tr-${i}`} position={t.pos} rotation={t.rot} scale={t.scale} />
      ))}

      {/* Small ornamental trees flanking gate inside */}
      <SmallTree position={[leftPX - 0.90, 0, 2.2]} rotation={0.6} />
      <SmallTree position={[rightPX + 0.90, 0, 2.2]} rotation={1.9} />
    </>
  );
}
