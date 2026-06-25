import type { Wall, Door, Window as WinType } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  EXT_WALL_T, INT_WALL_T,
  DOOR_H_INT, FLOOR_TO_FLOOR, PLINTH_H,
  WIN_SILL, WIN_H, VENT_SILL, VENT_H,
  GLASS_T,
} from "./constants";

// ─── Local opening geometry constants ────────────────────────────────────────
// (Not structural — kept local to avoid cluttering constants.ts)

const DOOR_FW        = 0.075;  // 75 mm  door frame face width
const DOOR_THR_H     = 0.020;  // 20 mm  threshold height
const DOOR_PT        = 0.045;  // 45 mm  flush panel thickness
const HANDLE_PLATE_W = 0.040;  // 40 mm  handle backplate face width
const HANDLE_PLATE_H = 0.200;  // 200 mm handle backplate height
const HANDLE_PLATE_D = 0.009;  // 9 mm   handle backplate depth
const HANDLE_BAR_W   = 0.024;  // 24 mm  handle bar width (along wall)
const HANDLE_BAR_H   = 0.130;  // 130 mm handle bar pull height
const HANDLE_BAR_D   = 0.048;  // 48 mm  handle bar grip projection

const WIN_FW         = 0.050;  // 50 mm  aluminium frame face width
const WIN_DIV        = 0.040;  // 40 mm  sliding divider / meeting stile
const WIN_SILL_T     = 0.038;  // 38 mm  external window sill thickness
const WIN_SILL_PROJ  = 0.060;  // 60 mm  sill projection beyond wall face

// ─── Helpers ─────────────────────────────────────────────────────────────────
function wallRotY(wall: Wall): number {
  return -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
}

function wallDir(wall: Wall): [number, number] {
  const a = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
  return [Math.cos(a), Math.sin(a)];   // [dirX, dirZ] — along wall
}

function wallNrm(wall: Wall): [number, number] {
  const a = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
  return [-Math.sin(a), Math.cos(a)];  // [nrmX, nrmZ] — perpendicular to wall
}

// ─── Door assembly ────────────────────────────────────────────────────────────
//
// Anatomy of a single door (all boxes share the same ry = wallRotY):
//
//   ┌──────────────────────┐  ← head frame (FW tall)
//   │ ┌──────────────────┐ │
//   │ │                  │ │
//   │ │   door panel     │ │  ← flush wood panel (45 mm thick)
//   │ │                  │ │
//   │ │    ◉  handle     │ │
//   │ └──────────────────┘ │
//   │ [  threshold  ]      │  ← threshold (20 mm tall)
//   └──────────────────────┘
//   jamb              jamb
//
// All positions are world-space centres.

