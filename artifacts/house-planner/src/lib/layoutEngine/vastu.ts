import type { FacingDirection, RoomType, VastuZone } from "./types";

// ─── Zone rectangle definitions ───────────────────────────────────────────────
// The plot is conceptually divided into a 3×3 grid:
//   NW | N  | NE
//   W  | C  | E
//   SW | S  | SE
//
// In our coordinate system:
//   origin (0,0) = NW corner, X→East, Y→South
//
// We store zones as fractions of plot dimensions.

export interface ZoneRect {
  xFrac: [number, number]; // [start, end] as fraction of plotWidth
  yFrac: [number, number]; // [start, end] as fraction of plotDepth
}

export const ZONE_FRACTIONS: Record<VastuZone, ZoneRect> = {
  NW: { xFrac: [0, 0.33], yFrac: [0, 0.33] },
  N: { xFrac: [0.33, 0.67], yFrac: [0, 0.33] },
  NE: { xFrac: [0.67, 1], yFrac: [0, 0.33] },
  W: { xFrac: [0, 0.33], yFrac: [0.33, 0.67] },
  center: { xFrac: [0.33, 0.67], yFrac: [0.33, 0.67] },
  E: { xFrac: [0.67, 1], yFrac: [0.33, 0.67] },
  SW: { xFrac: [0, 0.33], yFrac: [0.67, 1] },
  S: { xFrac: [0.33, 0.67], yFrac: [0.67, 1] },
  SE: { xFrac: [0.67, 1], yFrac: [0.67, 1] },
};

// ─── Vastu rules (canonical, for North-facing plot) ──────────────────────────
// Source: classical Vastu Shastra (Griha Vastu)

const VASTU_RULES_NORTH_FACING: Record<RoomType, VastuZone[]> = {
  entrance_gate: ["N", "NE", "E"],
  front_garden:  ["NE", "N", "E"],
  foyer:         ["N", "NE", "E"],
  living:        ["NE", "N", "E", "center"],
  family_lounge: ["center", "N", "E"],
  dining:        ["W", "E", "center"],
  kitchen:       ["SE", "NW"],
  master_bedroom:["SW", "S", "W"],
  bedroom:       ["S", "W", "NW", "SW"],
  bathroom:      ["NW", "W", "SE"],
  toilet:        ["NW", "W", "S"],
  balcony:       ["N", "NE", "E"],
  parking:       ["NW", "N", "W"],
  staircase:     ["S", "SW", "W"],
  pooja:         ["NE"],
  utility:       ["NW", "W"],
  passage:       ["center", "N"],
  terrace:       ["W", "SW", "S"],
};

// ─── Rotation mapping ─────────────────────────────────────────────────────────
// For other facing directions, rotate the Vastu rules.

type ZoneRotation = Record<VastuZone, VastuZone>;

const ROTATE_CW: ZoneRotation = {
  N: "E",
  NE: "SE",
  E: "S",
  SE: "SW",
  S: "W",
  SW: "NW",
  W: "N",
  NW: "NE",
  center: "center",
};

function rotateZone(zone: VastuZone, steps: number): VastuZone {
  let z = zone;
  for (let i = 0; i < steps; i++) z = ROTATE_CW[z];
  return z;
}

// Steps to rotate from North-facing canonical rules to the actual facing.
const ROTATION_STEPS: Record<FacingDirection, number> = {
  N: 0,
  E: 1, // 90° CW
  S: 2, // 180°
  W: 3, // 270° CW
};

export function getVastuZones(
  roomType: RoomType,
  facing: FacingDirection
): VastuZone[] {
  const canonical = VASTU_RULES_NORTH_FACING[roomType] ?? ["center"];
  const steps = ROTATION_STEPS[facing];
  if (steps === 0) return canonical;
  return canonical.map((z) => rotateZone(z, steps));
}

// ─── Zone geometry helpers ────────────────────────────────────────────────────

export function getZoneRect(
  zone: VastuZone,
  plotWidth: number,
  plotDepth: number
): { x: number; y: number; width: number; depth: number } {
  const frac = ZONE_FRACTIONS[zone];
  return {
    x: frac.xFrac[0] * plotWidth,
    y: frac.yFrac[0] * plotDepth,
    width: (frac.xFrac[1] - frac.xFrac[0]) * plotWidth,
    depth: (frac.yFrac[1] - frac.yFrac[0]) * plotDepth,
  };
}

export function classifyZone(
  x: number,
  y: number,
  plotWidth: number,
  plotDepth: number
): VastuZone {
  const xFrac = x / plotWidth;
  const yFrac = y / plotDepth;

  const col = xFrac < 0.33 ? 0 : xFrac < 0.67 ? 1 : 2;
  const row = yFrac < 0.33 ? 0 : yFrac < 0.67 ? 1 : 2;

  const grid: VastuZone[][] = [
    ["NW", "N", "NE"],
    ["W", "center", "E"],
    ["SW", "S", "SE"],
  ];

  return grid[row][col];
}

export function scoreVastu(
  rooms: Array<{ type: RoomType; x: number; y: number }>,
  plotWidth: number,
  plotDepth: number,
  facing: FacingDirection
): number {
  if (rooms.length === 0) return 100;

  let totalScore = 0;
  for (const room of rooms) {
    const zone = classifyZone(
      room.x + 0.01,
      room.y + 0.01,
      plotWidth,
      plotDepth
    );
    const preferredZones = getVastuZones(room.type, facing);
    const rank = preferredZones.indexOf(zone);
    if (rank === 0) totalScore += 100;
    else if (rank === 1) totalScore += 75;
    else if (rank === 2) totalScore += 50;
    else if (rank >= 3) totalScore += 25;
    else totalScore += 0;
  }

  return Math.round(totalScore / rooms.length);
}
