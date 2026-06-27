import type {
  Room,
  Wall,
  Door,
  Window,
  DoorType,
  FacingDirection,
  LayoutInput,
} from "./types";

// ─── Standard dimensions (metres) ─────────────────────────────────────────────

const DOOR_DIMS: Record<DoorType, { w: number; h: number }> = {
  main:     { w: 1.2, h: 2.1 },
  internal: { w: 0.9, h: 2.1 },
  bathroom: { w: 0.75, h: 2.1 },
  balcony:  { w: 0.9,  h: 2.1 },
  service:  { w: 0.75, h: 2.1 },
};

const WINDOW_WIDTH    = 1.2;
const WINDOW_HEIGHT   = 1.2;
const WINDOW_SILL     = 0.9;
const VENTILATOR_W    = 0.6;
const VENTILATOR_H    = 0.45;
const VENTILATOR_SILL = 1.95;

// ─── Wall compass direction ───────────────────────────────────────────────────

function wallFacingFromGeometry(wall: Wall): FacingDirection {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  if (Math.abs(dx) > Math.abs(dy)) {
    return wall.y1 < 0.001 ? "N" : "S";
  }
  return wall.x1 < 0.001 ? "W" : "E";
}

// ─── Find walls on a given face of a room ────────────────────────────────────

function wallsOnFace(walls: Wall[], room: Room, face: "N" | "S" | "E" | "W"): Wall[] {
  const TOL = 0.05;
  return walls.filter((w) => {
    if (w.floor !== room.floor) return false;
    switch (face) {
      case "N": return Math.abs(w.y1 - room.y) < TOL && Math.abs(w.y2 - room.y) < TOL;
      case "S": return Math.abs(w.y1 - (room.y + room.depth)) < TOL && Math.abs(w.y2 - (room.y + room.depth)) < TOL;
      case "W": return Math.abs(w.x1 - room.x) < TOL && Math.abs(w.x2 - room.x) < TOL;
      case "E": return Math.abs(w.x1 - (room.x + room.width)) < TOL && Math.abs(w.x2 - (room.x + room.width)) < TOL;
    }
  });
}

// ─── Centre position along wall ──────────────────────────────────────────────

function centreOnWall(wall: Wall, t = 0.5): { x: number; y: number } {
  return {
    x: parseFloat((wall.x1 + (wall.x2 - wall.x1) * t).toFixed(3)),
    y: parseFloat((wall.y1 + (wall.y2 - wall.y1) * t).toFixed(3)),
  };
}

// ─── Counters ─────────────────────────────────────────────────────────────────

let _dCounter = 0;
let _wCounter = 0;

export function resetOpeningCounters(): void {
  _dCounter = 0;
  _wCounter = 0;
}

// ─── Main entrance door ───────────────────────────────────────────────────────

function placeMainDoor(
  rooms: Room[], walls: Wall[], facing: FacingDirection,
): Door | null {
  const entryRoom =
    rooms.find((r) => r.type === "foyer"  && r.floor === 0) ??
    rooms.find((r) => r.type === "living" && r.floor === 0);
  if (!entryRoom) return null;

  const candidates = wallsOnFace(walls, entryRoom, facing);
  const wall = candidates.find((w) => w.type === "external") ?? candidates[0];
  if (!wall) return null;

  const pos  = centreOnWall(wall, 0.5);
  const dims = DOOR_DIMS["main"];

  return {
    id: `door-main-${++_dCounter}`,
    floor: 0,
    wallId: wall.id,
    x: pos.x, y: pos.y,
    width: dims.w, height: dims.h,
    type: "main",
    swingDirection: "inward",
    facingWall: facing,
  };
}

// ─── Internal doors (room-to-room) ───────────────────────────────────────────

// Room types that should NOT have internal doors placed automatically
const NO_AUTO_DOOR = new Set([
  "passage", "terrace", "entrance_gate", "front_garden",
]);

