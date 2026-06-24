// ─── Living-room furniture ─────────────────────────────────────────────────
// All components accept a world-space position + Y rotation.
// Low-poly realistic: cylinders use 6-8 segments, no cartoon colours.

const C = {
  fabric:   "#78726A",
  cushion:  "#E5D9CC",
  wood:     "#9B7B50",
  woodDark: "#5C3A1E",
  woodMid:  "#7B5E38",
  screen:   "#1A1E22",
  bezel:    "#2C3038",
};

interface FP { position: [number, number, number]; rotation?: number }

// ── Sofa ─────────────────────────────────────────────────────────────────────
export function Sofa({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat base */}
      <mesh position={[0, 0.20, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.05, 0.40, 0.88]} />
        <meshStandardMaterial color={C.fabric} roughness={0.92} />
      </mesh>
      {/* Back rest */}
      <mesh position={[0, 0.57, -0.37]} castShadow receiveShadow>
        <boxGeometry args={[2.05, 0.60, 0.14]} />
        <meshStandardMaterial color={C.fabric} roughness={0.92} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.93, 0.42, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.35, 0.70]} />
        <meshStandardMaterial color={C.fabric} roughness={0.92} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.93, 0.42, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.35, 0.70]} />
        <meshStandardMaterial color={C.fabric} roughness={0.92} />
      </mesh>
      {/* Seat cushions × 3 */}
      {([-0.62, 0, 0.62] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.42, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[0.57, 0.10, 0.74]} />
          <meshStandardMaterial color={C.cushion} roughness={0.95} />
        </mesh>
      ))}
      {/* Back cushions × 3 */}
      {([-0.62, 0, 0.62] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.57, -0.30]} castShadow receiveShadow>
          <boxGeometry args={[0.57, 0.42, 0.10]} />
          <meshStandardMaterial color={C.cushion} roughness={0.95} />
        </mesh>
      ))}
      {/* Legs × 4 */}
      {(
        [[-0.88, -0.37], [0.88, -0.37], [-0.88, 0.37], [0.88, 0.37]] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.04, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 4]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

// ── TV Unit ───────────────────────────────────────────────────────────────────
export function TVUnit({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Cabinet body */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.70, 0.50, 0.42]} />
        <meshStandardMaterial color={C.wood} roughness={0.75} />
      </mesh>
      {/* Cabinet top */}
      <mesh position={[0, 0.51, 0]}>
        <boxGeometry args={[1.70, 0.02, 0.42]} />
        <meshStandardMaterial color={C.woodMid} roughness={0.60} metalness={0.05} />
      </mesh>
      {/* TV screen */}
      <mesh position={[0, 1.05, 0.05]} castShadow>
        <boxGeometry args={[1.30, 0.74, 0.04]} />
        <meshStandardMaterial color={C.screen} roughness={0.15} metalness={0.3} />
      </mesh>
      {/* TV bezel */}
      <mesh position={[0, 1.05, 0.04]}>
        <boxGeometry args={[1.38, 0.82, 0.02]} />
        <meshStandardMaterial color={C.bezel} roughness={0.40} metalness={0.5} />
      </mesh>
      {/* TV stand */}
      <mesh position={[0, 0.52, 0.02]}>
        <boxGeometry args={[0.06, 0.04, 0.06]} />
        <meshStandardMaterial color={C.bezel} roughness={0.40} metalness={0.5} />
      </mesh>
      {/* Door panels (3 sections) */}
      {([-0.56, 0, 0.56] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.25, 0.215]}>
          <boxGeometry args={[0.51, 0.44, 0.005]} />
          <meshStandardMaterial color={C.woodMid} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

// ── Center Table ──────────────────────────────────────────────────────────────
export function CenterTable({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Tabletop */}
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.04, 0.60]} />
        <meshStandardMaterial color={C.woodMid} roughness={0.55} metalness={0.04} />
      </mesh>
      {/* Lower shelf */}
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[1.05, 0.025, 0.50]} />
        <meshStandardMaterial color={C.wood} roughness={0.70} />
      </mesh>
      {/* Legs × 4 */}
      {(
        [[-0.50, -0.24], [0.50, -0.24], [-0.50, 0.24], [0.50, 0.24]] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.21, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.42, 6]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}
