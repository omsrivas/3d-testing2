import type { Wall, Door, Window as WinType } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  FRAME_W, GLASS_T,
  DOOR_H_INT, FLOOR_TO_FLOOR, PLINTH_H,
  WIN_SILL, WIN_H, VENT_SILL, VENT_H,
  EXT_WALL_T, INT_WALL_T,
} from "./constants";

// ─── Wall angle helper ────────────────────────────────────────────────────────
function wallRotY(wall: Wall): number {
  return -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
}

// ─── Door frames ──────────────────────────────────────────────────────────────
export function buildDoorFrames(doors: Door[], walls: Wall[]): BoxSpec[] {
  const specs: BoxSpec[] = [];
  const wallMap = new Map(walls.map(w => [w.id, w]));
  let ctr = 0;

  for (const door of doors) {
    const wall = wallMap.get(door.wallId);
    if (!wall) continue;

    const T    = wall.type === "external" ? EXT_WALL_T : INT_WALL_T;
    const dH   = Math.min(door.height, DOOR_H_INT);
    const baseY = PLINTH_H + door.floor * FLOOR_TO_FLOOR;
    const ry    = wallRotY(wall);
    const fw    = FRAME_W;
    const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);

    // Vertical jambs (left / right)
    for (const side of [-1, 1]) {
      specs.push({
        id:    `df-${door.id}-jamb${ctr++}`,
        role:  "door-frame",
        w:     fw,
        h:     dH,
        d:     T + 0.01,
        cx:    door.x + Math.cos(angle) * side * (door.width / 2 - fw / 2),
        cy:    baseY + dH / 2,
        cz:    door.y + Math.sin(angle) * side * (door.width / 2 - fw / 2),
        ry,
        floor: door.floor,
      });
    }

    // Horizontal head casing
    specs.push({
      id:    `df-${door.id}-head${ctr++}`,
      role:  "door-frame",
      w:     door.width,
      h:     fw,
      d:     T + 0.01,
      cx:    door.x,
      cy:    baseY + dH + fw / 2,
      cz:    door.y,
      ry,
      floor: door.floor,
    });
  }

  return specs;
}

// ─── Window frames + glass ────────────────────────────────────────────────────
export function buildWindowFrames(windows: WinType[], walls: Wall[]): BoxSpec[] {
  const specs: BoxSpec[] = [];
  const wallMap = new Map(walls.map(w => [w.id, w]));
  let ctr = 0;

  for (const win of windows) {
    const wall = wallMap.get(win.wallId);
    if (!wall) continue;

    const T     = wall.type === "external" ? EXT_WALL_T : INT_WALL_T;
    const sill  = win.type === "ventilator" ? VENT_SILL : (win.sillHeight ?? WIN_SILL);
    const wH    = win.type === "ventilator" ? VENT_H    : win.height;
    const wW    = win.width;
    const baseY = PLINTH_H + win.floor * FLOOR_TO_FLOOR;
    const ry    = wallRotY(wall);
    const fw    = FRAME_W * 0.8;

    const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
    const dirX  = Math.cos(angle);
    const dirZ  = Math.sin(angle);

    // Stiles (left / right)
    for (const side of [-1, 1]) {
      specs.push({
        id:   `wf-${win.id}-stile${ctr++}`,
        role: "window-frame",
        w:    fw,
        h:    wH,
        d:    T + 0.01,
        cx:   win.x + dirX * side * (wW / 2 - fw / 2),
        cy:   baseY + sill + wH / 2,
        cz:   win.y + dirZ * side * (wW / 2 - fw / 2),
        ry,
        floor: win.floor,
      });
    }

    // Bottom sill rail
    specs.push({
      id: `wf-${win.id}-sillrail${ctr++}`, role: "window-frame",
      w: wW, h: fw, d: T + 0.01,
      cx: win.x, cy: baseY + sill + fw / 2, cz: win.y,
      ry, floor: win.floor,
    });

    // Top rail
    specs.push({
      id: `wf-${win.id}-toprail${ctr++}`, role: "window-frame",
      w: wW, h: fw, d: T + 0.01,
      cx: win.x, cy: baseY + sill + wH - fw / 2, cz: win.y,
      ry, floor: win.floor,
    });

    // Glass pane
    specs.push({
      id:   `wf-${win.id}-glass${ctr++}`,
      role: "window-glass",
      w:    wW - fw * 2,
      h:    wH - fw * 2,
      d:    GLASS_T,
      cx:   win.x,
      cy:   baseY + sill + wH / 2,
      cz:   win.y,
      ry,
      floor: win.floor,
    });
  }

  return specs;
}