function placeInternalDoors(rooms: Room[], walls: Wall[]): Door[] {
  const doors: Door[] = [];
  const processed = new Set<string>();

  const doored = rooms.filter((r) => !NO_AUTO_DOOR.has(r.type));

  for (const room of doored) {
    const sharedWalls = walls.filter(
      (w) =>
        w.floor === room.floor &&
        w.type === "internal" &&
        w.roomIds.includes(room.id) &&
        w.length >= 0.9,
    );

    for (const wall of sharedWalls) {
      const pairKey = [...wall.roomIds].sort().join("|");
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);

      const doorType: DoorType =
        room.type === "bathroom" || room.type === "toilet" ? "bathroom"
        : room.type === "balcony" ? "balcony"
        : room.type === "utility" ? "service"
        : "internal";

      const dims = DOOR_DIMS[doorType];
      if (wall.length < dims.w + 0.3) continue;

      const pos    = centreOnWall(wall, 0.5);
      const faceDir = wallFacingFromGeometry(wall);

      doors.push({
        id: `door-int-${++_dCounter}`,
        floor: room.floor,
        wallId: wall.id,
        x: pos.x, y: pos.y,
        width: dims.w, height: dims.h,
        type: doorType,
        swingDirection: "inward",
        facingWall: faceDir,
      });
    }
  }

  return doors;
}

// ─── Windows ─────────────────────────────────────────────────────────────────

// Room types that get NO external windows
const NO_WINDOW_TYPES = new Set([
  "staircase", "foyer", "parking", "passage",
  "entrance_gate", "front_garden",
]);

// Room types that get ventilators instead of full windows
const VENTILATOR_TYPES = new Set(["bathroom", "toilet"]);

function placeWindows(
  rooms: Room[], walls: Wall[],
  plotWidth: number, plotDepth: number,
  facingDirection: FacingDirection,
): Window[] {
  const windows: Window[] = [];

  for (const room of rooms) {
    if (NO_WINDOW_TYPES.has(room.type)) continue;

    const externalWalls = walls.filter(
      (w) =>
        w.floor === room.floor &&
        w.type === "external" &&
        w.roomIds.includes(room.id) &&
        w.length >= 0.9,
    );

    const isVent = VENTILATOR_TYPES.has(room.type);

    for (const wall of externalWalls) {
      const minLen = isVent ? VENTILATOR_W + 0.3 : WINDOW_WIDTH + 0.3;
      if (wall.length < minLen) continue;

      const faceDir = wallFacingFromGeometry(wall);
      const count   = Math.max(1, Math.floor(wall.length / 3));
      const step    = 1 / (count + 1);

      for (let i = 1; i <= count; i++) {
        const pos = centreOnWall(wall, step * i);

        if (isVent) {
          windows.push({
            id: `win-vent-${++_wCounter}`,
            floor: room.floor,
            wallId: wall.id,
            x: pos.x, y: pos.y,
            width: VENTILATOR_W, height: VENTILATOR_H,
            sillHeight: VENTILATOR_SILL,
            type: "ventilator",
            facingWall: faceDir,
          } as Window);
        } else {
          const isBalcony  = room.type === "balcony";
          const winH = isBalcony ? 2.1 : WINDOW_HEIGHT;
          const sill = isBalcony ? 0.0 : WINDOW_SILL;

          windows.push({
            id: `win-${++_wCounter}`,
            floor: room.floor,
            wallId: wall.id,
            x: pos.x, y: pos.y,
            width: WINDOW_WIDTH, height: winH,
            sillHeight: sill,
            type: isBalcony ? "sliding" : "casement",
            facingWall: faceDir,
          });
        }
      }
    }
  }

  return windows;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export function generateOpenings(
  rooms: Room[], walls: Wall[], input: LayoutInput,
): { doors: Door[]; windows: Window[] } {
  resetOpeningCounters();

  const doors: Door[]    = [];
  const windows: Window[] = [];

  const mainDoor = placeMainDoor(rooms, walls, input.facingDirection);
  if (mainDoor) doors.push(mainDoor);

  doors.push(...placeInternalDoors(rooms, walls));

  windows.push(
    ...placeWindows(rooms, walls, input.plotWidth, input.plotDepth, input.facingDirection),
  );

  return { doors, windows };
}
