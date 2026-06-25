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
  main: { w: 1.2, h: 2.1 },
  internal: { w: 0.9, h: 2.1 },
  bathroom: { w: 0.75, h: 2.1 },
  balcony: { w: 0.9, h: 2.1 },
  service: { w: 0.75, h: 2.1 },
};

const WINDOW_WIDTH = 1.2;
const WINDOW_HEIGHT = 1.2;
const WINDOW_SILL = 0.9;
const VENTILATOR_WIDTH = 0.6;
const VENTILATOR_HEIGHT = 0.45;
const VENTILATOR_SILL = 1.95;

// ─── Wall compass direction ───────────────────────────────────────────────────

function wallFacing(wall: Wall): FacingDirection {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  if (Math.abs(dy) < 0.01) {
    // Horizontal wall: either N or S face
    return dy >= 0 ? "N" : "S";
  }
  // Vertical wall: either E or W face
  return dx >= 0 ? "W" : "E";
}

function wallFacingFromGeometry(wall: Wall): FacingDirection {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  // Horizontal wall (runs E-W): faces N or S
  if (Math.abs(dx) > Math.abs(dy)) {
    return wall.y1 < 0.001 ? "N" : "S";
  }
  // Vertical wall (runs N-S): faces E or W
  return wall.x1 < 0.001 ? "W" : "E";
}

// ─── Find walls belonging to a room face ──────────────────────────────────────

function wallsOnFace(
  walls: Wall[],
  room: Room,
  face: "N" | "S" | "E" | "W"
): Wall[] {
  const TOL = 0.05;
  return walls.filter((w) => {
    if (w.floor !== room.floor) return false;
    switch (face) {
      case "N":
        return Math.abs(w.y1 - room.y) < TOL && Math.abs(w.y2 - room.y) < TOL;
      case "S":
        return (
          Math.abs(w.y1 - (room.y + room.depth)) < TOL &&
          Math.abs(w.y2 - (room.y + room.depth)) < TOL
        );
      case "W":
        return Math.abs(w.x1 - room.x) < TOL && Math.abs(w.x2 - room.x) < TOL;
      case "E":
        return (
          Math.abs(w.x1 - (room.x + room.width)) < TOL &&
          Math.abs(w.x2 - (room.x + room.width)) < TOL
        );
    }
  });
}

// ─── Centre position of door/window on a wall ────────────────────────────────

function centreOnWall(wall: Wall, offsetFromStart = 0.5): { x: number; y: number } {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return {
    x: parseFloat((wall.x1 + dx * offsetFromStart).toFixed(3)),
    y: parseFloat((wall.y1 + dy * offsetFromStart).toFixed(3)),
  };
}

// ─── ID counter ──────────────────────────────────────────────────────────────

let _dCounter = 0;
let _wCounter = 0;

export function resetOpeningCounters(): void {
  _dCounter = 0;
  _wCounter = 0;
}

// ─── Main door (main entrance) ───────────────────────────────────────────────

function placeMainDoor(
  rooms: Room[],
  walls: Wall[],
  facing: FacingDirection
): Door | null {
  // Find foyer or living on ground floor
  const entryRoom =
    rooms.find((r) => r.type === "foyer" && r.floor === 0) ??
    rooms.find((r) => r.type === "living" && r.floor === 0);

  if (!entryRoom) return null;

  // The main door is on the face toward the road (facingDirection)
  // Translate facing into the room's face
  const roomFace = facing; // facing = "N" means main door is on N face of the room

  const candidates = wallsOnFace(walls, entryRoom, roomFace);
  const wall = candidates.find((w) => w.type === "external") ?? candidates[0];

  if (!wall) return null;

  const pos = centreOnWall(wall, 0.5);
  const dims = DOOR_DIMS["main"];

  return {
    id: `door-main-${++_dCounter}`,
    floor: 0,
    wallId: wall.id,
    x: pos.x,
    y: pos.y,
    width: dims.w,
    height: dims.h,
    type: "main",
    swingDirection: "inward",
    facingWall: facing,
  };
}

// ─── Internal doors (between rooms) ──────────────────────────────────────────

