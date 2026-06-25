import type { Room, LayoutOutput, LayoutInput, RoomType } from "./types";

// ─── Overlap detection ────────────────────────────────────────────────────────

const TOL = 0.05;

function overlaps(a: Room, b: Room): boolean {
  if (a.id === b.id || a.floor !== b.floor) return false;
  return (
    a.x + TOL < b.x + b.width &&
    a.x + a.width - TOL > b.x &&
    a.y + TOL < b.y + b.depth &&
    a.y + a.depth - TOL > b.y
  );
}

// ─── Circulation check ────────────────────────────────────────────────────────
// Every floor must have at least one path-forming room (foyer, passage, living, staircase).

const CIRCULATION_TYPES = new Set<RoomType>(["foyer", "living", "passage", "staircase"]);

function hasCirculation(rooms: Room[], floor: number): boolean {
  return rooms.some((r) => r.floor === floor && CIRCULATION_TYPES.has(r.type));
}

// ─── Dimension checks ─────────────────────────────────────────────────────────

const MIN_DIMS: Partial<Record<RoomType, { w: number; d: number }>> = {
  bedroom: { w: 2.7, d: 2.7 },
  master_bedroom: { w: 3.0, d: 3.0 },
  kitchen: { w: 1.8, d: 2.4 },
  bathroom: { w: 1.2, d: 1.8 },
  living: { w: 3.0, d: 2.7 },
  staircase: { w: 1.0, d: 2.4 },
  parking: { w: 2.5, d: 4.5 },
};

// ─── Building code checks ─────────────────────────────────────────────────────

function checkPlotCoverage(
  rooms: Room[],
  plotWidth: number,
  plotDepth: number,
  floors: number
): string[] {
  const warnings: string[] = [];
  const groundRooms = rooms.filter((r) => r.floor === 0);
  const footprint = groundRooms.reduce((s, r) => s + r.width * r.depth, 0);
  const plotArea = plotWidth * plotDepth;
  const far = floors > 0 ? rooms.reduce((s, r) => s + r.area, 0) / plotArea : 0;

  if (footprint / plotArea > 0.75) {
    warnings.push(
      `Ground floor coverage ${((footprint / plotArea) * 100).toFixed(0)}% exceeds typical 75% limit.`
    );
  }
  if (far > 3.0) {
    warnings.push(
      `Floor Area Ratio ${far.toFixed(2)} exceeds common limit of 3.0. Verify local bylaws.`
    );
  }
  return warnings;
}

// ─── Main validator ───────────────────────────────────────────────────────────

export function validateLayout(
  output: LayoutOutput,
  input: LayoutInput
): { warnings: string[] } {
  const warnings: string[] = [];
  const rooms = output.rooms;

  // 1. Overlap check
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (overlaps(rooms[i], rooms[j])) {
        warnings.push(
          `Overlap detected: "${rooms[i].name}" and "${rooms[j].name}" on floor ${rooms[i].floor}.`
        );
      }
    }
  }

  // 2. Circulation
  for (let f = 0; f < input.floors; f++) {
    if (!hasCirculation(rooms, f)) {
      warnings.push(`Floor ${f} has no circulation space (foyer, living, or passage).`);
    }
  }

  // 3. Minimum dimensions
  for (const room of rooms) {
    const minDim = MIN_DIMS[room.type];
    if (!minDim) continue;
    if (room.width < minDim.w || room.depth < minDim.d) {
      warnings.push(
        `"${room.name}" (floor ${room.floor}) is ${room.width.toFixed(1)}×${room.depth.toFixed(1)} m — below minimum ${minDim.w}×${minDim.d} m.`
      );
    }
  }

  // 4. Plot boundary check
  for (const room of rooms) {
    if (
      room.x < -0.01 ||
      room.y < -0.01 ||
      room.x + room.width > input.plotWidth + 0.01 ||
      room.y + room.depth > input.plotDepth + 0.01
    ) {
      warnings.push(
        `"${room.name}" on floor ${room.floor} extends outside plot boundary.`
      );
    }
  }

  // 5. Plot coverage
  warnings.push(
    ...checkPlotCoverage(rooms, input.plotWidth, input.plotDepth, input.floors)
  );

  // 6. Stair requirement
  if (input.floors > 1 && output.stairs.length === 0) {
    warnings.push("Multi-floor project has no staircase. Add a staircase room.");
  }

  return { warnings };
}

// ─── Room summary ─────────────────────────────────────────────────────────────

export function buildRoomSummary(
  rooms: Room[]
): Record<RoomType, number> {
  const summary: Partial<Record<RoomType, number>> = {};
  for (const room of rooms) {
    summary[room.type] = (summary[room.type] ?? 0) + 1;
  }
  return summary as Record<RoomType, number>;
}
