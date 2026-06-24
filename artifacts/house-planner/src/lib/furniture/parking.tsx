// ─── Parking furniture — Car ───────────────────────────────────────────────
// Low-poly 3-box silhouette: chassis + cabin + wheels.
// Neutral dark-slate colour. No cartoon palette.

const C = {
  body:   "#2D3748",
  bodyLo: "#364152",
  glass:  "#8FB8CC",
  tyre:   "#1A1A1A",
  rim:    "#8A9099",
  chrome: "#B8BCC4",
  light:  "#F0D080",
  brake:  "#9B3030",
};

interface FP { position: [number, number, number]; rotation?: number }

export function Car({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>

      {/* ── Chassis ─────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.50, 0.55, 1.82]} />
        <meshStandardMaterial color={C.body} roughness={0.45} metalness={0.25} />
      </mesh>

      {/* ── Cabin ───────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.88, 0.04]} castShadow>
        <boxGeometry args={[2.60, 0.62, 1.62]} />
        <meshStandardMaterial color={C.body} roughness={0.45} metalness={0.25} />
      </mesh>

      {/* ── Windshield (front glass) ──────────────────────────────────── */}
      <mesh position={[1.22, 0.88, 0.04]}>
        <boxGeometry args={[0.04, 0.50, 1.40]} />
        <meshStandardMaterial
          color={C.glass} roughness={0.05} metalness={0.08} transparent opacity={0.45}
        />
      </mesh>
      {/* ── Rear windshield ────────────────────────────────────────────── */}
      <mesh position={[-1.22, 0.88, 0.04]}>
        <boxGeometry args={[0.04, 0.50, 1.40]} />
        <meshStandardMaterial
          color={C.glass} roughness={0.05} metalness={0.08} transparent opacity={0.40}
        />
      </mesh>
      {/* ── Side windows (left + right) ─────────────────────────────────── */}
      {([0.82, -0.82] as number[]).map((z, i) => (
        <mesh key={i} position={[0, 0.90, z * (1.62 / 2 - 0.01)]}>
          <boxGeometry args={[2.40, 0.42, 0.01]} />
          <meshStandardMaterial
            color={C.glass} roughness={0.05} metalness={0.08} transparent opacity={0.38}
          />
        </mesh>
      ))}

      {/* ── Wheels × 4 ─────────────────────────────────────────────────── */}
      {(
        [[1.35, -0.92], [-1.35, -0.92], [1.35, 0.92], [-1.35, 0.92]] as [number, number][]
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0.30, z]}>
          {/* Tyre */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.30, 0.30, 0.20, 8]} />
            <meshStandardMaterial color={C.tyre} roughness={0.88} />
          </mesh>
          {/* Rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.22, 8]} />
            <meshStandardMaterial color={C.rim} roughness={0.35} metalness={0.60} />
          </mesh>
          {/* Hub cap */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[z > 0 ? -0.10 : 0.10, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.025, 6]} />
            <meshStandardMaterial color={C.chrome} roughness={0.22} metalness={0.75} />
          </mesh>
        </group>
      ))}

      {/* ── Front bumper ─────────────────────────────────────────────────── */}
      <mesh position={[2.22, 0.26, 0]} castShadow>
        <boxGeometry args={[0.06, 0.18, 1.72]} />
        <meshStandardMaterial color={C.bodyLo} roughness={0.65} />
      </mesh>
      {/* Front headlights */}
      {([-0.52, 0.52] as number[]).map((z, i) => (
        <mesh key={i} position={[2.24, 0.42, z]}>
          <boxGeometry args={[0.04, 0.10, 0.32]} />
          <meshStandardMaterial color={C.light} roughness={0.10} metalness={0.2} emissive="#D0B000" emissiveIntensity={0.05} />
        </mesh>
      ))}
      {/* Rear brake lights */}
      {([-0.52, 0.52] as number[]).map((z, i) => (
        <mesh key={i} position={[-2.24, 0.42, z]}>
          <boxGeometry args={[0.04, 0.10, 0.32]} />
          <meshStandardMaterial color={C.brake} roughness={0.15} metalness={0.15} />
        </mesh>
      ))}

      {/* ── Grille ─────────────────────────────────────────────────────── */}
      <mesh position={[2.24, 0.36, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.90]} />
        <meshStandardMaterial color={C.chrome} roughness={0.30} metalness={0.65} />
      </mesh>
    </group>
  );
}
