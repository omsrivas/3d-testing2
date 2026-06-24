// ─── Landscape elements ────────────────────────────────────────────────────
// Trees and potted plants in low-poly realistic style.

const C = {
  bark:      "#6B4E2C",
  barkDark:  "#4A3420",
  canopy1:   "#3D6442",
  canopy2:   "#2E5035",
  canopy3:   "#4A7A52",
  potTerra:  "#B5714A",
  potRim:    "#A0603C",
  soil:      "#4A3828",
  bush1:     "#3A5E38",
  bush2:     "#4A7248",
};

interface FP { position: [number, number, number]; rotation?: number }

// ── Tree ──────────────────────────────────────────────────────────────────────
// Three-layer canopy for a fuller low-poly look
export function Tree({ position, rotation = 0, scale = 1 }: FP & { scale?: number }) {
  const s = scale;
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={[s, s, s]}>
      {/* Root flare (base) */}
      <mesh position={[0, 0.10, 0]} receiveShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.20, 6]} />
        <meshStandardMaterial color={C.barkDark} roughness={0.92} />
      </mesh>
      {/* Main trunk */}
      <mesh position={[0, 0.90, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.10, 0.13, 1.60, 6]} />
        <meshStandardMaterial color={C.bark} roughness={0.90} />
      </mesh>
      {/* Upper trunk */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.10, 0.70, 6]} />
        <meshStandardMaterial color={C.bark} roughness={0.88} />
      </mesh>
      {/* Lower canopy (wide) */}
      <mesh position={[0, 2.30, 0]} castShadow>
        <sphereGeometry args={[1.15, 7, 5]} />
        <meshStandardMaterial color={C.canopy2} roughness={0.92} />
      </mesh>
      {/* Mid canopy (offset) */}
      <mesh position={[0.15, 2.85, 0.10]} castShadow>
        <sphereGeometry args={[0.90, 6, 4]} />
        <meshStandardMaterial color={C.canopy1} roughness={0.90} />
      </mesh>
      {/* Top canopy (peak) */}
      <mesh position={[-0.10, 3.28, -0.08]} castShadow>
        <sphereGeometry args={[0.62, 5, 4]} />
        <meshStandardMaterial color={C.canopy3} roughness={0.88} />
      </mesh>
    </group>
  );
}

// ── Small Tree (street/courtyard size) ───────────────────────────────────────
export function SmallTree({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.50, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.09, 1.00, 6]} />
        <meshStandardMaterial color={C.bark} roughness={0.90} />
      </mesh>
      <mesh position={[0, 1.30, 0]} castShadow>
        <sphereGeometry args={[0.65, 6, 4]} />
        <meshStandardMaterial color={C.canopy2} roughness={0.90} />
      </mesh>
      <mesh position={[0.10, 1.65, 0.08]} castShadow>
        <sphereGeometry args={[0.48, 5, 4]} />
        <meshStandardMaterial color={C.canopy1} roughness={0.88} />
      </mesh>
    </group>
  );
}

// ── Potted Plant ──────────────────────────────────────────────────────────────
export function Plant({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pot body */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.10, 0.30, 8]} />
        <meshStandardMaterial color={C.potTerra} roughness={0.80} />
      </mesh>
      {/* Pot rim */}
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.155, 0.14, 0.025, 8]} />
        <meshStandardMaterial color={C.potRim} roughness={0.75} />
      </mesh>
      {/* Soil surface */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.015, 8]} />
        <meshStandardMaterial color={C.soil} roughness={0.95} />
      </mesh>
      {/* Main bush */}
      <mesh position={[0, 0.60, 0]} castShadow>
        <sphereGeometry args={[0.28, 6, 4]} />
        <meshStandardMaterial color={C.bush1} roughness={0.90} />
      </mesh>
      {/* Secondary bush (offset) */}
      <mesh position={[0.08, 0.70, 0.06]} castShadow>
        <sphereGeometry args={[0.18, 5, 4]} />
        <meshStandardMaterial color={C.bush2} roughness={0.88} />
      </mesh>
    </group>
  );
}

// ── Larger Decorative Plant ───────────────────────────────────────────────────
export function LargePlant({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pot */}
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
      {/* Short stem */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.28, 5]} />
        <meshStandardMaterial color={C.bark} roughness={0.85} />
      </mesh>
      {/* Three foliage spheres */}
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
