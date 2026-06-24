import type { Room, Wall } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  SLAB_T, FLOOR_TO_FLOOR, RAILING_H, RAILING_T,
} from "./constants";

// ─── Balcony slabs + railings ─────────────────────────────────────────────────
// Balcony rooms in the layout already have defined footprints (x, y, width, depth).
// We create a structural slab at floor level and perimeter railings on all open
// sides (any side NOT shared with an interior wall gets a railing).

export function buildBalconies(
  rooms: Room[],
  walls: Wall[],
  _floors: number,
): BoxSpec[] {
  const specs: BoxSpec[] = [];
  let ctr = 0;

  const balconies = rooms.filter(r => r.type === "balcony" || r.type === "terrace");

  for (const balc of balconies) {
    const f = balc.floor;
    // Top face of slab sits flush with the main floor level
    const slabTopY = f * FLOOR_TO_FLOOR;

    // ── Slab ─────────────────────────────────────────────────────────────────
    specs.push({
      id:   `balc-slab-${balc.id}`,
      role: "balcony-slab",
      w:    balc.width,
      h:    SLAB_T,
      d:    balc.depth,
      cx:   balc.x + balc.width / 2,
      cy:   slabTopY - SLAB_T / 2,
      cz:   balc.y + balc.depth / 2,
      ry:   0,
      floor: f,
    });

    // ── Railings on all four edges ────────────────────────────────────────────
    const railBaseY = slabTopY; // railings sit on top of slab

    // North edge  (z = balc.y)
    specs.push({
      id:   `balc-rail-N-${ctr++}`,
      role: "balcony-railing",
      w:    balc.width,
      h:    RAILING_H,
      d:    RAILING_T,
      cx:   balc.x + balc.width / 2,
      cy:   railBaseY + RAILING_H / 2,
      cz:   balc.y + RAILING_T / 2,
      ry:   0,
      floor: f,
    });

    // South edge  (z = balc.y + balc.depth)
    specs.push({
      id:   `balc-rail-S-${ctr++}`,
      role: "balcony-railing",
      w:    balc.width,
      h:    RAILING_H,
      d:    RAILING_T,
      cx:   balc.x + balc.width / 2,
      cy:   railBaseY + RAILING_H / 2,
      cz:   balc.y + balc.depth - RAILING_T / 2,
      ry:   0,
      floor: f,
    });

    // West edge  (x = balc.x)
    specs.push({
      id:   `balc-rail-W-${ctr++}`,
      role: "balcony-railing",
      w:    balc.depth,
      h:    RAILING_H,
      d:    RAILING_T,
      cx:   balc.x + RAILING_T / 2,
      cy:   railBaseY + RAILING_H / 2,
      cz:   balc.y + balc.depth / 2,
      ry:   -Math.PI / 2,
      floor: f,
    });

    // East edge  (x = balc.x + balc.width)
    specs.push({
      id:   `balc-rail-E-${ctr++}`,
      role: "balcony-railing",
      w:    balc.depth,
      h:    RAILING_H,
      d:    RAILING_T,
      cx:   balc.x + balc.width - RAILING_T / 2,
      cy:   railBaseY + RAILING_H / 2,
      cz:   balc.y + balc.depth / 2,
      ry:   -Math.PI / 2,
      floor: f,
    });
  }

  return specs;
}