export function buildDoorFrames(doors: Door[], walls: Wall[]): BoxSpec[] {
  const specs: BoxSpec[] = [];
  const wallMap = new Map(walls.map(w => [w.id, w]));
  let n = 0;

  for (const door of doors) {
    const wall   = wallMap.get(door.wallId);
    if (!wall) continue;

    const T      = wall.type === "external" ? EXT_WALL_T : INT_WALL_T;
    const dH     = Math.min(door.height, DOOR_H_INT);
    const W      = door.width;
    const baseY  = PLINTH_H + door.floor * FLOOR_TO_FLOOR;
    const ry     = wallRotY(wall);
    const [dX, dZ] = wallDir(wall);  // along wall
    const [nX, nZ] = wallNrm(wall);  // perpendicular to wall

    // ── Frame ─────────────────────────────────────────────────────────────────

    // Left jamb
    specs.push({ id: `df-lj-${n++}`, role: "door-frame",
      w: DOOR_FW, h: dH, d: T,
      cx: door.x - dX * (W/2 - DOOR_FW/2),
      cy: baseY + dH/2,
      cz: door.y - dZ * (W/2 - DOOR_FW/2),
      ry, floor: door.floor });

    // Right jamb
    specs.push({ id: `df-rj-${n++}`, role: "door-frame",
      w: DOOR_FW, h: dH, d: T,
      cx: door.x + dX * (W/2 - DOOR_FW/2),
      cy: baseY + dH/2,
      cz: door.y + dZ * (W/2 - DOOR_FW/2),
      ry, floor: door.floor });

    // Head
    specs.push({ id: `df-hd-${n++}`, role: "door-frame",
      w: W, h: DOOR_FW, d: T,
      cx: door.x,
      cy: baseY + dH + DOOR_FW/2,
      cz: door.y,
      ry, floor: door.floor });

    // Threshold (timber/granite floor strip at base)
    specs.push({ id: `df-th-${n++}`, role: "door-frame",
      w: W - 2*DOOR_FW, h: DOOR_THR_H, d: T * 0.7,
      cx: door.x,
      cy: baseY + DOOR_THR_H/2,
      cz: door.y,
      ry, floor: door.floor });

    // ── Door panel leaf ───────────────────────────────────────────────────────
    const PW = W - 2 * DOOR_FW;
    const PH = dH - DOOR_THR_H - DOOR_FW;  // between threshold top and head underside

    specs.push({ id: `dp-${n++}`, role: "door-panel",
      w: PW, h: PH, d: DOOR_PT,
      cx: door.x,
      cy: baseY + DOOR_THR_H + PH/2,
      cz: door.y,
      ry, floor: door.floor });

    // ── Handle (both faces of the panel) ─────────────────────────────────────
    // Offset toward the latch side: negative-dir = left jamb side when
    // viewed from the positive normal face.
    const hWOff  = -(W/2 - DOOR_FW - 0.095);   // ~95 mm from left frame
    const hCy    = baseY + 1.040;               // 1040 mm — Indian standard

    for (const face of [-1, 1] as const) {
      // face +1 = positive normal side, face -1 = negative normal side
      const plateDOff = face * (DOOR_PT/2 + HANDLE_PLATE_D/2);
      const barDOff   = face * (DOOR_PT/2 + HANDLE_PLATE_D + HANDLE_BAR_D/2);

      // Backplate (thin escutcheon mounted on panel face)
      specs.push({ id: `dh-pl-${n++}`, role: "door-handle",
        w: HANDLE_PLATE_W,
        h: HANDLE_PLATE_H,
        d: HANDLE_PLATE_D,
        cx: door.x + dX * hWOff + nX * plateDOff,
        cy: hCy,
        cz: door.y + dZ * hWOff + nZ * plateDOff,
        ry, floor: door.floor });

      // Lever / pull bar (protrudes from panel face)
      specs.push({ id: `dh-br-${n++}`, role: "door-handle",
        w: HANDLE_BAR_W,
        h: HANDLE_BAR_H,
        d: HANDLE_BAR_D,
        cx: door.x + dX * hWOff + nX * barDOff,
        cy: hCy,
        cz: door.y + dZ * hWOff + nZ * barDOff,
        ry, floor: door.floor });
    }
  }

  return specs;
}

// ─── Sliding aluminium window assembly ────────────────────────────────────────
//
// Cross-section view (looking along the wall):
//
//  ┌─────────────────────────────────────┐  ← top rail (FW tall)
//  │ ┌───────────────┐ | ┌────────────┐ │
//  │ │  left pane    │ | │ right pane │ │  ← two glass sashes
//  │ │   (glass)     │ | │  (glass)   │ │     separated by centre divider
//  │ └───────────────┘ | └────────────┘ │
//  └─────────────────────────────────────┘  ← bottom rail (FW tall)
//  stile              div            stile
//
//  ─────══════════════════════════════────  ← external window sill (projecting)

