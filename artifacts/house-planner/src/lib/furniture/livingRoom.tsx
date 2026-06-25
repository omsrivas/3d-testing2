// ─── Premium Living Room Furniture ──────────────────────────────────────────
// Low-poly realism. All measurements in metres. Y=0 = floor.

type V3 = [number, number, number];
interface FP { position: V3; rotation?: number }

const C = {
  // Sofa — warm charcoal boucle
  sofaBody:    "#6A6560",
  sofaCushion: "#7C7570",
  sofaBack:    "#5E5A56",
  sofaArm:     "#68635E",
  sofaPillow:  "#C8BEB4",
  sofaLeg:     "#3A2E22",
  // Coffee table — white oak + warm brass
  tabletop:    "#C8B898",
  tableEdge:   "#B8A888",
  tableShelf:  "#B4A47E",
  tableLeg:    "#7A6040",
  tableBrass:  "#B89A60",
  // TV unit — matte white + walnut
  tvUnitBody:  "#ECEAE6",
  tvUnitWood:  "#8C6840",
  tvUnitPanel: "#E2E0DC",
  tvScreen:    "#0E1218",
  tvBezel:     "#1A1E24",
  tvHandle:    "#C0B8A8",
  tvLeg:       "#3A3430",
};

// ── Modern 3-seat sofa ────────────────────────────────────────────────────────
export function Sofa({ position, rotation = 0 }: FP) {
  const W = 2.20;   // total width
  const D = 0.96;   // total depth
  const SH = 0.44;  // seat height
  const BH = 0.86;  // back top height

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Platform base ── */}
      <mesh position={[0, 0.10, 0]} receiveShadow>
        <boxGeometry args={[W, 0.20, D]} />
        <meshStandardMaterial color={C.sofaBody} roughness={0.90} />
      </mesh>

      {/* ── Seat cushions × 3 (side-by-side with seam gap) ── */}
      {([-0.68, 0, 0.68] as number[]).map((x, i) => (
        <group key={i}>
          {/* Main cushion body */}
          <mesh position={[x, SH - 0.02, 0.06]} castShadow receiveShadow>
            <boxGeometry args={[0.65, 0.16, 0.76]} />
            <meshStandardMaterial color={C.sofaCushion} roughness={0.92} />
          </mesh>
          {/* Cushion top slight puff crown */}
          <mesh position={[x, SH + 0.05, 0.06]}>
            <boxGeometry args={[0.62, 0.06, 0.72]} />
            <meshStandardMaterial color={C.sofaCushion} roughness={0.94} />
          </mesh>
        </group>
      ))}

      {/* ── Back rest frame ── */}
      <mesh position={[0, (SH + BH) / 2, -D / 2 + 0.14]} castShadow receiveShadow>
        <boxGeometry args={[W - 0.28, BH - SH, 0.18]} />
        <meshStandardMaterial color={C.sofaBack} roughness={0.90} />
      </mesh>

      {/* ── Back cushions × 3 ── */}
      {([-0.68, 0, 0.68] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.68, -D / 2 + 0.21]} castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.36, 0.14]} />
          <meshStandardMaterial color={C.sofaCushion} roughness={0.93} />
        </mesh>
      ))}

      {/* ── Left arm ── */}
      <mesh position={[-(W / 2 - 0.10), 0.60, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.20, 0.26, D - 0.06]} />
        <meshStandardMaterial color={C.sofaArm} roughness={0.88} />
      </mesh>
      {/* Left arm cap (slightly wider) */}
      <mesh position={[-(W / 2 - 0.10), 0.74, 0]}>
        <boxGeometry args={[0.22, 0.06, D - 0.04]} />
        <meshStandardMaterial color={C.sofaBody} roughness={0.86} />
      </mesh>

      {/* ── Right arm ── */}
      <mesh position={[(W / 2 - 0.10), 0.60, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.20, 0.26, D - 0.06]} />
        <meshStandardMaterial color={C.sofaArm} roughness={0.88} />
      </mesh>
      <mesh position={[(W / 2 - 0.10), 0.74, 0]}>
        <boxGeometry args={[0.22, 0.06, D - 0.04]} />
        <meshStandardMaterial color={C.sofaBody} roughness={0.86} />
      </mesh>

      {/* ── Throw pillow (decorative, on left arm corner) ── */}
      <mesh position={[-(W / 2 - 0.28), 0.72, -0.22]} castShadow>
        <boxGeometry args={[0.42, 0.38, 0.10]} />
        <meshStandardMaterial color={C.sofaPillow} roughness={0.95} />
      </mesh>

      {/* ── Tapered walnut legs × 4 ── */}
      {([
        [-(W / 2 - 0.16), -(D / 2 - 0.12)],
        [ (W / 2 - 0.16), -(D / 2 - 0.12)],
        [-(W / 2 - 0.16),  (D / 2 - 0.12)],
        [ (W / 2 - 0.16),  (D / 2 - 0.12)],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.06, z]} castShadow>
          <cylinderGeometry args={[0.022, 0.030, 0.12, 4]} />
          <meshStandardMaterial color={C.sofaLeg} roughness={0.60} metalness={0.04} />
        </mesh>
      ))}
    </group>
  );
}

