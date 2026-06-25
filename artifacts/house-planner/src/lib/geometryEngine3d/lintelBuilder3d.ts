import type { Wall, Door, Window as WinType } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  LINTEL_H, LINTEL_EXT,
  EXT_WALL_T, INT_WALL_T,
  DOOR_H_INT, WIN_SILL, WIN_H, VENT_SILL, VENT_H,
  FLOOR_TO_FLOOR, PLINTH_H,
} from "./constants";

// ─── RCC Lintels above doors and windows ─────────────────────────────────────
// An RCC lintel spans each opening's full width + extension on each side.
// It sits at the top of the opening and continues until it meets the slab soffit.
// Depth = wall thickness + 20 mm (slight exterior projection = visual shadow line).

function wallRotY(wall: Wall): number {
  return -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
}

export function buildLintels(
  walls: Wall[],
  doors: Door[],
  windows: WinType[],
): BoxSpec[] {
  const specs: BoxSpec[] = [];
  const wallMap = new Map(walls.map(w => [w.id, w]));
  let ctr = 0;

  // ── Door lintels ─────────────────────────────────────────────────────────────
  for (const door of doors) {
    const wall = wallMap.get(door.wallId);
    if (!wall) continue;

    const T       = wall.type === "external" ? EXT_WALL_T : INT_WALL_T;
    const vTop    = Math.min(door.height, DOOR_H_INT);
    const baseY   = PLINTH_H + door.floor * FLOOR_TO_FLOOR;

    specs.push({
      id:    `lintel-door-${door.id}-${ctr++}`,
      role:  "floor-slab",
      w:     door.width + 2 * LINTEL_EXT,
      h:     LINTEL_H,
      d:     T + 0.020,                          // slight exterior projection
      cx:    door.x,
      cy:    baseY + vTop + LINTEL_H / 2,
      cz:    door.y,
      ry:    wallRotY(wall),
      floor: door.floor,
    });
  }

  // ── Window / ventilator lintels ───────────────────────────────────────────────
  for (const win of windows) {
    const wall = wallMap.get(win.wallId);
    if (!wall) continue;

    const T     = wall.type === "external" ? EXT_WALL_T : INT_WALL_T;
    const sill  = win.type === "ventilator" ? VENT_SILL : (win.sillHeight ?? WIN_SILL);
    const wH    = win.type === "ventilator" ? VENT_H    : win.height;
    const vTop  = sill + wH;
    const baseY = PLINTH_H + win.floor * FLOOR_TO_FLOOR;

    specs.push({
      id:    `lintel-win-${win.id}-${ctr++}`,
      role:  "floor-slab",
      w:     win.width + 2 * LINTEL_EXT,
      h:     LINTEL_H,
      d:     T + 0.020,
      cx:    win.x,
      cy:    baseY + vTop + LINTEL_H / 2,
      cz:    win.y,
      ry:    wallRotY(wall),
      floor: win.floor,
    });
  }

  return specs;
}
