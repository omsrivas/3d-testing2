// ─── Premium Bathroom Fixtures ────────────────────────────────────────────────
// Low-poly realism. All measurements in metres.

type V3 = [number, number, number];
interface FP { position: V3; rotation?: number }

const C = {
  ceramic:   "#F0EEEA",
  ceramicSh: "#E2E0DC",
  ceramicLo: "#D8D5D0",
  chrome:    "#CDD2D6",
  chromeDk:  "#9CA4AC",
  chromeShd: "#787E84",
  glass:     "#B0C8D4",
  glassEdge: "#88A8B8",
  tile:      "#D8D4CE",
  tileGrey:  "#C4C0BC",
  // Vanity unit
  vanityWood: "#8A7460",
  vanityPanel:"#B0A898",
  vanityCap:  "#C8C0B4",
  // WC
  seatWhite:  "#ECEBE8",
};

// ── Close-coupled WC ──────────────────────────────────────────────────────────
export function WC({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Pedestal / pan body ── */}
      <mesh position={[0, 0.24, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.38, 0.48, 0.60]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.20} metalness={0.04} />
      </mesh>
      {/* Sculpted base taper */}
      <mesh position={[0, 0.06, 0.08]}>
        <boxGeometry args={[0.32, 0.12, 0.50]} />
        <meshStandardMaterial color={C.ceramicSh} roughness={0.22} metalness={0.03} />
      </mesh>

      {/* ── Seat rim ── */}
      <mesh position={[0, 0.455, 0.06]} castShadow>
        <boxGeometry args={[0.360, 0.048, 0.540]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.18} metalness={0.04} />
      </mesh>
      {/* Seat lid (down) */}
      <mesh position={[0, 0.482, 0.06]}>
        <boxGeometry args={[0.350, 0.022, 0.520]} />
        <meshStandardMaterial color={C.seatWhite} roughness={0.26} metalness={0.02} />
      </mesh>

      {/* ── Cistern ── */}
      <mesh position={[0, 0.66, -0.26]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.40, 0.18]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.20} />
      </mesh>
      {/* Cistern lid */}
      <mesh position={[0, 0.870, -0.26]}>
        <boxGeometry args={[0.364, 0.024, 0.184]} />
        <meshStandardMaterial color={C.ceramicSh} roughness={0.24} />
      </mesh>
      {/* Flush button */}
      <mesh position={[0, 0.876, -0.180]}>
        <cylinderGeometry args={[0.032, 0.032, 0.014, 8]} />
        <meshStandardMaterial color={C.chrome} roughness={0.20} metalness={0.72} />
      </mesh>
      {/* Cistern connector pipe */}
      <mesh position={[0, 0.46, -0.175]}>
        <cylinderGeometry args={[0.014, 0.014, 0.06, 6]} />
        <meshStandardMaterial color={C.chromeDk} roughness={0.22} metalness={0.70} />
      </mesh>
    </group>
  );
}

// ── Countertop basin on vanity unit ───────────────────────────────────────────
export function WashBasin({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Vanity unit body ── */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.76, 0.46]} />
        <meshStandardMaterial color={C.vanityWood} roughness={0.72} metalness={0.01} />
      </mesh>
      {/* 2 door panels */}
      {([-0.155, 0.155] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.38, 0.234]}>
          <boxGeometry args={[0.27, 0.70, 0.010]} />
          <meshStandardMaterial color={C.vanityPanel} roughness={0.62} />
        </mesh>
      ))}
      {/* Small bar handles */}
      {([-0.155, 0.155] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.38, 0.242]}>
          <boxGeometry args={[0.10, 0.012, 0.008]} />
          <meshStandardMaterial color={C.chrome} roughness={0.22} metalness={0.70} />
        </mesh>
      ))}

      {/* ── Vanity countertop ── */}
      <mesh position={[0, 0.772, 0.012]} castShadow receiveShadow>
        <boxGeometry args={[0.64, 0.036, 0.48]} />
        <meshStandardMaterial color={C.vanityCap} roughness={0.38} metalness={0.06} />
      </mesh>

      {/* ── Countertop vessel basin ── */}
      {/* Basin outer shell */}
      <mesh position={[0, 0.840, 0]} castShadow>
        <boxGeometry args={[0.50, 0.126, 0.38]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.16} metalness={0.04} />
      </mesh>
      {/* Inner bowl */}
      <mesh position={[0, 0.862, 0]}>
        <boxGeometry args={[0.44, 0.086, 0.32]} />
        <meshStandardMaterial color={C.ceramicLo} roughness={0.18} metalness={0.04} />
      </mesh>
      {/* Basin floor */}
      <mesh position={[0, 0.820, 0]}>
        <boxGeometry args={[0.42, 0.010, 0.30]} />
        <meshStandardMaterial color={C.ceramicLo} roughness={0.20} />
      </mesh>
      {/* Drain */}
      <mesh position={[0, 0.820, 0]}>
        <cylinderGeometry args={[0.020, 0.020, 0.012, 8]} />
        <meshStandardMaterial color={C.chromeDk} roughness={0.28} metalness={0.72} />
      </mesh>

      {/* ── Mixer tap — single lever ── */}
      {/* Base */}
      <mesh position={[0, 0.978, -0.13]}>
        <cylinderGeometry args={[0.020, 0.024, 0.018, 6]} />
        <meshStandardMaterial color={C.chrome} roughness={0.15} metalness={0.84} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 1.014, -0.13]}>
        <cylinderGeometry args={[0.014, 0.014, 0.090, 6]} />
        <meshStandardMaterial color={C.chrome} roughness={0.14} metalness={0.84} />
      </mesh>
      {/* Spout curve */}
      <mesh position={[0, 1.042, -0.06]} rotation={[Math.PI * 0.22, 0, 0]}>
        <cylinderGeometry args={[0.010, 0.010, 0.16, 6]} />
        <meshStandardMaterial color={C.chrome} roughness={0.15} metalness={0.84} />
      </mesh>
      {/* Lever handle */}
      <mesh position={[0.048, 1.022, -0.14]} rotation={[0.0, 0, Math.PI * 0.38]}>
        <boxGeometry args={[0.11, 0.010, 0.012]} />
        <meshStandardMaterial color={C.chromeDk} roughness={0.20} metalness={0.80} />
      </mesh>
    </group>
  );
}

