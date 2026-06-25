// ─── Dining furniture ─────────────────────────────────────────────────────

const C = {
  wood:     "#9B7B50",
  woodDark: "#5C3A1E",
  seat:     "#6E675F",
  cushion:  "#D8D0C4",
};

interface FP { position: [number, number, number]; rotation?: number }

// ── Dining Table ──────────────────────────────────────────────────────────────
export function DiningTable({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Tabletop */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 0.05, 0.88]} />
        <meshStandardMaterial color={C.wood} roughness={0.55} metalness={0.04} />
      </mesh>
      {/* Apron (structural frame under top) */}
      {[
        { p: [0, 0.70, 0.39] as [number,number,number], a: [1.40, 0.06, 0.02] as [number,number,number] },
        { p: [0, 0.70, -0.39] as [number,number,number], a: [1.40, 0.06, 0.02] as [number,number,number] },
        { p: [0.72, 0.70, 0] as [number,number,number], a: [0.02, 0.06, 0.82] as [number,number,number] },
        { p: [-0.72, 0.70, 0] as [number,number,number], a: [0.02, 0.06, 0.82] as [number,number,number] },
      ].map(({ p, a }, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={a} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
      {/* Legs × 4 */}
      {(
        [[-0.68, -0.38], [0.68, -0.38], [-0.68, 0.38], [0.68, 0.38]] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} castShadow>
          <cylinderGeometry args={[0.032, 0.032, 0.72, 6]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

// ── Dining Chair ──────────────────────────────────────────────────────────────
export function DiningChair({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.04, 0.46]} />
        <meshStandardMaterial color={C.wood} roughness={0.68} />
      </mesh>
      {/* Seat cushion */}
      <mesh position={[0, 0.50, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.05, 0.42]} />
        <meshStandardMaterial color={C.seat} roughness={0.90} />
      </mesh>
      {/* Backrest uprights × 2 */}
      {([-0.18, 0.18] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.78, -0.21]} castShadow>
          <boxGeometry args={[0.03, 0.65, 0.03]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
      {/* Backrest top rail */}
      <mesh position={[0, 1.08, -0.21]} castShadow>
        <boxGeometry args={[0.46, 0.05, 0.03]} />
        <meshStandardMaterial color={C.woodDark} roughness={0.65} />
      </mesh>
      {/* Mid back slat */}
      <mesh position={[0, 0.82, -0.21]}>
        <boxGeometry args={[0.40, 0.04, 0.02]} />
        <meshStandardMaterial color={C.wood} roughness={0.68} />
      </mesh>
      {/* Legs × 4 */}
      {(
        [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.018, 0.020, 0.44, 4]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
      {/* Stretchers (cross-bracing) */}
      {([-0.19, 0.19] as number[]).map((z, i) => (
        <mesh key={i} position={[0, 0.22, z]}>
          <boxGeometry args={[0.34, 0.015, 0.015]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}
