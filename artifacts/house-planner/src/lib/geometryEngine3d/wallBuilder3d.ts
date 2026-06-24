import type { Wall, Door, Window as WinType } from "@/lib/layoutEngine";
import type { BoxSpec, MeshRole } from "./types";
import {
  EXT_WALL_T, INT_WALL_T, WALL_H, FLOOR_TO_FLOOR,
  DOOR_H_INT, WIN_SILL, WIN_H, VENT_SILL, VENT_H,
} from "./constants";

// ─── Project an opening centre onto the wall's local axis ────────────────────
function projectOnWall(ox: number, oy: number, wall: Wall): number {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const L2 = dx * dx + dy * dy;
  return ((ox - wall.x1) * dx + (oy - wall.y1) * dy) / Math.sqrt(L2);
}

// ─── Opening descriptor in wall-local space ──────────────────────────────────
interface Opening {
  hCenter: number; // distance from wall start (m)
  hHalf:   number; // half the opening width
  vBot:    number; // bottom height from floor (0 for doors)
  vTop:    number; // top height from floor
}

function gatherOpenings(wall: Wall, doors: Door[], windows: WinType[]): Opening[] {
  const ops: Opening[] = [];

  for (const d of doors) {
    if (d.wallId !== wall.id) continue;
    ops.push({
      hCenter: projectOnWall(d.x, d.y, wall),
      hHalf:   d.width / 2,
      vBot:    0,
      vTop:    Math.min(d.height, DOOR_H_INT),
    });
  }

  for (const w of windows) {
    if (w.wallId !== wall.id) continue;
    const sill = w.sillHeight ?? WIN_SILL;
    const wh   = w.type === "ventilator" ? VENT_H : w.height;
    const ws   = w.type === "ventilator" ? VENT_SILL : sill;
    ops.push({
      hCenter: projectOnWall(w.x, w.y, wall),
      hHalf:   w.width / 2,
      vBot:    ws,
      vTop:    ws + wh,
    });
  }

  return ops.sort((a, b) => a.hCenter - b.hCenter);
}

// ─── World-space centre of a wall sub-segment ─────────────────────────────────
function segCentre(wall: Wall, dStart: number, dEnd: number): [number, number] {
  const L  = wall.length;
  const dx = wall.x2 - wall.x1;
  const dz = wall.y2 - wall.y1;
  const tMid = (dStart + dEnd) / (2 * L);
  return [wall.x1 + dx * tMid, wall.y1 + dz * tMid];
}

// ─── Wall Y-rotation to align BoxGeometry width with wall direction ───────────
function wallRotY(wall: Wall): number {
  // BoxGeometry default: width along world X.
  // Rotating by -atan2(dz, dx) aligns it with the wall direction in XZ plane.
  return -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
}

// ─── Emit a single wall box ────────────────────────────────────────────────────
function emit(
  id: string,
  role: MeshRole,
  wall: Wall,
  dStart: number,  // distance from wall start (m)
  dEnd:   number,
  vBot:   number,  // height from floor (m)
  vTop:   number,
  T:      number,  // wall thickness
  floor:  number,
  out:    BoxSpec[],
): void {
  const len = dEnd - dStart;
  const ht  = vTop - vBot;
  if (len < 0.02 || ht < 0.01) return;

  const baseY     = floor * FLOOR_TO_FLOOR;
  const [cx, cz]  = segCentre(wall, dStart, dEnd);

  out.push({
    id,
    role,
    w:  len,
    h:  ht,
    d:  T,
    cx,
    cy: baseY + vBot + ht / 2,
    cz,
    ry: wallRotY(wall),
    floor,
  });
}

// ─── Main wall builder ────────────────────────────────────────────────────────
export function buildWalls(
  walls: Wall[],
  doors: Door[],
  windows: WinType[],
): BoxSpec[] {
  const specs: BoxSpec[] = [];
  let ctr = 0;

  for (const wall of walls) {
    const L    = wall.length;
    const T    = wall.type === "external" ? EXT_WALL_T : INT_WALL_T;
    const role: MeshRole = wall.type === "external" ? "exterior-wall" : "interior-wall";
    const f    = wall.floor;

    const ops  = gatherOpenings(wall, doors, windows);

    // Build horizontal intervals along the wall
    type Seg = { d0: number; d1: number; op: Opening | null };
    const segs: Seg[] = [];
    let cursor = 0;

    for (const op of ops) {
      const opL = Math.max(0, op.hCenter - op.hHalf);
      const opR = Math.min(L, op.hCenter + op.hHalf);
      if (opL > cursor + 0.01) segs.push({ d0: cursor, d1: opL,  op: null });
      if (opR > opL + 0.01)    segs.push({ d0: opL,    d1: opR,  op });
      cursor = opR;
    }
    if (cursor < L - 0.01) segs.push({ d0: cursor, d1: L, op: null });
    if (segs.length === 0)  segs.push({ d0: 0,      d1: L, op: null });

    for (const seg of segs) {
      const pfx = `w-${wall.id}-${ctr++}`;

      if (!seg.op) {
        // Solid full-height piece
        emit(pfx, role, wall, seg.d0, seg.d1, 0, WALL_H, T, f, specs);
      } else {
        const op = seg.op;
        // Sill piece  (below opening – only for windows)
        if (op.vBot > 0.02) {
          emit(`${pfx}-sill`, role, wall, seg.d0, seg.d1, 0, op.vBot, T, f, specs);
        }
        // Header / lintel piece  (above opening)
        if (WALL_H - op.vTop > 0.02) {
          emit(`${pfx}-hdr`, role, wall, seg.d0, seg.d1, op.vTop, WALL_H, T, f, specs);
        }
        // No side "jamb" columns needed – corners cover those
      }
    }
  }

  return specs;
}
