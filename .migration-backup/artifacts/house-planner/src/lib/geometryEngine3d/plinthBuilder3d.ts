import type { BoxSpec } from "./types";
import {
  EXT_WALL_T, PLINTH_H,
} from "./constants";

// ─── Plinth perimeter walls ────────────────────────────────────────────────────
// The plinth is a reinforced masonry/concrete band that sits between the
// ground slab (y = 0) and the finished floor (y = PLINTH_H = 450 mm).
// It is slightly wider than the exterior wall to create a visible ledge:
//   PROJ = 30 mm projection beyond the exterior wall face on each exposed side.
//
// Layout convention: exterior walls run along the INNER faces of the plot edges.
// The plinth needs to align with those wall positions so the visual "step"
// reading works correctly.

const PROJ = 0.030; // 30 mm ledge projection beyond the ext-wall face

export function buildPlinth(plotWidth: number, plotDepth: number): BoxSpec[] {
  const specs: BoxSpec[] = [];
  const T = EXT_WALL_T + PROJ;  // plinth thickness (slightly wider than ext wall)
  const H = PLINTH_H;
  const cy = H / 2;             // plinth centre Y (from 0 to PLINTH_H)

  // North face  (z ≈ 0)
  specs.push({
    id:    "plinth-N",
    role:  "exterior-wall",
    w:     plotWidth + 2 * PROJ,  // full width, flush with outer faces
    h:     H,
    d:     T,
    cx:    plotWidth / 2,
    cy,
    cz:    T / 2 - PROJ,          // outer face at z = -PROJ (same as wall outer)
    ry:    0,
    floor: 0,
  });

  // South face  (z ≈ plotDepth)
  specs.push({
    id:    "plinth-S",
    role:  "exterior-wall",
    w:     plotWidth + 2 * PROJ,
    h:     H,
    d:     T,
    cx:    plotWidth / 2,
    cy,
    cz:    plotDepth - T / 2 + PROJ,
    ry:    0,
    floor: 0,
  });

  // West face  (x ≈ 0)  — fits between N and S plinths (no corner overlap)
  const innerDepth = plotDepth - 2 * T;
  specs.push({
    id:    "plinth-W",
    role:  "exterior-wall",
    w:     innerDepth,
    h:     H,
    d:     T,
    cx:    T / 2 - PROJ,
    cy,
    cz:    T + innerDepth / 2,     // centred between N and S plinth inner faces
    ry:    -Math.PI / 2,
    floor: 0,
  });

  // East face  (x ≈ plotWidth)
  specs.push({
    id:    "plinth-E",
    role:  "exterior-wall",
    w:     innerDepth,
    h:     H,
    d:     T,
    cx:    plotWidth - T / 2 + PROJ,
    cy,
    cz:    T + innerDepth / 2,
    ry:    -Math.PI / 2,
    floor: 0,
  });

  return specs;
}
