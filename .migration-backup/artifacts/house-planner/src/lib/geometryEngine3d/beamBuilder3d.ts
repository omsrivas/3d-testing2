import type { Wall } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  BEAM_D, EXT_WALL_T, FLOOR_TO_FLOOR, PLINTH_H,
} from "./constants";

// ─── RCC Beams under each slab ────────────────────────────────────────────────
// Beams run along the top of the exterior (and selected interior) walls,
// projecting BEAM_D below the slab soffit. They tie the slab to the columns
// and are clearly visible as a "band" under the slab edge.
//
// Beam dimensions (for each wall segment):
//   width  = wall length
//   height = BEAM_D  (projects below slab soffit)
//   depth  = wall thickness
//   cy     = slabBotY - BEAM_D/2   (beam centre, hanging below slab bottom face)
//
// Added at every slab level (f = 1..floors) along exterior walls.

export function buildBeams(walls: Wall[], floors: number): BoxSpec[] {
  const specs: BoxSpec[] = [];
  let ctr = 0;

  // Only exterior walls carry primary beams in the RCC frame
  const extWalls = walls.filter(w => w.type === "external");

  for (let f = 1; f <= floors; f++) {
    // Slab bottom face Y (the soffit of the slab above these walls)
    const slabBotY = PLINTH_H + f * FLOOR_TO_FLOOR - 0.125; // SLAB_T = 0.125
    const cy       = slabBotY - BEAM_D / 2;

    // Use only the unique wall segments on this floor level
    const floorWalls = extWalls.filter(w => w.floor === f - 1);

    for (const wall of floorWalls) {
      const L = wall.length;
      if (L < 0.1) continue;

      const T        = EXT_WALL_T;
      const wallAngle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
      const ry       = -wallAngle;

      const midX = (wall.x1 + wall.x2) / 2;
      const midZ = (wall.y1 + wall.y2) / 2;

      specs.push({
        id:    `beam-f${f}-w${ctr++}`,
        role:  "floor-slab",          // RCC concrete — same material as slab
        w:     L,
        h:     BEAM_D,
        d:     T,
        cx:    midX,
        cy,
        cz:    midZ,
        ry,
        floor: f - 1,
      });
    }
  }

  return specs;
}
