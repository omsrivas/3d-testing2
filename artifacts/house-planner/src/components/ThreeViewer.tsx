import {
  useRef, useMemo, useState, useEffect, Suspense,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { SceneData, BoxSpec, MeshRole } from "@/lib/geometryEngine3d";
import { FLOOR_TO_FLOOR } from "@/lib/geometryEngine3d/constants";

// ─── Material palette ─────────────────────────────────────────────────────────
const ROLE_COLOR: Record<MeshRole, string> = {
  "exterior-wall":  "#e8dcc8",
  "interior-wall":  "#d4cbb8",
  "floor-slab":     "#c4bcac",
  "roof-slab":      "#b8b0a0",
  "column":         "#a09888",
  "parapet":        "#ddd5c2",
  "balcony-slab":   "#c0b8a8",
  "balcony-railing":"#b8b0a0",
  "stair-tread":    "#cac2b0",
  "door-frame":     "#7a5a30",
  "window-frame":   "#d8d0c0",
  "window-glass":   "#88bbdd",
};
const ROLE_OPACITY: Partial<Record<MeshRole, number>> = { "window-glass": 0.32 };
const ROLE_ROUGHNESS: Partial<Record<MeshRole, number>> = {
  "exterior-wall":0.85,"interior-wall":0.80,"floor-slab":0.90,"roof-slab":0.90,
  "column":0.80,"window-glass":0.04,"window-frame":0.55,"door-frame":0.70,
  "stair-tread":0.80,"parapet":0.85,
};

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
      const totalExtraH = (scene.floors) * FLOOR_TO_FLOOR * 1.4;
      return {
        pos:    new THREE.Vector3(cx + d * 0.85, cy + d * 0.8 + totalExtraH * 0.4, cz + d * 0.85),
        target: new THREE.Vector3(cx, cy + totalExtraH * 0.35, cz),
      };
    }
    case "isolated": {
      const floorMidY = isoFloor * FLOOR_TO_FLOOR + FLOOR_TO_FLOOR * 0.5;
      return {
        pos:    new THREE.Vector3(cx + d * 0.65, floorMidY + d * 0.25, cz + d * 0.55),
        target: new THREE.Vector3(cx, floorMidY, cz),
      };
    }
    default: // iso
      return {
        pos:    new THREE.Vector3(cx + d * 0.70, cy + d * 0.65, cz + d * 0.70),
        target: new THREE.Vector3(cx, cy * 0.35, cz),
      };
  }
}

// ─── Single mesh ─────────────────────────────────────────────────────────────
function SceneMesh({
  spec,
  wireframe,
  dimOpacity,
}: {
  spec: BoxSpec;
  wireframe: boolean;
  dimOpacity?: number;
}) {
  const base   = ROLE_OPACITY[spec.role] ?? 1;
  const opacity = dimOpacity !== undefined ? base * dimOpacity : base;
  const rough  = ROLE_ROUGHNESS[spec.role] ?? 0.75;
  const transp = opacity < 0.99;

  return (
    <mesh
      position={[spec.cx, spec.cy, spec.cz]}
      rotation={[0, spec.ry, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[spec.w, spec.h, spec.d]} />
      <meshStandardMaterial
        color={ROLE_COLOR[spec.role]}
        roughness={rough}
        metalness={0}
        opacity={opacity}
        transparent={transp}
        wireframe={wireframe && !transp}
      />
    </mesh>
  );
}

// ─── Camera controller ────────────────────────────────────────────────────────
// Drives animated transitions between presets while keeping OrbitControls active.
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

  // Kick off animation whenever preset / isoFloor changes
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

// ─── Floor groups with animated explode offset ────────────────────────────────
const EXPLODE_GAP = FLOOR_TO_FLOOR * 1.6; // extra separation per floor in exploded view

function FloorGroups({
  scene,
  preset,
  isoFloor,
  wireframe,
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
}) {
  // Group meshes by floor
  const byFloor = useMemo<Map<number, BoxSpec[]>>(() => {
    const m = new Map<number, BoxSpec[]>();
    for (const spec of scene.meshes) {
      if (!m.has(spec.floor)) m.set(spec.floor, []);
      m.get(spec.floor)!.push(spec);
    }
    return m;
  }, [scene.meshes]);

  // Refs for per-floor Group objects (for direct Y animation)
  const groupRefs = useRef<Record<number, THREE.Group | null>>({});
  const currentExplode = useRef(0);

  useFrame((_, dt) => {
    const want = preset === "exploded" ? EXPLODE_GAP : 0;
    currentExplode.current = THREE.MathUtils.lerp(currentExplode.current, want, dt * 3.5);
    for (const [f, grp] of Object.entries(groupRefs.current)) {
      if (grp) grp.position.y = Number(f) * currentExplode.current;
    }
  });

  // In dollhouse mode hide roof + parapet; in isolated mode dim other floors
  const shouldHideRoof = preset === "dollhouse";

  return (
    <>
      {[...byFloor.entries()].map(([f, meshes]) => {
        const dimmed = preset === "isolated" && f !== isoFloor;
        return (
          <group
            key={f}
            ref={el => { groupRefs.current[f] = el; }}
          >
            {meshes.map(spec => {
              if (shouldHideRoof && (spec.role === "roof-slab" || spec.role === "parapet")) return null;
              return (
                <SceneMesh
                  key={spec.id}
                  spec={spec}
                  wireframe={wireframe}
                  dimOpacity={dimmed ? 0.12 : undefined}
                />
              );
            })}
          </group>
        );
      })}
    </>
  );
}

// ─── Lights ───────────────────────────────────────────────────────────────────
function Lighting({ scene }: { scene: SceneData }) {
  const d = scene.diagonal;
  const [cx, , cz] = scene.center;
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[cx + d * 1.4, d * 1.5, cz - d * 0.8]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={d * 6}
        shadow-camera-left={-d * 1.5}
        shadow-camera-right={d * 1.5}
        shadow-camera-top={d * 1.5}
        shadow-camera-bottom={-d * 1.5}
        shadow-bias={-0.0005}
      />
      <directionalLight
        position={[cx - d * 0.8, d * 0.6, cz + d * 1.2]}
        intensity={0.30}
      />
      <hemisphereLight args={["#7ab0d0", "#2a3820", 0.25]} />
    </>
  );
}

