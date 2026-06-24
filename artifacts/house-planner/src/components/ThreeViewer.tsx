import {
  useRef, useMemo, useState, useEffect, Suspense,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { SceneData, BoxSpec, MeshRole } from "@/lib/geometryEngine3d";
import { FLOOR_TO_FLOOR } from "@/lib/geometryEngine3d/constants";
import { FloorFurniture, PlotLandscape } from "@/lib/furniture";

// ─── Premium Indian modern architecture material palette ──────────────────────
// Modelled after contemporary Indian residential: lime-washed concrete,
// smooth plaster, warm teak accents, clear low-E glass, stainless railings.

const ROLE_COLOR: Record<MeshRole, string> = {
  "exterior-wall":   "#F0EBE3",   // warm lime-washed concrete
  "interior-wall":   "#F5F1EB",   // smooth white plaster
  "floor-slab":      "#D8D4CC",   // polished concrete slab
  "roof-slab":       "#C8C4BC",   // exposed concrete roof
  "column":          "#ECE8DF",   // plastered column
  "parapet":         "#E8E4DB",   // plastered parapet
  "balcony-slab":    "#CECAC2",   // concrete balcony slab
  "balcony-railing": "#C4C8CC",   // brushed stainless
  "stair-tread":     "#D2CEC6",   // concrete tread
  "door-frame":      "#8B5A2C",   // warm teak wood
  "window-frame":    "#E8E4DC",   // white anodised aluminium
  "window-glass":    "#ACCFE8",   // clear low-E glass tint
};

// Opacity — only glass is transparent
const ROLE_OPACITY: Partial<Record<MeshRole, number>> = {
  "window-glass": 0.28,
};

// PBR roughness — concrete is matte, glass near-mirror, steel semi-specular
const ROLE_ROUGHNESS: Partial<Record<MeshRole, number>> = {
  "exterior-wall":   0.88,
  "interior-wall":   0.78,
  "floor-slab":      0.82,
  "roof-slab":       0.92,
  "column":          0.78,
  "parapet":         0.88,
  "balcony-slab":    0.84,
  "balcony-railing": 0.24,
  "stair-tread":     0.82,
  "door-frame":      0.68,
  "window-frame":    0.30,
  "window-glass":    0.03,
};

// Metalness — only steel/glass/aluminium elements
const ROLE_METALNESS: Partial<Record<MeshRole, number>> = {
  "balcony-railing": 0.72,
  "window-frame":    0.48,
  "window-glass":    0.18,
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
    default: // iso
      return {
        pos:    new THREE.Vector3(cx + d * 0.70, cy + d * 0.65, cz + d * 0.70),
        target: new THREE.Vector3(cx, cy * 0.35, cz),
      };
  }
}

// ─── Single structural mesh ───────────────────────────────────────────────────
function SceneMesh({
  spec,
  wireframe,
  dimOpacity,
}: {
  spec: BoxSpec;
  wireframe: boolean;
  dimOpacity?: number;
}) {
  const base      = ROLE_OPACITY[spec.role] ?? 1;
  const opacity   = dimOpacity !== undefined ? base * dimOpacity : base;
  const rough     = ROLE_ROUGHNESS[spec.role] ?? 0.78;
  const metal     = ROLE_METALNESS[spec.role] ?? 0;
  const transp    = opacity < 0.99;

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
        metalness={metal}
        opacity={opacity}
        transparent={transp}
        wireframe={wireframe && !transp}
        envMapIntensity={metal > 0.3 ? 0.8 : 0.2}
      />
    </mesh>
  );
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
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  showFurniture: boolean;
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
                <SceneMesh
                  key={spec.id}
                  spec={spec}
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

