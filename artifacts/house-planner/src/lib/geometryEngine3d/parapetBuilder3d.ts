import type { BoxSpec } from "./types";
import {
  PARAPET_H, PARAPET_T, FLOOR_TO_FLOOR, SLAB_T, WALL_H,
} from "./constants";

// ─── Parapet walls on roof perimeter ──────────────────────────────────────────
// Four perimeter walls sitting atop the roof slab.
// Each parapet is a thin wall box aligned with a plot edge.

export function buildParapets(
  floors: number,
  plotWidth: number,
  plotDepth: number,
): BoxSpec[] {
  const specs: BoxSpec[] = [];

  // Roof slab top face Y
  const roofTopY = floors * FLOOR_TO_FLOOR;
  const baseY    = roofTopY;  // parapet sits on roof

  const T = PARAPET_T;
  const H = PARAPET_H;

  // North parapet  (z = 0 edge)
  specs.push({
    id:    "parapet-N",
    role:  "parapet",
    w:     plotWidth,
    h:     H,
    d:     T,
    cx:    plotWidth / 2,
    cy:    baseY + H / 2,
    cz:    T / 2,
    ry:    0,
    floor: floors,
  });

  // South parapet  (z = plotDepth edge)
  specs.push({
    id:    "parapet-S",
    role:  "parapet",
    w:     plotWidth,
    h:     H,
    d:     T,
    cx:    plotWidth / 2,
    cy:    baseY + H / 2,
    cz:    plotDepth - T / 2,
    ry:    0,
    floor: floors,
  });

  // West parapet  (x = 0 edge) – rotated 90°
  specs.push({
    id:    "parapet-W",
    role:  "parapet",
    w:     plotDepth,
    h:     H,
    d:     T,
    cx:    T / 2,
    cy:    baseY + H / 2,
    cz:    plotDepth / 2,
    ry:    -Math.PI / 2,
    floor: floors,
  });

  // East parapet  (x = plotWidth edge) – rotated 90°
  specs.push({
    id:    "parapet-E",
    role:  "parapet",
    w:     plotDepth,
    h:     H,
    d:     T,
    cx:    plotWidth - T / 2,
    cy:    baseY + H / 2,
    cz:    plotDepth / 2,
    ry:    -Math.PI / 2,
    floor: floors,
  });

  return specs;
}
