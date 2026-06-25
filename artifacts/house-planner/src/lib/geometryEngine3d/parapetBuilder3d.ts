import type { BoxSpec } from "./types";
import {
  PARAPET_H, PARAPET_T, PARAPET_CAP_T, PARAPET_CAP_PROJ,
  FLOOR_TO_FLOOR, SLAB_T, PLINTH_H,
} from "./constants";

// ─── Parapet walls on roof perimeter ──────────────────────────────────────────
// Parapets sit on the roof slab top face.
// Thickness: 150 mm (6-inch) – typical for RCC-framed buildings.
// Corner strategy: E/W parapets run the FULL depth; N/S fill in between.
// This avoids corner overlaps and produces clean 90° joins.
//
// A concrete coping (cap) tops each parapet with a slight overhang (drip edge)
// to shed rainwater and prevent efflorescence staining on the parapet face.

export function buildParapets(
  floors: number,
  plotWidth: number,
  plotDepth: number,
): BoxSpec[] {
  const specs: BoxSpec[] = [];

  // Roof slab top face Y (parapet base)
  const roofTopY = PLINTH_H + floors * FLOOR_TO_FLOOR;
  const baseY    = roofTopY;

  const T   = PARAPET_T;          // 150 mm
  const H   = PARAPET_H;          // 900 mm
  const CAP = PARAPET_CAP_T;      // 25 mm coping
  const CP  = PARAPET_CAP_PROJ;   // 30 mm coping projection beyond parapet face

  // ── Parapet walls ────────────────────────────────────────────────────────────
  // E/W run full plot depth; N/S fill between E/W (no corner overlap).

  // West parapet  (x = 0 edge, full depth)
  specs.push({
    id: "parapet-W", role: "parapet",
    w: plotDepth, h: H, d: T,
    cx: T / 2,
    cy: baseY + H / 2,
    cz: plotDepth / 2,
    ry: -Math.PI / 2, floor: floors,
  });

  // East parapet  (x = plotWidth edge, full depth)
  specs.push({
    id: "parapet-E", role: "parapet",
    w: plotDepth, h: H, d: T,
    cx: plotWidth - T / 2,
    cy: baseY + H / 2,
    cz: plotDepth / 2,
    ry: -Math.PI / 2, floor: floors,
  });

  // North parapet  (z = 0 edge, between E and W)
  const innerW = plotWidth - 2 * T;
  specs.push({
    id: "parapet-N", role: "parapet",
    w: innerW, h: H, d: T,
    cx: plotWidth / 2,
    cy: baseY + H / 2,
    cz: T / 2,
    ry: 0, floor: floors,
  });

  // South parapet  (z = plotDepth edge, between E and W)
  specs.push({
    id: "parapet-S", role: "parapet",
    w: innerW, h: H, d: T,
    cx: plotWidth / 2,
    cy: baseY + H / 2,
    cz: plotDepth - T / 2,
    ry: 0, floor: floors,
  });

  // ── Coping caps (concrete cap wider than parapet – drip edge) ─────────────────
  const capH    = baseY + H;          // top of parapet = bottom of coping
  const capCy   = capH + CAP / 2;

  // West coping
  specs.push({
    id: "cap-W", role: "floor-slab",
    w: plotDepth + 2 * CP,
    h: CAP,
    d: T + 2 * CP,
    cx: T / 2,
    cy: capCy,
    cz: plotDepth / 2,
    ry: -Math.PI / 2, floor: floors,
  });

  // East coping
  specs.push({
    id: "cap-E", role: "floor-slab",
    w: plotDepth + 2 * CP,
    h: CAP,
    d: T + 2 * CP,
    cx: plotWidth - T / 2,
    cy: capCy,
    cz: plotDepth / 2,
    ry: -Math.PI / 2, floor: floors,
  });

  // North coping
  specs.push({
    id: "cap-N", role: "floor-slab",
    w: innerW + 2 * CP,
    h: CAP,
    d: T + 2 * CP,
    cx: plotWidth / 2,
    cy: capCy,
    cz: T / 2,
    ry: 0, floor: floors,
  });

  // South coping
  specs.push({
    id: "cap-S", role: "floor-slab",
    w: innerW + 2 * CP,
    h: CAP,
    d: T + 2 * CP,
    cx: plotWidth / 2,
    cy: capCy,
    cz: plotDepth - T / 2,
    ry: 0, floor: floors,
  });

  return specs;
}
