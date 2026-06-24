import type { Wall } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  COL_W, COL_D, WALL_H, FLOOR_TO_FLOOR, SLAB_T, EXT_WALL_T,
} from "./constants";

const SNAP = 0.12; // metres – coincidence tolerance for corner detection

function key(x: number, z: number) {
  return `${Math.round(x / SNAP) * SNAP},${Math.round(z / SNAP) * SNAP}`;
}

// ─── Columns at external-wall corners and T-junctions ─────────────────────────
// We identify every unique endpoint shared by ≥ 2 external walls and place a
// square column there, one per floor.

export function buildColumns(walls: Wall[], floors: number): BoxSpec[] {
  const specs: BoxSpec[] = [];

  // Collect unique corner points per floor
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
    const baseY = f * FLOOR_TO_FLOOR;
    const colH  = WALL_H + SLAB_T; // full storey height incl slab

    for (const pt of corners) {
      const [xs, zs] = pt.split(",").map(Number);
      specs.push({
        id: `col-f${f}-${i++}`,
        role: "column",
        w: COL_W,
        h: colH,
        d: COL_D,
        cx: xs,
        cy: baseY + colH / 2,
        cz: zs,
        ry: 0,
        floor: f,
      });
    }
  }

  return specs;
}
