import type { Room, Stair, StairType, LayoutInput } from "./types";

// ─── Standard stair dimensions ────────────────────────────────────────────────

const RISER_H = 0.175; // metres (7 inches) — comfortable riser
const TREAD_D = 0.270; // metres (10.5 inches) — comfortable tread
const FLOOR_H = 3.0; // metres — floor-to-floor height

// Number of risers for one floor
const RISERS_PER_FLIGHT = Math.round(FLOOR_H / RISER_H); // 18 risers
// Total horizontal run per flight
const FLIGHT_RUN = RISERS_PER_FLIGHT * TREAD_D; // ~4.86 m

// ─── Stair footprint from room ────────────────────────────────────────────────
// We find the staircase room on the lower floor and create stair specs from it.

function stairType(flightRun: number, stairWidth: number): StairType {
  // If the room is wide enough for a dog-leg, use that.
  // Otherwise straight.
  if (stairWidth >= 2 * 1.2 + 0.1) return "dog-leg";
  if (stairWidth >= 1.2 && flightRun > stairWidth) return "L-shape";
  return "straight";
}

let _sCounter = 0;

export function resetStairCounter(): void {
  _sCounter = 0;
}

export function generateStairs(
  rooms: Room[],
  input: LayoutInput
): Stair[] {
  if (input.floors <= 1 && !input.hasStaircase) return [];

  const stairs: Stair[] = [];

  for (let fromFloor = 0; fromFloor < input.floors - 1; fromFloor++) {
    const toFloor = fromFloor + 1;

    // Find the staircase room on the lower floor
    const stairRoom = rooms.find(
      (r) => r.type === "staircase" && r.floor === fromFloor
    );

    if (!stairRoom) continue;

    const stairWidth = Math.min(stairRoom.width, stairRoom.depth);
    const stairDepth = Math.max(stairRoom.width, stairRoom.depth);

    const type = stairType(FLIGHT_RUN, stairWidth);

    // Direction: stair ascends toward the longer axis of the room
    const direction: Stair["direction"] =
      stairRoom.depth >= stairRoom.width ? "S" : "E";

    // Steps: always RISERS_PER_FLIGHT (18 risers = 17 treads + 1 landing tread)
    const steps = RISERS_PER_FLIGHT;

    // Landing width for non-straight stairs
    const landingWidth = type !== "straight" ? stairWidth : undefined;

    stairs.push({
      id: `stair-${fromFloor}-${toFloor}-${++_sCounter}`,
      fromFloor,
      toFloor,
      x: parseFloat(stairRoom.x.toFixed(3)),
      y: parseFloat(stairRoom.y.toFixed(3)),
      width: parseFloat(stairRoom.width.toFixed(3)),
      depth: parseFloat(stairRoom.depth.toFixed(3)),
      type,
      steps,
      riserHeight: RISER_H,
      treadDepth: TREAD_D,
      direction,
      landingWidth,
    });
  }

  return stairs;
}