// ── Coffee Table — oak top, brass-accent hairpin legs ─────────────────────────
export function CenterTable({ position, rotation = 0 }: FP) {
  const TW = 1.20;
  const TD = 0.60;
  const TH = 0.42;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Tabletop */}
      <mesh position={[0, TH, 0]} castShadow receiveShadow>
        <boxGeometry args={[TW, 0.042, TD]} />
        <meshStandardMaterial color={C.tabletop} roughness={0.52} metalness={0.04} />
      </mesh>
      {/* Edge band (slightly darker) */}
      <mesh position={[0, TH - 0.006, 0]}>
        <boxGeometry args={[TW + 0.008, 0.030, TD + 0.008]} />
        <meshStandardMaterial color={C.tableEdge} roughness={0.60} />
      </mesh>
      {/* Lower shelf */}
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[TW - 0.08, 0.024, TD - 0.08]} />
        <meshStandardMaterial color={C.tableShelf} roughness={0.68} />
      </mesh>

      {/* Hairpin legs × 4 — two-rod style */}
      {([
        [-(TW / 2 - 0.10), -(TD / 2 - 0.09)],
        [ (TW / 2 - 0.10), -(TD / 2 - 0.09)],
        [-(TW / 2 - 0.10),  (TD / 2 - 0.09)],
        [ (TW / 2 - 0.10),  (TD / 2 - 0.09)],
      ] as [number, number][]).map(([x, z], i) => (
        <group key={i}>
          {/* Front rod */}
          <mesh position={[x, TH / 2, z - 0.02]} rotation={[0.10, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, TH, 5]} />
            <meshStandardMaterial color={C.tableBrass} roughness={0.30} metalness={0.80} />
          </mesh>
          {/* Back rod */}
          <mesh position={[x, TH / 2, z + 0.02]} rotation={[-0.10, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, TH, 5]} />
            <meshStandardMaterial color={C.tableBrass} roughness={0.30} metalness={0.80} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── TV Unit — floating low-profile, walnut + white ────────────────────────────
export function TVUnit({ position, rotation = 0 }: FP) {
  const UW = 1.80;
  const UH = 0.48;
  const UD = 0.44;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Cabinet body (appears floating — legs lift it 18 cm) */}
      <mesh position={[0, 0.18 + UH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[UW, UH, UD]} />
        <meshStandardMaterial color={C.tvUnitBody} roughness={0.84} />
      </mesh>

      {/* Walnut top surface */}
      <mesh position={[0, 0.18 + UH + 0.010, 0]}>
        <boxGeometry args={[UW + 0.012, 0.020, UD + 0.012]} />
        <meshStandardMaterial color={C.tvUnitWood} roughness={0.56} metalness={0.02} />
      </mesh>

      {/* 3 door panels with routed groove */}
      {([-0.58, 0, 0.58] as number[]).map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.18 + UH / 2, UD / 2 + 0.003]}>
            <boxGeometry args={[0.54, UH - 0.04, 0.010]} />
            <meshStandardMaterial color={C.tvUnitPanel} roughness={0.60} />
          </mesh>
          {/* Recessed horizontal handle groove */}
          <mesh position={[x, 0.18 + UH / 2 - 0.14, UD / 2 + 0.010]}>
            <boxGeometry args={[0.36, 0.018, 0.008]} />
            <meshStandardMaterial color={C.tvHandle} roughness={0.40} metalness={0.30} />
          </mesh>
        </group>
      ))}

      {/* Slender metal legs × 4 */}
      {([
        [-(UW / 2 - 0.14), -(UD / 2 - 0.10)],
        [ (UW / 2 - 0.14), -(UD / 2 - 0.10)],
        [-(UW / 2 - 0.14),  (UD / 2 - 0.10)],
        [ (UW / 2 - 0.14),  (UD / 2 - 0.10)],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.09, z]} castShadow>
          <cylinderGeometry args={[0.014, 0.014, 0.18, 4]} />
          <meshStandardMaterial color={C.tvLeg} roughness={0.42} metalness={0.60} />
        </mesh>
      ))}

      {/* ── TV (on top of unit) ── */}
      {/* Slim OLED bezel */}
      <mesh position={[0, 0.18 + UH + 0.52, 0.02]} castShadow>
        <boxGeometry args={[1.38, 0.80, 0.026]} />
        <meshStandardMaterial color={C.tvBezel} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Screen panel */}
      <mesh position={[0, 0.18 + UH + 0.52, 0.040]}>
        <boxGeometry args={[1.30, 0.72, 0.006]} />
        <meshStandardMaterial
          color={C.tvScreen} roughness={0.08} metalness={0.18}
          emissive="#050810" emissiveIntensity={0.20}
        />
      </mesh>
      {/* Thin stand neck */}
      <mesh position={[0, 0.18 + UH + 0.030, 0.010]}>
        <boxGeometry args={[0.08, 0.06, 0.04]} />
        <meshStandardMaterial color={C.tvBezel} roughness={0.40} metalness={0.50} />
      </mesh>
    </group>
  );
}
