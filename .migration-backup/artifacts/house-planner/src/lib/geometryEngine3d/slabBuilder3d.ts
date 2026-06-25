import type { BoxSpec } from "./types";
import {
  FLOOR_TO_FLOOR, SLAB_T, SLAB_PROJ,
  PLINTH_H,
} from "./constants";

// ─── Floor / roof slabs ────────────────────────────────────────────────────────
// • Ground slab: full footprint, no projection (foundation mat below plinth)
// • Intermediate slabs: project SLAB_PROJ beyond ext-wall faces (overhang)
// • Roof slab: same projection + slightly exposed edge cap appearance
//
// Coordinate note: PLINTH_H is the raised plinth level.
// Floor 0 clear height starts at Y = PLINTH_H.
// Slab baseY = PLINTH_H + floor * FLOOR_TO_FLOOR.

export function buildSlabs(
  floors: number,
  plotWidth: number,
  plotDepth: number,
): BoxSpec[] {
  const specs: BoxSpec[] = [];
  const P = SLAB_PROJ;

  // ── Ground plinth mat (no projection – sits flush at Y = 0) ─────────────────
  specs.push({
    id:    "slab-g-base",
    role:  "floor-slab",
    w:     plotWidth,
    h:     SLAB_T,
    d:     plotDepth,
    cx:    plotWidth / 2,
    cy:    -(SLAB_T / 2),            // top face at Y = 0 (ground level)
    cz:    plotDepth / 2,
    ry:    0,
    floor: 0,
  });

  // ── Plinth top slab (at Y = PLINTH_H, slightly larger) ───────────────────────
  // Visible as the finished floor datum before the building walls rise.
  specs.push({
    id:    "slab-plinth-top",
    role:  "floor-slab",
    w:     plotWidth + 2 * P,
    h:     SLAB_T,
    d:     plotDepth + 2 * P,
    cx:    plotWidth / 2,
    cy:    PLINTH_H - SLAB_T / 2,
    cz:    plotDepth / 2,
    ry:    0,
    floor: 0,
  });

  // ── Intermediate floor slabs (f = 1 … floors-1) ──────────────────────────────
  for (let f = 1; f < floors; f++) {
    const slabBotY = PLINTH_H + f * FLOOR_TO_FLOOR - SLAB_T;
    specs.push({
      id:    `slab-f${f}`,
      role:  "floor-slab",
      w:     plotWidth  + 2 * P,
      h:     SLAB_T,
      d:     plotDepth  + 2 * P,
      cx:    plotWidth  / 2,
      cy:    slabBotY   + SLAB_T / 2,
      cz:    plotDepth  / 2,
      ry:    0,
      floor: f,
    });
  }

  // ── Roof slab ────────────────────────────────────────────────────────────────
  const roofBotY = PLINTH_H + floors * FLOOR_TO_FLOOR - SLAB_T;
  specs.push({
    id:    "slab-roof",
    role:  "roof-slab",
    w:     plotWidth  + 2 * P,
    h:     SLAB_T,
    d:     plotDepth  + 2 * P,
    cx:    plotWidth  / 2,
    cy:    roofBotY   + SLAB_T / 2,
    cz:    plotDepth  / 2,
    ry:    0,
    floor: floors,
  });

  return specs;
}
