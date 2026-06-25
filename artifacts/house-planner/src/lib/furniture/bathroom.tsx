// ─── Bathroom furniture ────────────────────────────────────────────────────

const C = {
  ceramic:  "#EDEBE7",
  ceramicLo:"#E0DDD9",
  chrome:   "#C8CDD2",
  chromeDk: "#9CA3AC",
  glass:    "#A8C8D8",
  tile:     "#D8D4CE",
};

interface FP { position: [number, number, number]; rotation?: number }

// ── WC ────────────────────────────────────────────────────────────────────────
export function WC({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pan base (pedestal) */}
      <mesh position={[0, 0.22, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.38, 0.44, 0.62]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.22} metalness={0.05} />
      </mesh>
      {/* Pan rim (oval approximated as box) */}
      <mesh position={[0, 0.44, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.06, 0.56]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.20} />
      </mesh>
      {/* Cistern */}
      <mesh position={[0, 0.58, -0.26]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.32, 0.18]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.22} />
      </mesh>
      {/* Cistern lid */}
      <mesh position={[0, 0.75, -0.26]}>
        <boxGeometry args={[0.36, 0.03, 0.18]} />
        <meshStandardMaterial color={C.ceramicLo} roughness={0.25} />
      </mesh>
      {/* Toilet seat (open, slightly recessed) */}
      <mesh position={[0, 0.50, 0.05]}>
        <boxGeometry args={[0.34, 0.025, 0.52]} />
        <meshStandardMaterial color={C.ceramicLo} roughness={0.28} />
      </mesh>
      {/* Flush button */}
      <mesh position={[0, 0.78, -0.18]}>
        <cylinderGeometry args={[0.025, 0.025, 0.015, 8]} />
        <meshStandardMaterial color={C.chrome} roughness={0.25} metalness={0.70} />
      </mesh>
    </group>
  );
}

// ── Wash Basin ────────────────────────────────────────────────────────────────
export function WashBasin({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pedestal */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.115, 0.085, 0.70, 8]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.22} />
      </mesh>
      {/* Basin outer shell */}
      <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.18, 0.44]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.20} />
      </mesh>
      {/* Basin inner bowl (slightly darker) */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.47, 0.10, 0.36]} />
        <meshStandardMaterial color={C.ceramicLo} roughness={0.22} />
      </mesh>
      {/* Tap body */}
      <mesh position={[0, 0.96, -0.14]}>
        <cylinderGeometry args={[0.016, 0.016, 0.10, 6]} />
        <meshStandardMaterial color={C.chrome} roughness={0.18} metalness={0.80} />
      </mesh>
      {/* Tap spout */}
      <mesh position={[0, 1.00, -0.04]} rotation={[Math.PI / 5, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.12, 6]} />
        <meshStandardMaterial color={C.chrome} roughness={0.18} metalness={0.80} />
      </mesh>
      {/* Handles */}
      {([-0.08, 0.08] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.96, -0.16]}>
          <boxGeometry args={[0.04, 0.018, 0.04]} />
          <meshStandardMaterial color={C.chromeDk} roughness={0.22} metalness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

// ── Shower ────────────────────────────────────────────────────────────────────
export function Shower({ position, rotation = 0, size = 0.90 }: FP & { size?: number }) {
  const s = size;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Shower tray */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[s, 0.06, s]} />
        <meshStandardMaterial color={C.tile} roughness={0.50} />
      </mesh>
      {/* Tray rim */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[s + 0.02, 0.015, s + 0.02]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.35} />
      </mesh>
      {/* Glass panel — back */}
      <mesh position={[0, 1.05, -s / 2 + 0.005]} castShadow>
        <boxGeometry args={[s, 2.10, 0.008]} />
        <meshStandardMaterial
          color={C.glass}
          roughness={0.05}
          metalness={0.08}
          transparent
          opacity={0.28}
        />
      </mesh>
      {/* Glass panel — side */}
      <mesh position={[-s / 2 + 0.005, 1.05, 0]} castShadow>
        <boxGeometry args={[0.008, 2.10, s]} />
        <meshStandardMaterial
          color={C.glass}
          roughness={0.05}
          metalness={0.08}
          transparent
          opacity={0.28}
        />
      </mesh>
      {/* Shower arm pipe */}
      <mesh position={[-s / 2 + 0.04, 2.00, -s / 2 + 0.04]}>
        <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
        <meshStandardMaterial color={C.chrome} roughness={0.18} metalness={0.80} />
      </mesh>
      {/* Shower head */}
      <mesh position={[-s / 2 + 0.04, 1.84, -s / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.07, 0.025, 8]} />
        <meshStandardMaterial color={C.chromeDk} roughness={0.22} metalness={0.75} />
      </mesh>
    </group>
  );
}