// ─── Ground + Grid ────────────────────────────────────────────────────────────
function Ground({ scene }: { scene: SceneData }) {
  const s = Math.max(scene.plotWidth, scene.plotDepth) * 3;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[scene.plotWidth / 2, -0.002, scene.plotDepth / 2]}
      receiveShadow
    >
      <planeGeometry args={[s, s]} />
      <meshStandardMaterial color="#20300e" roughness={1} />
    </mesh>
  );
}

// ─── Full building scene ──────────────────────────────────────────────────────
function BuildingScene({
  scene,
  preset,
  isoFloor,
  wireframe,
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
}) {
  return (
    <>
      <CameraController preset={preset} scene={scene} isoFloor={isoFloor} />
      <Lighting scene={scene} />
      <FloorGroups
        scene={scene}
        preset={preset}
        isoFloor={isoFloor}
        wireframe={wireframe}
      />
      <Ground scene={scene} />
      {/* Grid */}
      <gridHelper
        args={[
          Math.max(scene.plotWidth, scene.plotDepth) * 3,
          Math.max(scene.plotWidth, scene.plotDepth) * 3,
          "#3a4a28",
          "#2a3820",
        ]}
        position={[scene.plotWidth / 2, 0, scene.plotDepth / 2]}
      />
    </>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function PresetBtn({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded transition-all text-[10px] font-semibold"
      style={{
        background:  active ? "rgba(193,103,42,0.20)" : "rgba(255,255,255,0.04)",
        border:      `1px solid ${active ? "rgba(193,103,42,0.55)" : "rgba(255,255,255,0.08)"}`,
        color:       active ? "#e8905a" : "#8aaa60",
        minWidth: 48,
      }}
    >
      {label}
    </button>
  );
}

// ─── SVG icons (inline, no extra dep) ────────────────────────────────────────
const IconTop = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);
const IconIso = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 9l10-7 10 7v6l-10 7L2 15Z" /><line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="9" x2="22" y2="9" />
  </svg>
);
const IconDoll = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11H3Z" /><line x1="3" y1="14" x2="21" y2="14" />
    <line x1="9" y1="21" x2="9" y2="14" /><line x1="15" y1="21" x2="15" y2="14" />
  </svg>
);
const IconExplode = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="4" rx="1" />
    <rect x="3" y="10" width="18" height="4" rx="1" />
    <rect x="3" y="17" width="18" height="4" rx="1" />
  </svg>
);
const IconFloor = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="10" rx="2" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="7" y1="7" x2="7" y2="17" />
  </svg>
);
const IconWire = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 9l10-7 10 7v6l-10 7L2 15Z" />
    <path d="M2 9l10 7 10-7" strokeDasharray="3 2" /><line x1="12" y1="16" x2="12" y2="22" strokeDasharray="3 2" />
  </svg>
);

// ─── Public component ─────────────────────────────────────────────────────────
interface ThreeViewerProps {
  scene: SceneData;
}

