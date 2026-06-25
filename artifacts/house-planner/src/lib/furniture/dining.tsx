// ─── Premium Dining Furniture ────────────────────────────────────────────────
// Low-poly realism. All measurements in metres.

type V3 = [number, number, number];
interface FP { position: V3; rotation?: number }

const C = {
  // Table — solid oak
  tabletop:   "#B8935A",
  tableEdge:  "#A8844E",
  tableApron: "#7A5C35",
  tableLeg:   "#6A4E2C",
  // Chair — walnut frame, warm linen seat
  chairWood:  "#7A5A30",
  chairDark:  "#4E3518",
  chairSeat:  "#B8A890",
  chairBack:  "#C4B89E",
};

// ── Dining Table — solid oak, tapered square legs ─────────────────────────────
export function DiningTable({ position, rotation = 0 }: FP) {
  const TW = 1.55;
  const TD = 0.88;
  const TH = 0.75;

  const aprons = [
    { p: [0, TH - 0.034, -(TD / 2 - 0.020)] as V3, a: [TW - 0.14, 0.068, 0.022] as V3 },
    { p: [0, TH - 0.034,  (TD / 2 - 0.020)] as V3, a: [TW - 0.14, 0.068, 0.022] as V3 },
    { p: [-(TW / 2 - 0.020), TH - 0.034, 0] as V3, a: [0.022, 0.068, TD - 0.14] as V3 },
    { p: [ (TW / 2 - 0.020), TH - 0.034, 0] as V3, a: [0.022, 0.068, TD - 0.14] as V3 },
  ];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Tabletop */}
      <mesh position={[0, TH, 0]} castShadow receiveShadow>
        <boxGeometry args={[TW, 0.048, TD]} />
        <meshStandardMaterial color={C.tabletop} roughness={0.52} metalness={0.02} />
      </mesh>
      {/* Edge band */}
      <mesh position={[0, TH - 0.012, 0]}>
        <boxGeometry args={[TW + 0.006, 0.024, TD + 0.006]} />
        <meshStandardMaterial color={C.tableEdge} roughness={0.62} />
      </mesh>

      {/* Apron frame */}
      {aprons.map(({ p, a }, i) => (
        <mesh key={i} position={p} castShadow>
          <boxGeometry args={a} />
          <meshStandardMaterial color={C.tableApron} roughness={0.68} />
        </mesh>
      ))}

      {/* Tapered legs × 4 */}
      {([
        [-(TW / 2 - 0.075), -(TD / 2 - 0.075)],
        [ (TW / 2 - 0.075), -(TD / 2 - 0.075)],
        [-(TW / 2 - 0.075),  (TD / 2 - 0.075)],
        [ (TW / 2 - 0.075),  (TD / 2 - 0.075)],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, TH / 2 - 0.024, z]} castShadow>
          {/* Taper: slightly narrower at foot */}
          <cylinderGeometry args={[0.026, 0.038, TH - 0.048, 4]} />
          <meshStandardMaterial color={C.tableLeg} roughness={0.65} metalness={0.01} />
        </mesh>
      ))}
    </group>
  );
}

// ── Dining Chair — mid-century with upholstered seat ─────────────────────────
export function DiningChair({ position, rotation = 0 }: FP) {
  const SW = 0.46;   // seat width
  const SD = 0.44;   // seat depth
  const SH = 0.46;   // seat height
  const BH = 0.96;   // back top height

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Seat frame (wood) ── */}
      <mesh position={[0, SH - 0.012, 0]} castShadow receiveShadow>
        <boxGeometry args={[SW, 0.030, SD]} />
        <meshStandardMaterial color={C.chairWood} roughness={0.68} />
      </mesh>
      {/* Upholstered seat pad */}
      <mesh position={[0, SH + 0.028, 0]} castShadow receiveShadow>
        <boxGeometry args={[SW - 0.04, 0.068, SD - 0.04]} />
        <meshStandardMaterial color={C.chairSeat} roughness={0.92} />
      </mesh>
      {/* Seat cushion crown (slight puff) */}
      <mesh position={[0, SH + 0.058, 0]}>
        <boxGeometry args={[SW - 0.07, 0.020, SD - 0.07]} />
        <meshStandardMaterial color={C.chairSeat} roughness={0.94} />
      </mesh>

      {/* ── Back uprights × 2 ── */}
      {([-0.17, 0.17] as number[]).map((x, i) => (
        <mesh key={i} position={[x, (SH + BH) / 2, -(SD / 2 - 0.022)]} castShadow>
          <boxGeometry args={[0.030, BH - SH, 0.030]} />
          <meshStandardMaterial color={C.chairDark} roughness={0.62} />
        </mesh>
      ))}

      {/* ── Back top rail ── */}
      <mesh position={[0, BH - 0.020, -(SD / 2 - 0.022)]} castShadow>
        <boxGeometry args={[SW - 0.02, 0.042, 0.032]} />
        <meshStandardMaterial color={C.chairDark} roughness={0.62} />
      </mesh>

      {/* ── Back splat (wide middle back panel) ── */}
      <mesh position={[0, (SH + BH) / 2 + 0.02, -(SD / 2 - 0.018)]}>
        <boxGeometry args={[SW - 0.10, BH - SH - 0.10, 0.016]} />
        <meshStandardMaterial color={C.chairBack} roughness={0.85} />
      </mesh>

      {/* ── Legs × 4 (tapered, slightly raked) ── */}
      {([
        [-(SW / 2 - 0.055), -(SD / 2 - 0.055)],
        [ (SW / 2 - 0.055), -(SD / 2 - 0.055)],
        [-(SW / 2 - 0.055),  (SD / 2 - 0.055)],
        [ (SW / 2 - 0.055),  (SD / 2 - 0.055)],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, SH / 2 - 0.015, z]} castShadow>
          <cylinderGeometry args={[0.016, 0.022, SH - 0.030, 4]} />
          <meshStandardMaterial color={C.chairDark} roughness={0.64} metalness={0.01} />
        </mesh>
      ))}

      {/* ── Cross stretchers ── */}
      {([-SD / 2 + 0.055, SD / 2 - 0.055] as number[]).map((z, i) => (
        <mesh key={i} position={[0, 0.22, z]}>
          <boxGeometry args={[SW - 0.12, 0.012, 0.012]} />
          <meshStandardMaterial color={C.chairDark} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}
