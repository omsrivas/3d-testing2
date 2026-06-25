// ─── Premium Workspace Furniture ─────────────────────────────────────────────
// Low-poly realism. All measurements in metres.

type V3 = [number, number, number];
interface FP { position: V3; rotation?: number }

const C = {
  // Desk — oak top, matte white frame
  deskTop:     "#C8B88A",
  deskEdge:    "#B4A47A",
  deskFrame:   "#EBEBEA",
  deskDrawer:  "#E0DEDA",
  deskLeg:     "#D0CEC8",
  deskHandle:  "#C0BAB0",
  deskSide:    "#D8D6D2",
  // Chair — black mesh + dark aluminium
  chairSeat:   "#3A3A3A",
  chairMesh:   "#2E2E2E",
  chairBack:   "#323232",
  chairArm:    "#2A2A2A",
  chairArmPad: "#484848",
  chairBase:   "#3C3C3C",
  chairCaster: "#2A2A2A",
  chairPiston: "#909090",
};

// ── Writing Desk ──────────────────────────────────────────────────────────────
// A minimal standing-height desk with one drawer pedestal and cable slot.
export function Desk({ position, rotation = 0 }: FP) {
  const DW = 1.40;   // total width (left-right)
  const DD = 0.70;   // depth (front-back)
  const DH = 0.75;   // desk height

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Desktop surface ── */}
      <mesh position={[0, DH, 0]} castShadow receiveShadow>
        <boxGeometry args={[DW, 0.036, DD]} />
        <meshStandardMaterial color={C.deskTop} roughness={0.50} metalness={0.02} />
      </mesh>
      {/* Front edge band (slightly darker) */}
      <mesh position={[0, DH - 0.006, DD / 2 - 0.002]}>
        <boxGeometry args={[DW + 0.004, 0.024, 0.010]} />
        <meshStandardMaterial color={C.deskEdge} roughness={0.58} />
      </mesh>

      {/* ── Frame back panel (structural, matte white) ── */}
      <mesh position={[0, DH / 2, -(DD / 2 - 0.018)]} castShadow>
        <boxGeometry args={[DW, DH, 0.028]} />
        <meshStandardMaterial color={C.deskFrame} roughness={0.80} />
      </mesh>

      {/* ── Left leg (solid rect) ── */}
      <mesh position={[-(DW / 2 - 0.040), DH / 2, 0.02]} castShadow>
        <boxGeometry args={[0.048, DH, 0.048]} />
        <meshStandardMaterial color={C.deskLeg} roughness={0.76} />
      </mesh>

      {/* ── Right drawer pedestal ── */}
      <mesh position={[(DW / 2 - 0.17), DH / 2 - 0.018, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[0.30, DH - 0.036, DD - 0.04]} />
        <meshStandardMaterial color={C.deskDrawer} roughness={0.78} />
      </mesh>
      {/* 3 drawer faces */}
      {([0.62, 0.38, 0.14] as number[]).map((yf, i) => (
        <group key={i}>
          <mesh position={[(DW / 2 - 0.17), yf, DD / 2 - 0.005]}>
            <boxGeometry args={[0.28, 0.18, 0.010]} />
            <meshStandardMaterial color={C.deskSide} roughness={0.62} />
          </mesh>
          {/* Bar handle */}
          <mesh position={[(DW / 2 - 0.17), yf, DD / 2 + 0.005]}>
            <boxGeometry args={[0.16, 0.012, 0.008]} />
            <meshStandardMaterial color={C.deskHandle} roughness={0.30} metalness={0.52} />
          </mesh>
        </group>
      ))}

      {/* ── Monitor stand riser (accessory) ── */}
      <mesh position={[-(DW / 2 - 0.30), DH + 0.040, -(DD / 2 - 0.22)]} castShadow>
        <boxGeometry args={[0.36, 0.080, 0.22]} />
        <meshStandardMaterial color={C.deskFrame} roughness={0.74} />
      </mesh>
    </group>
  );
}

// ── Ergonomic Desk Chair ──────────────────────────────────────────────────────
export function DeskChair({ position, rotation = 0 }: FP) {
  const SH = 0.46;  // seat height

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Seat pan ── */}
      <mesh position={[0, SH, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.062, 0.50]} />
        <meshStandardMaterial color={C.chairSeat} roughness={0.88} />
      </mesh>
      {/* Seat crown (slight puff) */}
      <mesh position={[0, SH + 0.028, -0.02]}>
        <boxGeometry args={[0.48, 0.024, 0.46]} />
        <meshStandardMaterial color={C.chairSeat} roughness={0.90} />
      </mesh>

      {/* ── Backrest shell ── */}
      <mesh position={[0, SH + 0.28, -0.22]} castShadow>
        <boxGeometry args={[0.48, 0.62, 0.050]} />
        <meshStandardMaterial color={C.chairBack} roughness={0.72} />
      </mesh>
      {/* Mesh panel inset */}
      <mesh position={[0, SH + 0.28, -0.200]}>
        <boxGeometry args={[0.40, 0.52, 0.018]} />
        <meshStandardMaterial color={C.chairMesh} roughness={0.80} />
      </mesh>
      {/* Lumbar support bulge */}
      <mesh position={[0, SH + 0.13, -0.196]}>
        <boxGeometry args={[0.32, 0.12, 0.022]} />
        <meshStandardMaterial color={C.chairBack} roughness={0.70} />
      </mesh>

      {/* ── Back lower bracket ── */}
      <mesh position={[0, SH + 0.020, -0.14]}>
        <boxGeometry args={[0.10, 0.040, 0.18]} />
        <meshStandardMaterial color={C.chairBase} roughness={0.60} metalness={0.20} />
      </mesh>

      {/* ── Armrests × 2 ── */}
      {([-0.28, 0.28] as number[]).map((x, i) => (
        <group key={i}>
          {/* Arm support column */}
          <mesh position={[x, SH - 0.06, 0]} castShadow>
            <boxGeometry args={[0.040, 0.22, 0.040]} />
            <meshStandardMaterial color={C.chairArm} roughness={0.56} metalness={0.22} />
          </mesh>
          {/* Padded arm rest */}
          <mesh position={[x, SH + 0.14, 0.02]} castShadow>
            <boxGeometry args={[0.060, 0.030, 0.22]} />
            <meshStandardMaterial color={C.chairArmPad} roughness={0.88} />
          </mesh>
        </group>
      ))}

      {/* ── Gas piston ── */}
      <mesh position={[0, SH / 2, 0]}>
        <cylinderGeometry args={[0.030, 0.030, SH - 0.08, 6]} />
        <meshStandardMaterial color={C.chairPiston} roughness={0.30} metalness={0.72} />
      </mesh>

      {/* ── 5-star base ── */}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (Math.PI * 2 / 5) * i + Math.PI / 10;
        return (
          <group key={i} rotation={[0, a, 0]}>
            {/* Arm */}
            <mesh position={[0, 0.055, 0.22]} castShadow>
              <boxGeometry args={[0.038, 0.032, 0.44]} />
              <meshStandardMaterial color={C.chairBase} roughness={0.55} metalness={0.22} />
            </mesh>
            {/* Caster */}
            <mesh position={[0, 0.030, 0.42]}>
              <sphereGeometry args={[0.030, 6, 4]} />
              <meshStandardMaterial color={C.chairCaster} roughness={0.62} metalness={0.18} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