// ── Walk-in shower with frameless glass partition ─────────────────────────────
export function Shower({ position, rotation = 0, size = 0.90 }: FP & { size?: number }) {
  const s = Math.max(size, 0.80);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Shower tray (raised 8 cm, tiled) ── */}
      <mesh position={[0, 0.042, 0]} receiveShadow>
        <boxGeometry args={[s, 0.084, s]} />
        <meshStandardMaterial color={C.tile} roughness={0.52} />
      </mesh>
      {/* Tray top edge reveal */}
      <mesh position={[0, 0.087, 0]}>
        <boxGeometry args={[s + 0.016, 0.010, s + 0.016]} />
        <meshStandardMaterial color={C.tileGrey} roughness={0.42} />
      </mesh>

      {/* ── Back glass panel ── */}
      <mesh position={[0, 1.12, -s / 2 + 0.006]} castShadow>
        <boxGeometry args={[s, 2.24, 0.010]} />
        <meshStandardMaterial
          color={C.glass} roughness={0.04} metalness={0.10}
          transparent opacity={0.22}
        />
      </mesh>
      {/* Back chrome profile (top) */}
      <mesh position={[0, 2.24, -s / 2 + 0.004]}>
        <boxGeometry args={[s + 0.010, 0.018, 0.018]} />
        <meshStandardMaterial color={C.chrome} roughness={0.18} metalness={0.80} />
      </mesh>

      {/* ── Side glass panel ── */}
      <mesh position={[-s / 2 + 0.006, 1.12, 0]} castShadow>
        <boxGeometry args={[0.010, 2.24, s]} />
        <meshStandardMaterial
          color={C.glass} roughness={0.04} metalness={0.10}
          transparent opacity={0.22}
        />
      </mesh>
      {/* Side chrome profile (top) */}
      <mesh position={[-s / 2 + 0.004, 2.24, 0]}>
        <boxGeometry args={[0.018, 0.018, s + 0.010]} />
        <meshStandardMaterial color={C.chrome} roughness={0.18} metalness={0.80} />
      </mesh>

      {/* ── Chrome corner upright ── */}
      <mesh position={[-s / 2 + 0.006, 1.12, -s / 2 + 0.006]} castShadow>
        <boxGeometry args={[0.020, 2.24, 0.020]} />
        <meshStandardMaterial color={C.chromeDk} roughness={0.16} metalness={0.82} />
      </mesh>

      {/* ── Overhead rain shower arm ── */}
      <mesh position={[-s / 2 + 0.040, 2.18, -s / 2 + 0.040]}>
        <cylinderGeometry args={[0.010, 0.010, 0.26, 6]} />
        <meshStandardMaterial color={C.chrome} roughness={0.16} metalness={0.82} />
      </mesh>
      {/* Horizontal arm */}
      <mesh
        position={[-s / 2 + 0.040 + 0.12, 2.18, -s / 2 + 0.040]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.009, 0.009, 0.26, 6]} />
        <meshStandardMaterial color={C.chrome} roughness={0.16} metalness={0.82} />
      </mesh>
      {/* Rain head */}
      <mesh
        position={[-s / 2 + 0.040 + 0.25, 2.16, -s / 2 + 0.040]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.100, 0.090, 0.022, 10]} />
        <meshStandardMaterial color={C.chromeDk} roughness={0.20} metalness={0.78} />
      </mesh>
      {/* Rain head face plate */}
      <mesh
        position={[-s / 2 + 0.040 + 0.26, 2.16, -s / 2 + 0.040]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.094, 0.094, 0.004, 10]} />
        <meshStandardMaterial color={C.chromeShd} roughness={0.40} metalness={0.65} />
      </mesh>

      {/* ── Wall mixer valve ── */}
      <mesh position={[-s / 2 + 0.006, 1.10, -s / 2 + 0.12]}>
        <boxGeometry args={[0.014, 0.060, 0.060]} />
        <meshStandardMaterial color={C.chrome} roughness={0.18} metalness={0.80} />
      </mesh>
      {/* Lever */}
      <mesh position={[-s / 2 + 0.020, 1.10, -s / 2 + 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 5]} />
        <meshStandardMaterial color={C.chromeDk} roughness={0.22} metalness={0.78} />
      </mesh>
    </group>
  );
}
