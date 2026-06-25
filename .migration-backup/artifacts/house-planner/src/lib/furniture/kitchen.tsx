// ─── Kitchen furniture ─────────────────────────────────────────────────────

const C = {
  cabinet:  "#D0C8BE",
  worktop:  "#C8C4BC",
  marble:   "#D8D4CC",
  steel:    "#B4B8BF",
  steelDark:"#8A8E94",
  knob:     "#C0C4C8",
  burner:   "#2A2A2A",
  frame:    "#9A8E80",
};

interface FP { position: [number, number, number]; rotation?: number }

// ── Kitchen Counter segment ────────────────────────────────────────────────────
// A single run of base cabinets + worktop + upper cabinets.
export function CounterRun({
  position,
  rotation = 0,
  length,          // along local X
  hasUpperCabinets = true,
}: FP & { length: number; hasUpperCabinets?: boolean }) {
  const l = Math.max(length, 0.6);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Base cabinet body */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, 0.88, 0.62]} />
        <meshStandardMaterial color={C.cabinet} roughness={0.82} />
      </mesh>
      {/* Worktop */}
      <mesh position={[0, 0.90, 0.03]} castShadow receiveShadow>
        <boxGeometry args={[l, 0.04, 0.66]} />
        <meshStandardMaterial color={C.marble} roughness={0.45} metalness={0.06} />
      </mesh>
      {/* Plinth */}
      <mesh position={[0, 0.05, 0.05]}>
        <boxGeometry args={[l, 0.10, 0.60]} />
        <meshStandardMaterial color={C.frame} roughness={0.80} />
      </mesh>
      {/* Cabinet door faces */}
      {Array.from({ length: Math.max(1, Math.round(l / 0.60)) }, (_, i) => {
        const segW = l / Math.max(1, Math.round(l / 0.60));
        const cx = -l / 2 + segW * (i + 0.5);
        return (
          <mesh key={i} position={[cx, 0.46, 0.315]}>
            <boxGeometry args={[segW - 0.04, 0.80, 0.012]} />
            <meshStandardMaterial color={C.worktop} roughness={0.60} />
          </mesh>
        );
      })}
      {/* Knobs */}
      {Array.from({ length: Math.max(1, Math.round(l / 0.60)) }, (_, i) => {
        const segW = l / Math.max(1, Math.round(l / 0.60));
        const cx = -l / 2 + segW * (i + 0.5) + segW * 0.3;
        return (
          <mesh key={i} position={[cx, 0.55, 0.325]}>
            <sphereGeometry args={[0.016, 6, 4]} />
            <meshStandardMaterial color={C.knob} roughness={0.28} metalness={0.6} />
          </mesh>
        );
      })}
      {/* Upper cabinets */}
      {hasUpperCabinets && (
        <>
          <mesh position={[0, 1.65, -0.12]} castShadow>
            <boxGeometry args={[l, 0.70, 0.38]} />
            <meshStandardMaterial color={C.cabinet} roughness={0.82} />
          </mesh>
          {/* Upper door faces */}
          {Array.from({ length: Math.max(1, Math.round(l / 0.55)) }, (_, i) => {
            const segW = l / Math.max(1, Math.round(l / 0.55));
            const cx = -l / 2 + segW * (i + 0.5);
            return (
              <mesh key={i} position={[cx, 1.65, 0.08]}>
                <boxGeometry args={[segW - 0.04, 0.64, 0.012]} />
                <meshStandardMaterial color={C.worktop} roughness={0.60} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
}

// ── Sink ──────────────────────────────────────────────────────────────────────
// Recessed into the worktop — positioned at top of counter
export function Sink({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Sink basin */}
      <mesh position={[0, 0.89, 0]} receiveShadow>
        <boxGeometry args={[0.50, 0.08, 0.38]} />
        <meshStandardMaterial color={C.steel} roughness={0.22} metalness={0.80} />
      </mesh>
      {/* Inner basin (darker) */}
      <mesh position={[0, 0.87, 0]}>
        <boxGeometry args={[0.44, 0.06, 0.32]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.25} metalness={0.80} />
      </mesh>
      {/* Tap body */}
      <mesh position={[0, 0.96, -0.10]}>
        <cylinderGeometry args={[0.018, 0.018, 0.12, 6]} />
        <meshStandardMaterial color={C.knob} roughness={0.20} metalness={0.75} />
      </mesh>
      {/* Tap spout */}
      <mesh position={[0, 1.02, 0.02]} rotation={[Math.PI / 6, 0, 0]}>
        <cylinderGeometry args={[0.010, 0.010, 0.14, 6]} />
        <meshStandardMaterial color={C.knob} roughness={0.20} metalness={0.75} />
      </mesh>
      {/* Handles */}
      {([-0.08, 0.08] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.95, -0.12]}>
          <boxGeometry args={[0.05, 0.02, 0.05]} />
          <meshStandardMaterial color={C.knob} roughness={0.18} metalness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

// ── Stove / Hob ───────────────────────────────────────────────────────────────
export function Stove({ position, rotation = 0 }: FP) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Body (sits on counter) */}
      <mesh position={[0, 0.91, 0]} receiveShadow>
        <boxGeometry args={[0.60, 0.025, 0.60]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.30} metalness={0.75} />
      </mesh>
      {/* 4 burner rings */}
      {(
        [[-0.15, -0.14], [0.15, -0.14], [-0.15, 0.14], [0.15, 0.14]] as [number, number][]
      ).map(([x, z], i) => (
        <group key={i}>
          {/* Outer ring */}
          <mesh position={[x, 0.926, z]}>
            <cylinderGeometry args={[0.068, 0.068, 0.012, 8, 1, true]} />
            <meshStandardMaterial color={C.burner} roughness={0.55} metalness={0.4} />
          </mesh>
          {/* Inner grate */}
          <mesh position={[x, 0.933, z]}>
            <cylinderGeometry args={[0.042, 0.042, 0.006, 8]} />
            <meshStandardMaterial color="#3A3A3A" roughness={0.80} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Control knobs */}
      {([-0.22, -0.07, 0.07, 0.22] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.928, 0.26]}>
          <cylinderGeometry args={[0.018, 0.018, 0.025, 6]} />
          <meshStandardMaterial color={C.knob} roughness={0.40} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
