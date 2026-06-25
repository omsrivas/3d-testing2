import type { Room, Wall } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  BALCONY_SLAB_T, FLOOR_TO_FLOOR, RAILING_H, RAILING_T, PLINTH_H,
} from "./constants";

// ─── Balcony / terrace slabs + railings ───────────────────────────────────────
// Balcony rooms already have defined footprints from the layout engine.
// Slab: 100 mm cantilever slab (thinner than structural floor slabs).
// Railings: perimeter on all four edges (open on the exterior side).

export function buildBalconies(
  rooms: Room[],
  _walls: Wall[],
  _floors: number,
): BoxSpec[] {
  const specs: BoxSpec[] = [];
  let ctr = 0;

  const balconies = rooms.filter(r => r.type === "balcony" || r.type === "terrace");

  for (const balc of balconies) {
    const f = balc.floor;
    // Top face of slab sits flush with the finished floor level
    const slabTopY  = PLINTH_H + f * FLOOR_TO_FLOOR;
    const slabBotY  = slabTopY - BALCONY_SLAB_T;

    // ── Slab ──────────────────────────────────────────────────────────────────
    specs.push({
      id:    `balc-slab-${balc.id}`,
      role:  "balcony-slab",
      w:     balc.width,
      h:     BALCONY_SLAB_T,
      d:     balc.depth,
      cx:    balc.x + balc.width  / 2,
      cy:    slabBotY + BALCONY_SLAB_T / 2,
      cz:    balc.y  + balc.depth / 2,
      ry:    0,
      floor: f,
    });

    // ── Railings on all four edges ─────────────────────────────────────────────
    const railBaseY = slabTopY;

    // North edge
    specs.push({
      id: `balc-rail-N-${ctr++}`, role: "balcony-railing",
      w: balc.width, h: RAILING_H, d: RAILING_T,
      cx: balc.x + balc.width / 2,
      cy: railBaseY + RAILING_H / 2,
      cz: balc.y + RAILING_T / 2,
      ry: 0, floor: f,
    });

    // South edge
    specs.push({
      id: `balc-rail-S-${ctr++}`, role: "balcony-railing",
      w: balc.width, h: RAILING_H, d: RAILING_T,
      cx: balc.x + balc.width / 2,
      cy: railBaseY + RAILING_H / 2,
      cz: balc.y + balc.depth - RAILING_T / 2,
      ry: 0, floor: f,
    });

    // West edge
    specs.push({
      id: `balc-rail-W-${ctr++}`, role: "balcony-railing",
      w: balc.depth, h: RAILING_H, d: RAILING_T,
      cx: balc.x + RAILING_T / 2,
      cy: railBaseY + RAILING_H / 2,
      cz: balc.y + balc.depth / 2,
      ry: -Math.PI / 2, floor: f,
    });

    // East edge
    specs.push({
      id: `balc-rail-E-${ctr++}`, role: "balcony-railing",
      w: balc.depth, h: RAILING_H, d: RAILING_T,
      cx: balc.x + balc.width - RAILING_T / 2,
      cy: railBaseY + RAILING_H / 2,
      cz: balc.y + balc.depth / 2,
      ry: -Math.PI / 2, floor: f,
    });
  }

  return specs;
}