export default function ThreeViewer({ scene }: ThreeViewerProps) {
  const [preset, setPreset]       = useState<ViewPreset>("iso");
  const [isoFloor, setIsoFloor]   = useState(0);
  const [wireframe, setWireframe] = useState(false);

  // Initial camera placed isometrically on mount
  const initPos = useMemo<[number, number, number]>(() => {
    const [cx, , cz] = scene.center;
    const d = scene.diagonal;
    return [cx + d * 0.70, d * 0.65, cz + d * 0.70];
  }, [scene]);

  const floorList = useMemo(() => {
    const max = scene.floors;
    return Array.from({ length: max + 1 }, (_, i) => i);
  }, [scene.floors]);

  const floorName = (f: number) =>
    f === 0 ? "G" : f === scene.floors ? "Roof" : `F${f}`;

  const presets: Array<{ id: ViewPreset; label: React.ReactNode; title: string }> = [
    { id: "iso",      label: <><IconIso />Isometric</>,   title: "Isometric view" },
    { id: "top",      label: <><IconTop />Top View</>,    title: "Orthographic top-down view" },
    { id: "dollhouse",label: <><IconDoll />Dollhouse</>,  title: "Dollhouse view (roof removed)" },
    { id: "exploded", label: <><IconExplode />Exploded</>, title: "Exploded view — floors separated" },
    { id: "isolated", label: <><IconFloor />Isolate</>,   title: "Isolate a single floor" },
  ];

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#0d120a" }}>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 overflow-x-auto"
        style={{ background: "#111a09", borderBottom: "1px solid #2a3a18" }}
      >
        {/* View preset buttons */}
        <div className="flex items-center gap-1.5 mr-1">
          {presets.map(p => (
            <PresetBtn
              key={p.id}
              active={preset === p.id}
              label={p.label}
              title={p.title}
              onClick={() => setPreset(p.id)}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 shrink-0" style={{ background: "#2a3a18" }} />

        {/* Floor selector (visible when "isolated" or always for reference) */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wide mr-0.5" style={{ color: "#5a7a38" }}>
            Floor
          </span>
          {floorList.map(f => (
            <button
              key={f}
              onClick={() => { setIsoFloor(f); if (preset !== "isolated") setPreset("isolated"); }}
              className="w-8 h-7 rounded text-[11px] font-bold transition-all"
              style={{
                background: (preset === "isolated" && isoFloor === f)
                  ? "#6aaa38"
                  : preset === "isolated"
                    ? "#1a2a10"
                    : "rgba(255,255,255,0.04)",
                color: (preset === "isolated" && isoFloor === f)
                  ? "#fff"
                  : "#6a8a48",
                border: `1px solid ${preset === "isolated" && isoFloor === f ? "#6aaa38" : "#2a3820"}`,
              }}
            >
              {floorName(f)}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 shrink-0" style={{ background: "#2a3a18" }} />

        {/* Wireframe toggle */}
        <PresetBtn
          active={wireframe}
          label={<><IconWire />Wireframe</>}
          title="Toggle wireframe overlay"
          onClick={() => setWireframe(v => !v)}
        />

        {/* Mesh count */}
        <div className="ml-auto text-[10px]" style={{ color: "#4a6a30" }}>
          {scene.meshes.length} meshes
        </div>
      </div>

      {/* ── Canvas ────────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full">
        <Canvas
          shadows={{ type: THREE.PCFSoftShadowMap }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          camera={{ position: initPos, fov: 48, near: 0.1, far: 8000 }}
          style={{ background: "#0d120a" }}
          resize={{ debounce: 0, scroll: false }}
        >
          <Suspense fallback={null}>
            <BuildingScene
              scene={scene}
              preset={preset}
              isoFloor={isoFloor}
              wireframe={wireframe}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── On-canvas overlay tips ─────────────────────────────────────────── */}
      <div
        className="absolute bottom-3 right-3 text-[9px] leading-relaxed pointer-events-none"
        style={{ color: "#3a5228" }}
      >
        Drag to rotate · Scroll to zoom · Right-drag to pan
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-3 left-3 rounded-lg p-2.5"
        style={{ background: "rgba(17,26,9,0.92)", border: "1px solid #2a3820" }}
      >
        <div className="text-[8px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#5a7a38" }}>Legend</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {(
            [
              "exterior-wall","interior-wall","floor-slab","roof-slab",
              "column","parapet","stair-tread","door-frame","window-frame","window-glass",
              "balcony-slab","balcony-railing",
            ] as MeshRole[]
          ).map(role => (
            <div key={role} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: ROLE_COLOR[role], opacity: ROLE_OPACITY[role] ?? 1 }}
              />
              <span className="text-[8px] capitalize" style={{ color: "#7a9a58" }}>
                {role.replace(/-/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
