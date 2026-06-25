// ─── Bedroom furniture ─────────────────────────────────────────────────────

const C = {
  frame:    "#8B6B40",
  headboard:"#7A5C32",
  mattress: "#EDE8E2",
  pillow:   "#F5F0EA",
  linen:    "#D8D0C4",
  wood:     "#9B7B50",
  woodDark: "#5C3A1E",
  panel:    "#B8A888",
  handle:   "#C8C0B0",
};

interface FP { position: [number, number, number]; rotation?: number }

// ── Bed ───────────────────────────────────────────────────────────────────────
// isMaster=true → King (1.8m wide), false → Double (1.6m wide)
export function Bed({ position, rotation = 0, isMaster = false }: FP & { isMaster?: boolean }) {
  const bw = isMaster ? 1.85 : 1.62;  // bed width

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Platform base */}
      <mesh position={[0, 0.15, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[bw, 0.30, 2.10]} />
        <meshStandardMaterial color={C.frame} roughness={0.72} />
      </mesh>
      {/* Headboard */}
      <mesh position={[0, 0.62, -1.01]} castShadow receiveShadow>
        <boxGeometry args={[bw, 0.80, 0.08]} />
        <meshStandardMaterial color={C.headboard} roughness={0.68} />
      </mesh>
      {/* Headboard panel detail */}
      <mesh position={[0, 0.62, -0.96]}>
        <boxGeometry args={[bw - 0.12, 0.62, 0.03]} />
        <meshStandardMaterial color={C.panel} roughness={0.80} />
      </mesh>
      {/* Mattress */}
      <mesh position={[0, 0.35, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[bw - 0.06, 0.22, 1.98]} />
        <meshStandardMaterial color={C.mattress} roughness={0.94} />
      </mesh>
      {/* Linen / sheet */}
      <mesh position={[0, 0.47, 0.18]} receiveShadow>
        <boxGeometry args={[bw - 0.06, 0.025, 1.58]} />
        <meshStandardMaterial color={C.linen} roughness={0.95} />
      </mesh>
      {/* Pillows × 2 */}
      {(isMaster ? [-0.50, 0.50] : [-0.38, 0.38] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.50, -0.72]} castShadow receiveShadow>
          <boxGeometry args={[0.65, 0.10, 0.45]} />
          <meshStandardMaterial color={C.pillow} roughness={0.96} />
        </mesh>
      ))}
      {/* Legs × 4 */}
      {(
        [[-bw / 2 + 0.08, -1.02], [bw / 2 - 0.08, -1.02],
         [-bw / 2 + 0.08,  1.02], [bw / 2 - 0.08,  1.02]] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.04, z]}>
          <boxGeometry args={[0.06, 0.08, 0.06]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

// ── Wardrobe ──────────────────────────────────────────────────────────────────
export function Wardrobe({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.82, 2.10, 0.62]} />
        <meshStandardMaterial color={C.wood} roughness={0.70} />
      </mesh>
      {/* Three door panels */}
      {([-0.60, 0, 0.60] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 1.05, 0.315]}>
          <boxGeometry args={[0.56, 1.96, 0.018]} />
          <meshStandardMaterial color={C.panel} roughness={0.62} />
        </mesh>
      ))}
      {/* Door handles */}
      {([-0.60, 0, 0.60] as number[]).map((x, i) => (
        <mesh key={i} position={[x + 0.18, 1.05, 0.328]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 6]} />
          <meshStandardMaterial color={C.handle} roughness={0.30} metalness={0.6} />
        </mesh>
      ))}
      {/* Top cornice */}
      <mesh position={[0, 2.14, 0]}>
        <boxGeometry args={[1.85, 0.06, 0.65]} />
        <meshStandardMaterial color={C.headboard} roughness={0.68} />
      </mesh>
      {/* Base plinth */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.85, 0.08, 0.64]} />
        <meshStandardMaterial color={C.headboard} roughness={0.68} />
      </mesh>
    </group>
  );
}

// ── Side Table ────────────────────────────────────────────────────────────────
export function SideTable({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Top */}
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.50, 0.04, 0.50]} />
        <meshStandardMaterial color={C.panel} roughness={0.58} metalness={0.04} />
      </mesh>
      {/* Drawer body */}
      <mesh position={[0, 0.34, 0]} receiveShadow>
        <boxGeometry args={[0.50, 0.32, 0.50]} />
        <meshStandardMaterial color={C.wood} roughness={0.72} />
      </mesh>
      {/* Drawer face */}
      <mesh position={[0, 0.34, 0.255]}>
        <boxGeometry args={[0.46, 0.28, 0.01]} />
        <meshStandardMaterial color={C.panel} roughness={0.58} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, 0.34, 0.265]}>
        <cylinderGeometry args={[0.010, 0.010, 0.10, 6]} />
        <meshStandardMaterial color={C.handle} roughness={0.28} metalness={0.65} />
      </mesh>
      {/* Legs × 4 */}
      {(
        [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.09, z]}>
          <cylinderGeometry args={[0.018, 0.018, 0.18, 4]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}
