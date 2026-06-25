import type { Wall } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  COL_W, COL_D, WALL_H, FLOOR_TO_FLOOR, SLAB_T,
  PLINTH_H, PARAPET_H, PARAPET_T,
} from "./constants";

const SNAP = 0.12; // metres – coincidence tolerance for corner detection

function key(x: number, z: number): string {
  return `${Math.round(x / SNAP) * SNAP},${Math.round(z / SNAP) * SNAP}`;
}

// ─── RCC Columns at wall corners and T-junctions ──────────────────────────────
// Square tied columns (230 × 230 mm) run through the full height of each storey,
// including the slab thickness, tying wall top to slab soffit.
// Additional short columns also extend through the parapet zone on the roof level.

export function buildColumns(walls: Wall[], floors: number): BoxSpec[] {
  const specs: BoxSpec[] = [];

  // ── Collect unique corner/junction points per floor ──────────────────────────
  const cornersPerFloor = new Map<number, Set<string>>();

  for (const wall of walls) {
    if (wall.type !== "external") continue;
    const f = wall.floor;
    if (!cornersPerFloor.has(f)) cornersPerFloor.set(f, new Set());
    const pts = cornersPerFloor.get(f)!;
    pts.add(key(wall.x1, wall.y1));
    pts.add(key(wall.x2, wall.y2));
  }

  // T-junction points: internal walls touching external walls
  for (const wall of walls) {
    if (wall.type !== "internal") continue;
    const f = wall.floor;
    if (!cornersPerFloor.has(f)) cornersPerFloor.set(f, new Set());
    const pts = cornersPerFloor.get(f)!;
    pts.add(key(wall.x1, wall.y1));
    pts.add(key(wall.x2, wall.y2));
  }

  let i = 0;
  for (const [f, corners] of cornersPerFloor) {
    // Storey column: from plinth top to underside of slab above
    const baseY = PLINTH_H + f * FLOOR_TO_FLOOR;
    const colH  = WALL_H + SLAB_T;   // full storey height incl. slab

    for (const pt of corners) {
      const [xs, zs] = pt.split(",").map(Number);

      // Main storey column
      specs.push({
        id:    `col-f${f}-${i++}`,
        role:  "column",
        w:     COL_W,
        h:     colH,
        d:     COL_D,
        cx:    xs,
        cy:    baseY + colH / 2,
        cz:    zs,
        ry:    0,
        floor: f,
      });
    }
  }

  // ── Parapet-level columns at roof corners ─────────────────────────────────────
  // Short columns tie the parapet walls together at each corner.
  // Only on the topmost floor; use the same corner X/Z from floor (floors-1).
  const roofCorners = cornersPerFloor.get(floors - 1);
  if (roofCorners) {
    const roofTopY = PLINTH_H + floors * FLOOR_TO_FLOOR;
    for (const pt of roofCorners) {
      const [xs, zs] = pt.split(",").map(Number);
      specs.push({
        id:    `col-parapet-${i++}`,
        role:  "column",
        w:     PARAPET_T,
        h:     PARAPET_H,
        d:     PARAPET_T,
        cx:    xs,
        cy:    roofTopY + PARAPET_H / 2,
        cz:    zs,
        ry:    0,
        floor: floors,
      });
    }
  }

  return specs;
}