// ─── Lighting — warm Indian afternoon (~4 pm) ─────────────────────────────────
// Primary: warm golden sun from NW (high elevation)
// Fill:    cool blue sky light from SE
// Bounce:  subtle warm ground-reflected fill
// Hemi:    gradient sky-to-earth ambient
function Lighting({ scene }: { scene: SceneData }) {
  const d = scene.diagonal;
  const [cx, , cz] = scene.center;
  return (
    <>
      <ambientLight color="#FFF6EC" intensity={0.35} />

      {/* Primary sun — warm golden, NW high (casts long architectural shadows) */}
      <directionalLight
        color="#FFE08A"
        position={[cx + d * 1.1, d * 1.7, cz - d * 0.4]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={d * 7}
        shadow-camera-left={-d * 1.8}
        shadow-camera-right={d * 1.8}
        shadow-camera-top={d * 1.8}
        shadow-camera-bottom={-d * 1.8}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />

      {/* Sky fill — cool blue from the opposite side */}
      <directionalLight
        color="#C0D4F0"
        position={[cx - d * 0.7, d * 0.5, cz + d * 0.9]}
        intensity={0.42}
      />

      {/* Bounce fill — warm ground light (Indian concrete/soil bounce) */}
      <directionalLight
        color="#E8C890"
        position={[cx, -d * 0.2, cz]}
        intensity={0.18}
      />

      {/* Hemisphere — sky/ground gradient for overall atmosphere */}
      <hemisphereLight args={["#B8CCE4", "#C8A870", 0.60]} />
    </>
  );
}

// ─── Ground — layered: green lawn + concrete plot paving ──────────────────────
function Ground({ scene }: { scene: SceneData }) {
  const { plotWidth: pw, plotDepth: pd } = scene;
  const extend = Math.max(pw, pd) * 1.8;

  return (
    <group>
      {/* Green lawn extending beyond plot boundary */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[pw / 2, -0.004, pd / 2]}
        receiveShadow
      >
        <planeGeometry args={[pw + extend * 2, pd + extend * 2]} />
        <meshStandardMaterial color="#4A6630" roughness={0.96} metalness={0} />
      </mesh>

      {/* Plot paving / concrete hardstanding within the plot footprint */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[pw / 2, -0.001, pd / 2]}
        receiveShadow
      >
        <planeGeometry args={[pw, pd]} />
        <meshStandardMaterial color="#C8C4BC" roughness={0.90} metalness={0} />
      </mesh>

      {/* Narrow road strip in front of the plot */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[pw / 2, -0.002, -1.5]}
        receiveShadow
      >
        <planeGeometry args={[pw + extend * 2, 3.0]} />
        <meshStandardMaterial color="#888480" roughness={0.94} metalness={0} />
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
}: {
  scene: SceneData;
  preset: ViewPreset;
  isoFloor: number;
  wireframe: boolean;
  showFurniture: boolean;
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
        showFurniture={showFurniture}
      />
      {showFurniture && (
        <Suspense fallback={null}>
          <PlotLandscape plotWidth={scene.plotWidth} plotDepth={scene.plotDepth} />
        </Suspense>
      )}
      <Ground scene={scene} />
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
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);
const IconIso = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 9l10-7 10 7v6l-10 7L2 15Z" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="9" x2="22" y2="9" />
  </svg>
);
const IconDoll = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11H3Z" />
    <line x1="3" y1="14" x2="21" y2="14" />
    <line x1="9" y1="21" x2="9" y2="14" />
    <line x1="15" y1="21" x2="15" y2="14" />
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
    <path d="M2 9l10 7 10-7" strokeDasharray="3 2" />
    <line x1="12" y1="16" x2="12" y2="22" strokeDasharray="3 2" />
  </svg>
);
const IconSofa = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 10v7h20v-7" />
    <path d="M2 14h20" />
    <path d="M2 10a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3" />
    <line x1="5" y1="17" x2="5" y2="20" />
    <line x1="19" y1="17" x2="19" y2="20" />
  </svg>
);

// ─── Main exported component ──────────────────────────────────────────────────
interface ThreeViewerProps { scene: SceneData }

