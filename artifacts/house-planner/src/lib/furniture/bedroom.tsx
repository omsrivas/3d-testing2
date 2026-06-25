// ─── Premium Bedroom Furniture ───────────────────────────────────────────────
// Low-poly realism. All measurements in metres.

type V3 = [number, number, number];
interface FP { position: V3; rotation?: number }

const C = {
  // Platform bed — walnut frame
  bedFrame:     "#6A4E2C",
  bedFrameDark: "#4A3218",
  bedRail:      "#7A5C36",
  // Headboard — upholstered linen
  headboard:    "#8C8480",
  headChannel:  "#7A7270",
  headPin:      "#C0B8A8",
  // Bedding
  mattress:     "#EDE8E2",
  linen:        "#F4F0EC",
  sheet:        "#E8E4DC",
  pillow:       "#F8F5F0",
  throw:        "#C8B8A0",
  // Wardrobe — matte white + walnut
  wardBody:     "#EDEDEA",
  wardPanel:    "#E2E0DC",
  wardWood:     "#8A6538",
  wardHandle:   "#C8C4BC",
  wardMirror:   "#B8C8D0",
  wardBase:     "#D8D5D0",
  // Side table — Scandinavian
  stWood:       "#C8B07A",
  stWoodDark:   "#9A7848",
  stLeg:        "#786040",
  stHandle:     "#B8B0A0",
};

// ── Platform Bed ──────────────────────────────────────────────────────────────
// isMaster → King size (1.84 m wide), else Double (1.64 m)
export function Bed({ position, rotation = 0, isMaster = false }: FP & { isMaster?: boolean }) {
  const BW = isMaster ? 1.84 : 1.64;
  const BL = 2.08;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Low platform frame ── */}
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[BW, 0.28, BL]} />
        <meshStandardMaterial color={C.bedFrame} roughness={0.70} metalness={0.02} />
      </mesh>
      {/* Side rails (raised edge) */}
      {([-BW / 2 + 0.040, BW / 2 - 0.040] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.32, 0.10]}>
          <boxGeometry args={[0.060, 0.060, BL - 0.20]} />
          <meshStandardMaterial color={C.bedRail} roughness={0.68} />
        </mesh>
      ))}
      {/* Foot rail */}
      <mesh position={[0, 0.32, BL / 2 - 0.050]}>
        <boxGeometry args={[BW, 0.060, 0.060]} />
        <meshStandardMaterial color={C.bedRail} roughness={0.68} />
      </mesh>

      {/* ── Mattress ── */}
      <mesh position={[0, 0.38, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[BW - 0.040, 0.24, BL - 0.10]} />
        <meshStandardMaterial color={C.mattress} roughness={0.94} />
      </mesh>

      {/* ── Fitted sheet ── */}
      <mesh position={[0, 0.505, 0.06]} receiveShadow>
        <boxGeometry args={[BW - 0.05, 0.014, BL - 0.12]} />
        <meshStandardMaterial color={C.linen} roughness={0.96} />
      </mesh>

      {/* ── Top sheet / duvet (folded back 30% from head) ── */}
      <mesh position={[0, 0.516, 0.28]}>
        <boxGeometry args={[BW - 0.06, 0.020, BL * 0.70]} />
        <meshStandardMaterial color={C.sheet} roughness={0.95} />
      </mesh>
      {/* Fold-back ridge */}
      <mesh position={[0, 0.528, -(BL * 0.35 - 0.05)]}>
        <boxGeometry args={[BW - 0.07, 0.026, 0.08]} />
        <meshStandardMaterial color={C.sheet} roughness={0.93} />
      </mesh>

      {/* ── Pillows ── */}
      {(isMaster ? [-0.54, 0.54] : [-0.40, 0.40] as number[]).map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.545, -(BL / 2 - 0.32)]} castShadow receiveShadow>
            <boxGeometry args={[0.68, 0.090, 0.46]} />
            <meshStandardMaterial color={C.pillow} roughness={0.96} />
          </mesh>
          {/* Pillow crown puff */}
          <mesh position={[x, 0.578, -(BL / 2 - 0.32)]}>
            <boxGeometry args={[0.64, 0.032, 0.42]} />
            <meshStandardMaterial color={C.pillow} roughness={0.97} />
          </mesh>
        </group>
      ))}

      {/* ── Throw blanket (folded at foot) ── */}
      <mesh position={[0, 0.520, BL / 2 - 0.24]}>
        <boxGeometry args={[BW - 0.20, 0.022, 0.44]} />
        <meshStandardMaterial color={C.throw} roughness={0.96} />
      </mesh>

      {/* ── Upholstered headboard ── */}
      {/* Main panel */}
      <mesh position={[0, 0.82, -(BL / 2 - 0.050)]} castShadow receiveShadow>
        <boxGeometry args={[BW, 1.04, 0.090]} />
        <meshStandardMaterial color={C.headboard} roughness={0.86} />
      </mesh>
      {/* Channel-tufted seam grid (horizontal bands) */}
      {([0.18, 0.42, 0.66, 0.90] as number[]).map((dy, i) => (
        <mesh key={i} position={[0, 0.28 + dy, -(BL / 2 - 0.050) + 0.048]}>
          <boxGeometry args={[BW - 0.10, 0.014, 0.006]} />
          <meshStandardMaterial color={C.headChannel} roughness={0.82} />
        </mesh>
      ))}
      {/* Tuft pins at intersections */}
      {([0.18, 0.42, 0.66] as number[]).flatMap((dy, yi) =>
        ([-0.60, 0, 0.60] as number[]).map((x, xi) => (
          <mesh key={`${yi}-${xi}`} position={[x, 0.28 + dy, -(BL / 2 - 0.050) + 0.050]}>
            <cylinderGeometry args={[0.018, 0.018, 0.010, 5]} />
            <meshStandardMaterial color={C.headPin} roughness={0.40} metalness={0.30} />
          </mesh>
        ))
      )}
      {/* Headboard walnut base strip */}
      <mesh position={[0, 0.28 + 0.02, -(BL / 2 - 0.030)]}>
        <boxGeometry args={[BW + 0.010, 0.060, 0.110]} />
        <meshStandardMaterial color={C.bedFrameDark} roughness={0.65} />
      </mesh>

      {/* ── Legs × 4 ── */}
      {([
        [-(BW / 2 - 0.08), -(BL / 2 - 0.09)],
        [ (BW / 2 - 0.08), -(BL / 2 - 0.09)],
        [-(BW / 2 - 0.08),  (BL / 2 - 0.09)],
        [ (BW / 2 - 0.08),  (BL / 2 - 0.09)],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.040, z]}>
          <boxGeometry args={[0.068, 0.080, 0.068]} />
          <meshStandardMaterial color={C.bedFrameDark} roughness={0.62} />
        </mesh>
      ))}
    </group>
  );
}