export function buildWindowFrames(windows: WinType[], walls: Wall[]): BoxSpec[] {
  const specs: BoxSpec[] = [];
  const wallMap = new Map(walls.map(w => [w.id, w]));
  let n = 0;

  for (const win of windows) {
    const wall  = wallMap.get(win.wallId);
    if (!wall) continue;

    const T      = wall.type === "external" ? EXT_WALL_T : INT_WALL_T;
    const sill   = win.type === "ventilator" ? VENT_SILL : (win.sillHeight ?? WIN_SILL);
    const wH     = win.type === "ventilator" ? VENT_H    : win.height;
    const wW     = win.width;
    const baseY  = PLINTH_H + win.floor * FLOOR_TO_FLOOR;
    const ry     = wallRotY(wall);
    const [dX, dZ] = wallDir(wall);

    const FW     = WIN_FW;

    // ── Outer aluminium frame (4 rails) ──────────────────────────────────────

    // Left stile (full wall thickness to seal the reveal)
    specs.push({ id: `wf-ls-${n++}`, role: "window-frame",
      w: FW, h: wH, d: T,
      cx: win.x - dX * (wW/2 - FW/2),
      cy: baseY + sill + wH/2,
      cz: win.y - dZ * (wW/2 - FW/2),
      ry, floor: win.floor });

    // Right stile
    specs.push({ id: `wf-rs-${n++}`, role: "window-frame",
      w: FW, h: wH, d: T,
      cx: win.x + dX * (wW/2 - FW/2),
      cy: baseY + sill + wH/2,
      cz: win.y + dZ * (wW/2 - FW/2),
      ry, floor: win.floor });

    // Top rail
    specs.push({ id: `wf-tr-${n++}`, role: "window-frame",
      w: wW, h: FW, d: T,
      cx: win.x,
      cy: baseY + sill + wH - FW/2,
      cz: win.y,
      ry, floor: win.floor });

    // Bottom rail
    specs.push({ id: `wf-br-${n++}`, role: "window-frame",
      w: wW, h: FW, d: T,
      cx: win.x,
      cy: baseY + sill + FW/2,
      cz: win.y,
      ry, floor: win.floor });

    const innerW = wW - 2 * FW;
    const innerH = wH - 2 * FW;
    const glassY = baseY + sill + FW + innerH/2;

    if (win.type === "ventilator") {
      // ── Ventilator: single fixed glass pane ──────────────────────────────────
      specs.push({ id: `wg-v-${n++}`, role: "window-glass",
        w: innerW - 0.004, h: innerH - 0.004, d: GLASS_T,
        cx: win.x,
        cy: glassY,
        cz: win.y,
        ry, floor: win.floor });

    } else {
      // ── Sliding window: two sashes separated by a centre meeting-stile ───────

      // Centre meeting-stile / sliding track divider
      specs.push({ id: `wf-div-${n++}`, role: "window-frame",
        w: WIN_DIV, h: innerH, d: T * 0.60,
        cx: win.x,
        cy: glassY,
        cz: win.y,
        ry, floor: win.floor });

      const paneW = (innerW - WIN_DIV) / 2;
      const paneWClear = paneW - 0.005;   // 5 mm clearance each pane
      const paneHClear = innerH - 0.005;

      // Left glass pane (the sliding sash closer to the viewer)
      specs.push({ id: `wg-L-${n++}`, role: "window-glass",
        w: paneWClear, h: paneHClear, d: GLASS_T,
        cx: win.x - dX * (WIN_DIV/2 + paneW/2),
        cy: glassY,
        cz: win.y - dZ * (WIN_DIV/2 + paneW/2),
        ry, floor: win.floor });

      // Right glass pane (the fixed sash slightly behind)
      specs.push({ id: `wg-R-${n++}`, role: "window-glass",
        w: paneWClear, h: paneHClear, d: GLASS_T,
        cx: win.x + dX * (WIN_DIV/2 + paneW/2),
        cy: glassY,
        cz: win.y + dZ * (WIN_DIV/2 + paneW/2),
        ry, floor: win.floor });

      // ── External window sill (exterior walls only, not ventilators) ──────────
      if (wall.type === "external") {
        // The sill sits just below the window opening, flush-to-slab below.
        // Depth = wall thickness + projection (visible as a ledge from outside).
        specs.push({ id: `ws-${n++}`, role: "window-sill",
          w: wW + 0.060,           // 30 mm wider each side of the opening
          h: WIN_SILL_T,           // 38 mm slab
          d: T + WIN_SILL_PROJ * 2, // symmetric projection beyond both faces
          cx: win.x,
          cy: baseY + sill - WIN_SILL_T/2,
          cz: win.y,
          ry, floor: win.floor });
      }
    }
  }

  return specs;
}