function placeInternalDoors(rooms: Room[], walls: Wall[]): Door[] {
  const doors: Door[] = [];
  const processed = new Set<string>();

  // Rooms that need a door: all except parking, balcony (gets sliding), passage
  const doored = rooms.filter(
    (r) => !["passage", "terrace"].includes(r.type)
  );

  for (const room of doored) {
    // Find shared walls with other rooms
    const sharedWalls = walls.filter(
      (w) =>
        w.floor === room.floor &&
        w.type === "internal" &&
        w.roomIds.includes(room.id) &&
        w.length >= 0.9
    );

    for (const wall of sharedWalls) {
      const pairKey = [room.id, ...wall.roomIds].sort().join("|");
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);

      const doorType: DoorType =
        room.type === "bathroom" || room.type === "toilet"
          ? "bathroom"
          : room.type === "balcony"
          ? "balcony"
          : "internal";

      const dims = DOOR_DIMS[doorType];
      if (wall.length < dims.w + 0.3) continue; // wall too narrow for door

      const pos = centreOnWall(wall, 0.5);
      const facing = wallFacingFromGeometry(wall);

      doors.push({
        id: `door-int-${++_dCounter}`,
        floor: room.floor,
        wallId: wall.id,
        x: pos.x,
        y: pos.y,
        width: dims.w,
        height: dims.h,
        type: doorType,
        swingDirection: "inward",
        facingWall: facing,
      });
    }
  }

  return doors;
}

// ─── Windows ─────────────────────────────────────────────────────────────────

function placeWindows(
  rooms: Room[],
  walls: Wall[],
  plotWidth: number,
  plotDepth: number,
  facingDirection: FacingDirection
): Window[] {
  const windows: Window[] = [];

  // Room types that do NOT get external windows
  const noWindowTypes = new Set(["staircase", "foyer", "parking", "passage"]);
  // Bathroom/toilet gets a small ventilator instead
  const ventilatorTypes = new Set(["bathroom", "toilet"]);

  for (const room of rooms) {
    if (noWindowTypes.has(room.type)) continue;

    // Find external walls of this room
    const externalWalls = walls.filter(
      (w) =>
        w.floor === room.floor &&
        w.type === "external" &&
        w.roomIds.includes(room.id) &&
        w.length >= 0.9
    );

    const isVentilator = ventilatorTypes.has(room.type);

    for (const wall of externalWalls) {
      // Skip walls that are too short
      const minLen = isVentilator ? VENTILATOR_WIDTH + 0.3 : WINDOW_WIDTH + 0.3;
      if (wall.length < minLen) continue;

      const facing = wallFacingFromGeometry(wall);

      // How many windows? One per ~3m of wall, minimum 1
      const count = Math.max(1, Math.floor(wall.length / 3));
      const step = 1 / (count + 1);

      for (let i = 1; i <= count; i++) {
        const pos = centreOnWall(wall, step * i);

        if (isVentilator) {
          windows.push({
            id: `win-vent-${++_wCounter}`,
            floor: room.floor,
            wallId: wall.id,
            x: pos.x,
            y: pos.y,
            width: VENTILATOR_WIDTH,
            height: VENTILATOR_HEIGHT,
            sillHeight: VENTILATOR_SILL,
            type: "ventilator",
            facingWall: facing,
          } as Window);
        } else {
          // Balcony gets floor-to-ceiling opening
          const winH = room.type === "balcony" ? 2.1 : WINDOW_HEIGHT;
          const sill = room.type === "balcony" ? 0.0 : WINDOW_SILL;

          windows.push({
            id: `win-${++_wCounter}`,
            floor: room.floor,
            wallId: wall.id,
            x: pos.x,
            y: pos.y,
            width: WINDOW_WIDTH,
            height: winH,
            sillHeight: sill,
            type: room.type === "balcony" ? "sliding" : "casement",
            facingWall: facing,
          });
        }
      }
    }
  }

  return windows;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export function generateOpenings(
  rooms: Room[],
  walls: Wall[],
  input: LayoutInput
): { doors: Door[]; windows: Window[] } {
  resetOpeningCounters();

  const doors: Door[] = [];
  const windows: Window[] = [];

  // Main entrance door
  const mainDoor = placeMainDoor(rooms, walls, input.facingDirection);
  if (mainDoor) doors.push(mainDoor);

  // Internal doors
  doors.push(...placeInternalDoors(rooms, walls));

  // Windows
  windows.push(
    ...placeWindows(rooms, walls, input.plotWidth, input.plotDepth, input.facingDirection)
  );

  return { doors, windows };
}