export default function ThreeViewer({ scene }: ThreeViewerProps) {
  const [preset, setPreset]           = useState<ViewPreset>("iso");
  const [isoFloor, setIsoFloor]       = useState(0);
  const [wireframe, setWireframe]     = useState(false);
  const [showFurniture, setFurniture] = useState(true);

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
    { id: "iso",       label: <><IconIso />Isometric</>,   title: "Isometric view" },
    { id: "top",       label: <><IconTop />Top View</>,    title: "Orthographic top-down" },
    { id: "dollhouse", label: <><IconDoll />Dollhouse</>,  title: "Dollhouse (roof hidden)" },
    { id: "exploded",  label: <><IconExplode />Exploded</>, title: "Exploded floors" },
    { id: "isolated",  label: <><IconFloor />Isolate</>,   title: "Isolate one floor" },
  ];

  // Toolbar chrome: dark charcoal (premium neutral, not green)
  const TB = "#18181B";   // toolbar bg
  const TBB = "#27272A";  // toolbar border

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#F0EDE8" }}>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 overflow-x-auto"
        style={{ background: TB, borderBottom: `1px solid ${TBB}` }}
      >
        {/* Preset buttons */}
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

        <div className="w-px h-8 shrink-0" style={{ background: TBB }} />

        {/* Floor badges */}
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
                background: preset === "isolated" && isoFloor === f
                  ? "#E09040"
                  : preset === "isolated"
                    ? "#27272A"
                    : "rgba(255,255,255,0.05)",
                color:  preset === "isolated" && isoFloor === f ? "#FFF" : "#7A8A98",
                border: `1px solid ${preset === "isolated" && isoFloor === f ? "#E09040" : TBB}`,
              }}
            >
              {floorName(f)}
            </button>
          ))}
        </div>

        <div className="w-px h-8 shrink-0" style={{ background: TBB }} />

        {/* Toggles */}
        <PresetBtn
          active={showFurniture}
          label={<><IconSofa />Furniture</>}
          title="Toggle furniture & landscape"
          onClick={() => setFurniture(v => !v)}
        />
        <PresetBtn
          active={wireframe}
          label={<><IconWire />Wireframe</>}
          title="Wireframe overlay"
          onClick={() => setWireframe(v => !v)}
        />

        {/* Stats */}
        <div className="ml-auto text-[10px]" style={{ color: "#4A5A68" }}>
          {scene.meshes.length} meshes · {scene.rooms.length} rooms
        </div>
      </div>

      {/* ── 3D Canvas — warm architectural visualization background ─────────── */}
      <div className="flex-1 w-full">
        <Canvas
          shadows={{ type: THREE.PCFSoftShadowMap }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
          camera={{ position: initPos, fov: 46, near: 0.1, far: 8000 }}
          style={{ background: "#E8EEF4" }}
          resize={{ debounce: 0, scroll: false }}
        >
          <fog attach="fog" args={["#E8EEF4", scene.diagonal * 4, scene.diagonal * 10]} />
          <Suspense fallback={null}>
            <BuildingScene
              scene={scene}
              preset={preset}
              isoFloor={isoFloor}
              wireframe={wireframe}
              showFurniture={showFurniture}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Interaction hint ────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-3 right-3 text-[9px] leading-relaxed pointer-events-none"
        style={{ color: "rgba(60,50,40,0.38)" }}
      >
        Drag · Scroll · Right-drag to pan
      </div>

      {/* ── Material legend ─────────────────────────────────────────────────── */}
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
          {(
            [
              "exterior-wall","interior-wall","floor-slab","roof-slab",
              "column","door-frame","window-frame","window-glass",
              "balcony-slab","balcony-railing","stair-tread","parapet",
            ] as MeshRole[]
          ).map(role => (
            <div key={role} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{
                  background: ROLE_COLOR[role],
                  opacity: ROLE_OPACITY[role] ?? 1,
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
