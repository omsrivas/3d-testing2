// ─── Premium Kitchen Furniture ────────────────────────────────────────────────
// Modern handle-less cabinetry, thick marble worktop, professional hob.
// All measurements in metres.

type V3 = [number, number, number];
interface FP { position: V3; rotation?: number }

const C = {
  // Cabinetry — warm white lower, pale ash upper
  cabinetLower: "#E8E5E0",
  cabinetUpper: "#F2F0EC",
  cabinetPanel: "#DEDAD4",
  // Worktop — carrara marble-look
  worktop:      "#DDD9D4",
  worktopVein:  "#C8C4BC",
  worktopEdge:  "#CCCAC4",
  // Plinth
  plinth:       "#B8B4AE",
  // Stainless steel
  steel:        "#BFC4CA",
  steelDark:    "#8A9098",
  steelInner:   "#70787E",
  // Tap / hardware
  tap:          "#C8CDD2",
  tapDark:      "#9CA3AC",
  // Stove
  hob:          "#282830",
  hobDark:      "#1A1A22",
  grate:        "#3A3A44",
  knob:         "#E0DDD8",
  knobDark:     "#B8B4AE",
};

// ── Kitchen Counter run ───────────────────────────────────────────────────────
// length = along local X axis. hasUpperCabinets controls wall units.
export function CounterRun({
  position, rotation = 0, length, hasUpperCabinets = true,
}: FP & { length: number; hasUpperCabinets?: boolean }) {
  const l  = Math.max(length, 0.60);
  const nD = Math.max(1, Math.round(l / 0.58));  // number of doors
  const dW = l / nD;                               // door width

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Base cabinet body ── */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, 0.88, 0.62]} />
        <meshStandardMaterial color={C.cabinetLower} roughness={0.84} />
      </mesh>

      {/* ── Plinth strip ── */}
      <mesh position={[0, 0.055, 0.05]}>
        <boxGeometry args={[l, 0.110, 0.60]} />
        <meshStandardMaterial color={C.plinth} roughness={0.78} />
      </mesh>

      {/* ── Handle-less door faces (push-to-open recess line at top) ── */}
      {Array.from({ length: nD }, (_, i) => {
        const cx = -l / 2 + dW * (i + 0.5);
        return (
          <group key={i}>
            <mesh position={[cx, 0.46, 0.315]}>
              <boxGeometry args={[dW - 0.030, 0.82, 0.012]} />
              <meshStandardMaterial color={C.cabinetPanel} roughness={0.64} />
            </mesh>
            {/* Top push recess groove */}
            <mesh position={[cx, 0.88, 0.318]}>
              <boxGeometry args={[dW - 0.050, 0.016, 0.008]} />
              <meshStandardMaterial color={C.plinth} roughness={0.55} metalness={0.10} />
            </mesh>
          </group>
        );
      })}

      {/* ── Worktop — thick quartz/marble slab ── */}
      <mesh position={[0, 0.920, 0.034]} castShadow receiveShadow>
        <boxGeometry args={[l, 0.044, 0.664]} />
        <meshStandardMaterial color={C.worktop} roughness={0.38} metalness={0.06} />
      </mesh>
      {/* Worktop front edge reveal */}
      <mesh position={[0, 0.898, 0.360]}>
        <boxGeometry args={[l, 0.044, 0.008]} />
        <meshStandardMaterial color={C.worktopEdge} roughness={0.42} metalness={0.04} />
      </mesh>

      {/* ── Upper wall cabinets ── */}
      {hasUpperCabinets && (
        <>
          <mesh position={[0, 1.66, -0.13]} castShadow>
            <boxGeometry args={[l, 0.68, 0.36]} />
            <meshStandardMaterial color={C.cabinetUpper} roughness={0.82} />
          </mesh>
          {/* Upper door faces */}
          {Array.from({ length: Math.max(1, Math.round(l / 0.54)) }, (_, i) => {
            const nU = Math.max(1, Math.round(l / 0.54));
            const uW = l / nU;
            const cx = -l / 2 + uW * (i + 0.5);
            return (
              <group key={i}>
                <mesh position={[cx, 1.66, 0.052]}>
                  <boxGeometry args={[uW - 0.028, 0.64, 0.012]} />
                  <meshStandardMaterial color={C.cabinetPanel} roughness={0.60} />
                </mesh>
                {/* Bottom push recess */}
                <mesh position={[cx, 1.34, 0.056]}>
                  <boxGeometry args={[uW - 0.050, 0.014, 0.008]} />
                  <meshStandardMaterial color={C.plinth} roughness={0.55} metalness={0.10} />
                </mesh>
              </group>
            );
          })}
        </>
      )}
    </group>
  );
}

