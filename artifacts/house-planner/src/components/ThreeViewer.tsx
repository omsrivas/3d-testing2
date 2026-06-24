import { useRef, useMemo, useState, useCallback, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { SceneData, BoxSpec, MeshRole } from "@/lib/geometryEngine3d";

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

const ROLE_OPACITY: Partial<Record<MeshRole, number>> = {
  "window-glass": 0.35,
};

const ROLE_ROUGHNESS: Partial<Record<MeshRole, number>> = {
  "exterior-wall": 0.85,
  "interior-wall": 0.80,
  "floor-slab":    0.90,
  "roof-slab":     0.90,
  "column":        0.80,
  "window-glass":  0.05,
  "window-frame":  0.60,
  "door-frame":    0.70,
  "stair-tread":   0.80,
  "parapet":       0.85,
};

// ─── Single mesh ─────────────────────────────────────────────────────────────
function SceneMesh({
  spec,
  wireframe,
}: {
  spec: BoxSpec;
  wireframe: boolean;
}) {
  const color   = ROLE_COLOR[spec.role];
  const opacity = ROLE_OPACITY[spec.role] ?? 1;
  const roughness = ROLE_ROUGHNESS[spec.role] ?? 0.75;
  const transparent = opacity < 1;

  return (
    <mesh
      position={[spec.cx, spec.cy, spec.cz]}
      rotation={[0, spec.ry, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[spec.w, spec.h, spec.d]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0.0}
        opacity={opacity}
        transparent={transparent}
        wireframe={wireframe && !transparent}
      />
    </mesh>
  );
}

// ─── Camera rig ───────────────────────────────────────────────────────────────
function CameraSetup({
  center,
  diagonal,
}: {
  center: [number, number, number];
  diagonal: number;
}) {
  const { camera } = useThree();
  const mounted = useRef(false);

  if (!mounted.current) {
    const dist = diagonal * 0.9;
    camera.position.set(
      center[0] + dist * 0.55,
      center[1] + dist * 0.55,
      center[2] + dist * 0.75,
    );
    camera.near = 0.1;
    camera.far  = diagonal * 10;
    (camera as THREE.PerspectiveCamera).fov = 45;
    camera.updateProjectionMatrix();
    mounted.current = true;
  }

  return null;
}

// ─── Ground plane ─────────────────────────────────────────────────────────────
function Ground({ plotWidth, plotDepth }: { plotWidth: number; plotDepth: number }) {
  const size = Math.max(plotWidth, plotDepth) * 2.5;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[plotWidth / 2, -0.001, plotDepth / 2]}
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#2a3520" roughness={1} metalness={0} />
    </mesh>
  );
}