// ── Sliding Door Wardrobe ─────────────────────────────────────────────────────
export function Wardrobe({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Body ── */}
      <mesh position={[0, 1.10, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.84, 2.20, 0.62]} />
        <meshStandardMaterial color={C.wardBody} roughness={0.82} />
      </mesh>

      {/* ── Top cornice ── */}
      <mesh position={[0, 2.215, 0]}>
        <boxGeometry args={[1.87, 0.055, 0.65]} />
        <meshStandardMaterial color={C.wardWood} roughness={0.58} metalness={0.02} />
      </mesh>

      {/* ── Base plinth ── */}
      <mesh position={[0, 0.040, 0]}>
        <boxGeometry args={[1.84, 0.080, 0.62]} />
        <meshStandardMaterial color={C.wardBase} roughness={0.72} />
      </mesh>

      {/* ── 3 sliding door panels ── */}
      {/* Panel 0 — frosted white */}
      <mesh position={[-0.60, 1.10, 0.316]}>
        <boxGeometry args={[0.57, 2.12, 0.016]} />
        <meshStandardMaterial color={C.wardPanel} roughness={0.58} />
      </mesh>
      {/* Panel 1 — mirror (reflective) */}
      <mesh position={[0.01, 1.10, 0.320]}>
        <boxGeometry args={[0.57, 2.12, 0.016]} />
        <meshStandardMaterial
          color={C.wardMirror} roughness={0.04} metalness={0.88}
        />
      </mesh>
      {/* Panel 2 — frosted white */}
      <mesh position={[0.60, 1.10, 0.316]}>
        <boxGeometry args={[0.57, 2.12, 0.016]} />
        <meshStandardMaterial color={C.wardPanel} roughness={0.58} />
      </mesh>

      {/* ── Horizontal handle bar on each panel ── */}
      {([-0.60, 0.01, 0.60] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 1.10, 0.330]}>
          <boxGeometry args={[0.42, 0.018, 0.012]} />
          <meshStandardMaterial color={C.wardHandle} roughness={0.28} metalness={0.55} />
        </mesh>
      ))}

      {/* ── Walnut panel dividers (between doors, frame lines) ── */}
      {([-0.31, 0.31] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 1.10, 0.313]}>
          <boxGeometry args={[0.018, 2.12, 0.006]} />
          <meshStandardMaterial color={C.wardWood} roughness={0.58} />
        </mesh>
      ))}
    </group>
  );
}

// ── Bedside / Side Table ──────────────────────────────────────────────────────
export function SideTable({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Round top ── */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.034, 10]} />
        <meshStandardMaterial color={C.stWood} roughness={0.54} metalness={0.02} />
      </mesh>
      {/* Edge banding */}
      <mesh position={[0, 0.533, 0]}>
        <cylinderGeometry args={[0.264, 0.264, 0.012, 10, 1, true]} />
        <meshStandardMaterial color={C.stWoodDark} roughness={0.62} />
      </mesh>

      {/* ── Drawer body ── */}
      <mesh position={[0, 0.34, 0]} receiveShadow>
        <boxGeometry args={[0.48, 0.30, 0.48]} />
        <meshStandardMaterial color={C.stWood} roughness={0.68} />
      </mesh>
      {/* Drawer face */}
      <mesh position={[0, 0.34, 0.247]}>
        <boxGeometry args={[0.44, 0.26, 0.010]} />
        <meshStandardMaterial color={C.stWoodDark} roughness={0.56} metalness={0.01} />
      </mesh>
      {/* Drawer handle (small bar) */}
      <mesh position={[0, 0.34, 0.255]}>
        <boxGeometry args={[0.14, 0.014, 0.010]} />
        <meshStandardMaterial color={C.stHandle} roughness={0.28} metalness={0.60} />
      </mesh>

      {/* ── 3 pin hairpin-style legs ── */}
      {([0, 1, 2] as number[]).map((i) => {
        const a = (Math.PI * 2 / 3) * i + Math.PI / 6;
        const r = 0.18;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * r, 0.10, Math.cos(a) * r]}
            castShadow
          >
            <cylinderGeometry args={[0.010, 0.014, 0.20, 5]} />
            <meshStandardMaterial color={C.stLeg} roughness={0.55} metalness={0.15} />
          </mesh>
        );
      })}
    </group>
  );
}
