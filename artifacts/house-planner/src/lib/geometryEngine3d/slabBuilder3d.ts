import type { BoxSpec } from "./types";
import {
  FLOOR_TO_FLOOR, SLAB_T, WALL_H,
  PARAPET_H, EXT_WALL_T,
} from "./constants";

// ─── Floor slab (at the BASE of each storey) ─────────────────────────────────
// Ground slab sits below y=0.  Upper slabs sit between wall sets.
// We never extrude a room rectangle – this is the structural slab plate
// spanning the full building footprint.

export function buildSlabs(
  floors: number,
  plotWidth: number,
  plotDepth: number,
): BoxSpec[] {
  const specs: BoxSpec[] = [];

  // Ground-floor base slab (foundation mat)
  specs.push({
    id: "slab-g-base",
    role: "floor-slab",
    w: plotWidth,
    h: SLAB_T,
    d: plotDepth,
    cx: plotWidth / 2,
    cy: -SLAB_T / 2,        // top face at y = 0
    cz: plotDepth / 2,
    ry: 0,
    floor: 0,
  });

  // Intermediate floor slabs (one per upper floor)
  for (let f = 1; f < floors; f++) {
    const topOfBelowWalls = f * FLOOR_TO_FLOOR - SLAB_T;
    specs.push({
      id: `slab-f${f}`,
      role: "floor-slab",
      w: plotWidth,
      h: SLAB_T,
      d: plotDepth,
      cx: plotWidth / 2,
      cy: topOfBelowWalls + SLAB_T / 2,
      cz: plotDepth / 2,
      ry: 0,
      floor: f,
    });
  }

  // Roof slab
  const roofY = floors * FLOOR_TO_FLOOR - SLAB_T;
  specs.push({
    id: "slab-roof",
    role: "roof-slab",
    w: plotWidth,
    h: SLAB_T,
    d: plotDepth,
    cx: plotWidth / 2,
    cy: roofY + SLAB_T / 2,
    cz: plotDepth / 2,
    ry: 0,
    floor: floors,
  });

  return specs;
}