// ─── Scene content ────────────────────────────────────────────────────────────
function BuildingScene({
  scene,
  visibleFloors,
  wireframe,
}: {
  scene: SceneData;
  visibleFloors: Set<number>;
  wireframe: boolean;
}) {
  const visible = useMemo(
    () => scene.meshes.filter(m => visibleFloors.has(m.floor)),
    [scene.meshes, visibleFloors],
  );

  return (
    <>
      <CameraSetup center={scene.center} diagonal={scene.diagonal} />

      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[scene.plotWidth * 2, scene.diagonal * 1.2, -scene.plotDepth]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={scene.diagonal * 4}
        shadow-camera-left={-scene.plotWidth * 2}
        shadow-camera-right={scene.plotWidth * 2}
        shadow-camera-top={scene.plotDepth * 2}
        shadow-camera-bottom={-scene.plotDepth * 2}
      />
      <directionalLight
        position={[-scene.plotWidth, scene.diagonal * 0.5, scene.plotDepth * 2]}
        intensity={0.35}
      />

      {/* Building meshes */}
      {visible.map(spec => (
        <SceneMesh key={spec.id} spec={spec} wireframe={wireframe} />
      ))}

      {/* Ground */}
      <Ground plotWidth={scene.plotWidth} plotDepth={scene.plotDepth} />

      {/* Grid helper */}
      <Grid
        position={[scene.plotWidth / 2, 0, scene.plotDepth / 2]}
        args={[Math.max(scene.plotWidth, scene.plotDepth) * 2, Math.max(scene.plotWidth, scene.plotDepth) * 2]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3a4a2a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4a5a38"
        fadeDistance={80}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
interface ThreeViewerProps {
  scene: SceneData;
}

export default function ThreeViewer({ scene }: ThreeViewerProps) {
  const [wireframe, setWireframe]     = useState(false);
  const [allFloors, setAllFloors]     = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (let f = 0; f <= scene.floors; f++) s.add(f);
    return s;
  });

  const toggleFloor = useCallback((f: number) => {
    setAllFloors(prev => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }, []);

  const floorLabels = useMemo(() => {
    const labels: Array<{ f: number; label: string }> = [];
    for (let f = 0; f <= scene.floors; f++) {
      labels.push({ f, label: f === 0 ? "G" : f === scene.floors ? "Roof" : `F${f}` });
    }
    return labels;
  }, [scene.floors]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0d120a]">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
        {/* Floor toggles */}
        <div className="flex items-center gap-1.5 bg-[#1a2212]/90 backdrop-blur border border-[#3a5a22]/50 rounded-lg px-2.5 py-2">
          <span className="text-[10px] font-semibold text-[#8aab60] uppercase tracking-wider mr-1">Floors</span>
          {floorLabels.map(({ f, label }) => (
            <button
              key={f}
              onClick={() => toggleFloor(f)}
              className={[
                "w-8 h-7 rounded text-[11px] font-bold transition-all",
                allFloors.has(f)
                  ? "bg-[#6aaa38] text-white shadow-sm"
                  : "bg-[#1a2a12] text-[#556644] border border-[#3a5a22]/40",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Wireframe toggle */}
        <button
          onClick={() => setWireframe(v => !v)}
          className={[
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all",
            wireframe
              ? "bg-[#c1672a]/20 border-[#c1672a]/60 text-[#e8905a]"
              : "bg-[#1a2212]/90 border-[#3a5a22]/50 text-[#8aab60]",
          ].join(" ")}
        >
          <span className={[
            "inline-block w-3 h-3 border-2 rounded-sm",
            wireframe ? "border-[#c1672a]" : "border-[#6aaa38]",
          ].join(" ")} />
          Wireframe
        </button>
      </div>

      {/* Mesh count badge */}
      <div className="absolute top-3 right-3 z-20 bg-[#1a2212]/90 backdrop-blur border border-[#3a5a22]/50 rounded-lg px-2.5 py-1.5 text-[10px] text-[#7a9a52]">
        {scene.meshes.filter(m => allFloors.has(m.floor)).length} meshes
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-[#1a2212]/90 backdrop-blur border border-[#3a5a22]/50 rounded-lg p-2.5">
        <div className="text-[9px] font-semibold text-[#6a8a42] uppercase tracking-wider mb-1.5">Legend</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {(Object.entries(ROLE_COLOR) as Array<[MeshRole, string]>)
            .filter(([role]) => !["window-glass", "balcony-railing", "stair-tread"].includes(role))
            .map(([role, color]) => (
              <div key={role} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: color, opacity: ROLE_OPACITY[role] ?? 1 }}
                />
                <span className="text-[9px] text-[#8aaa60] capitalize">
                  {role.replace(/-/g, " ")}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full">
        <Canvas
          shadows
          gl={{ antialias: true, alpha: false }}
          camera={{ fov: 45, near: 0.1, far: 5000 }}
          style={{ background: "#0d120a" }}
        >
          <Suspense fallback={null}>
            <BuildingScene
              scene={scene}
              visibleFloors={allFloors}
              wireframe={wireframe}
            />
            <OrbitControls
              target={scene.center}
              minDistance={2}
              maxDistance={scene.diagonal * 3}
              enablePan
              enableZoom
              enableRotate
              maxPolarAngle={Math.PI * 0.85}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