// ── Undermount sink with gooseneck mixer ──────────────────────────────────────
export function Sink({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Sink outer shell (sits flush in worktop) */}
      <mesh position={[0, 0.910, 0]} receiveShadow>
        <boxGeometry args={[0.54, 0.068, 0.40]} />
        <meshStandardMaterial color={C.steel} roughness={0.18} metalness={0.84} />
      </mesh>
      {/* Inner basin (deeper, darker) */}
      <mesh position={[0, 0.885, 0]}>
        <boxGeometry args={[0.48, 0.068, 0.34]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.22} metalness={0.82} />
      </mesh>
      {/* Basin floor */}
      <mesh position={[0, 0.850, 0]}>
        <boxGeometry args={[0.46, 0.006, 0.32]} />
        <meshStandardMaterial color={C.steelInner} roughness={0.26} metalness={0.80} />
      </mesh>
      {/* Drain */}
      <mesh position={[0, 0.851, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.010, 8]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.35} metalness={0.75} />
      </mesh>

      {/* ── Gooseneck tap body ── */}
      <mesh position={[0, 0.968, -0.13]}>
        <cylinderGeometry args={[0.016, 0.022, 0.096, 6]} />
        <meshStandardMaterial color={C.tap} roughness={0.16} metalness={0.82} />
      </mesh>
      {/* Goose neck arch */}
      <mesh position={[0, 1.06, -0.04]} rotation={[Math.PI * 0.28, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.22, 6]} />
        <meshStandardMaterial color={C.tap} roughness={0.16} metalness={0.82} />
      </mesh>
      {/* Spout */}
      <mesh position={[0, 1.06, 0.10]} rotation={[Math.PI * 0.12, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.013, 0.12, 6]} />
        <meshStandardMaterial color={C.tap} roughness={0.18} metalness={0.80} />
      </mesh>

      {/* Lever handle */}
      <mesh position={[-0.09, 0.975, -0.13]} rotation={[0, 0, Math.PI * 0.30]}>
        <cylinderGeometry args={[0.007, 0.007, 0.12, 5]} />
        <meshStandardMaterial color={C.tapDark} roughness={0.22} metalness={0.78} />
      </mesh>
    </group>
  );
}

// ── Professional gas hob ──────────────────────────────────────────────────────
export function Stove({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Hob plate (glass-ceramic look) */}
      <mesh position={[0, 0.928, 0]} receiveShadow>
        <boxGeometry args={[0.64, 0.022, 0.60]} />
        <meshStandardMaterial color={C.hob} roughness={0.22} metalness={0.40} />
      </mesh>
      {/* Hob surround trim */}
      <mesh position={[0, 0.929, 0]}>
        <boxGeometry args={[0.65, 0.010, 0.61]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.28} metalness={0.60} />
      </mesh>

      {/* ── 4 burners ── */}
      {([
        [-0.16, -0.15], [0.16, -0.15], [-0.16, 0.15], [0.16, 0.15],
      ] as [number, number][]).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Cast iron grate ring */}
          <mesh position={[0, 0.942, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.018, 8, 1, true]} />
            <meshStandardMaterial color={C.grate} roughness={0.78} metalness={0.20} />
          </mesh>
          {/* Burner head */}
          <mesh position={[0, 0.950, 0]}>
            <cylinderGeometry args={[0.044, 0.052, 0.016, 8]} />
            <meshStandardMaterial color={C.hobDark} roughness={0.55} metalness={0.30} />
          </mesh>
          {/* Burner cap */}
          <mesh position={[0, 0.960, 0]}>
            <cylinderGeometry args={[0.032, 0.038, 0.012, 8]} />
            <meshStandardMaterial color={C.grate} roughness={0.60} metalness={0.22} />
          </mesh>
          {/* Grate legs × 3 */}
          {Array.from({ length: 3 }, (_, k) => {
            const a = (Math.PI * 2 / 3) * k;
            return (
              <mesh
                key={k}
                position={[Math.sin(a) * 0.058, 0.948, Math.cos(a) * 0.058]}
                rotation={[0, a, 0]}
              >
                <boxGeometry args={[0.010, 0.022, 0.028]} />
                <meshStandardMaterial color={C.grate} roughness={0.76} metalness={0.18} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* ── Control knobs × 4 ── */}
      {([-0.23, -0.077, 0.077, 0.23] as number[]).map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.942, 0.270]}>
            <cylinderGeometry args={[0.020, 0.020, 0.028, 8]} />
            <meshStandardMaterial color={C.knob} roughness={0.50} metalness={0.10} />
          </mesh>
          {/* Indicator line */}
          <mesh position={[x, 0.957, 0.268]}>
            <boxGeometry args={[0.003, 0.012, 0.004]} />
            <meshStandardMaterial color={C.knobDark} roughness={0.60} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
