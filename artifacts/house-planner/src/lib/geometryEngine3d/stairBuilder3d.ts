import type { Stair } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  RISER_H, TREAD_D, TREAD_T, FLOOR_TO_FLOOR, SLAB_T,
} from "./constants";

// ─── Stair geometry ───────────────────────────────────────────────────────────
// Each flight is represented as individual tread slabs.
// We never extrude the stair room rectangle – instead we place
// incremental tread boxes stepping up through the storey height.
//
// A straight stair ascending South (direction = "S"):
//   - Tread box width = stair width
//   - Tread box depth = TREAD_D, height = TREAD_T
//   - Each tread steps +RISER_H in Y and +TREAD_D in Z

export function buildStairs3d(stairs: Stair[]): BoxSpec[] {
  const specs: BoxSpec[] = [];
  let ctr = 0;

  for (const stair of stairs) {
    const baseY    = stair.fromFloor * FLOOR_TO_FLOOR;
    const totalH   = FLOOR_TO_FLOOR;  // height to climb per flight
    const nRisers  = Math.round(totalH / RISER_H); // ≈ 18
    const rH       = totalH / nRisers;
    const tD       = TREAD_D;

    const goingS = stair.direction === "S" || stair.direction === "N";
    const stepDir = stair.direction === "N" ? -1 : 1;  // +Z or -Z for S/N; +X or -X for E/W

    // Stair room origin
    const ox = stair.x;
    const oz = stair.y;

    // Tread width = dimension perpendicular to ascent
    const treadW = goingS ? stair.width : stair.depth;

    for (let i = 0; i < nRisers; i++) {
      const cy = baseY + i * rH + TREAD_T / 2;

      if (goingS) {
        // Ascending in Z direction
        const czOff = (i + 0.5) * tD * stepDir;
        const czBase = stair.direction === "S"
          ? oz + czOff
          : oz + stair.depth + czOff;
        specs.push({
          id:   `stair-${stair.id}-t${ctr++}`,
          role: "stair-tread",
          w:    treadW,
          h:    TREAD_T,
          d:    tD,
          cx:   ox + stair.width / 2,
          cy,
          cz:   czBase,
          ry:   0,
          floor: stair.fromFloor,
        });
      } else {
        // Ascending in X direction
        const cxOff = (i + 0.5) * tD * stepDir;
        const cxBase = stair.direction === "E"
          ? ox + cxOff
          : ox + stair.width + cxOff;
        specs.push({
          id:   `stair-${stair.id}-t${ctr++}`,
          role: "stair-tread",
          w:    tD,
          h:    TREAD_T,
          d:    treadW,
          cx:   cxBase,
          cy,
          cz:   oz + stair.depth / 2,
          ry:   0,
          floor: stair.fromFloor,
        });
      }
    }

    // Dog-leg landing  (if type != straight)
    if (stair.type !== "straight" && stair.landingWidth) {
      const landY = baseY + Math.floor(nRisers / 2) * rH + TREAD_T / 2;
      specs.push({
        id:   `stair-${stair.id}-landing`,
        role: "stair-tread",
        w:    stair.width,
        h:    TREAD_T,
        d:    stair.landingWidth,
        cx:   ox + stair.width / 2,
        cy:   landY,
        cz:   oz + stair.depth / 2,
        ry:   0,
        floor: stair.fromFloor,
      });
    }
  }

  return specs;
}
