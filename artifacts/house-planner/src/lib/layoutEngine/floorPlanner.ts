import type {
  LayoutInput,
  OccupancyGrid,
  PlacedRoom,
  RoomSpec,
  VastuZone,
  FloorPlan,
} from "./types";
import { getZoneRect } from "./vastu";

// ─── Constants ───────────────────────────────────────────────────────────────

const CELL = 0.3; // grid cell size in metres
const WALL_SETBACK = 0.0; // extra setback from plot edge (built into wall thickness)
const SNAP = 0.3; // dimension snap grid

// ─── Utility: round to nearest snap ─────────────────────────────────────────

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

// ─── Occupancy grid ──────────────────────────────────────────────────────────

function createGrid(plotWidth: number, plotDepth: number): OccupancyGrid {
  const cols = Math.ceil(plotWidth / CELL);
  const rows = Math.ceil(plotDepth / CELL);
  return {
    cells: Array.from({ length: rows }, () => new Array(cols).fill(false)),
    cellSize: CELL,
    cols,
    rows,
  };
}

function markRect(
  grid: OccupancyGrid,
  x: number,
  y: number,
  w: number,
  d: number
): void {
  const c0 = Math.floor(x / CELL);
  const r0 = Math.floor(y / CELL);
  const c1 = Math.ceil((x + w) / CELL);
  const r1 = Math.ceil((y + d) / CELL);
  for (let r = r0; r < r1 && r < grid.rows; r++) {
    for (let c = c0; c < c1 && c < grid.cols; c++) {
      grid.cells[r][c] = true;
    }
  }
}

function isFree(
  grid: OccupancyGrid,
  x: number,
  y: number,
  w: number,
  d: number,
  plotWidth: number,
  plotDepth: number
): boolean {
  if (x < 0 || y < 0 || x + w > plotWidth + 0.001 || y + d > plotDepth + 0.001) {
    return false;
  }
  const c0 = Math.floor(x / CELL);
  const r0 = Math.floor(y / CELL);
  const c1 = Math.ceil((x + w) / CELL) - 1;
  const r1 = Math.ceil((y + d) / CELL) - 1;
  for (let r = r0; r <= r1 && r < grid.rows; r++) {
    for (let c = c0; c <= c1 && c < grid.cols; c++) {
      if (grid.cells[r][c]) return false;
    }
  }
  return true;
}

// ─── Strip-based placement search ────────────────────────────────────────────
// Scans left→right, top→bottom (or adjusted by zone preference).

function findPlacement(
  grid: OccupancyGrid,
  w: number,
  d: number,
  preferredZones: VastuZone[],
  plotWidth: number,
  plotDepth: number,
  _vastuCompliant: boolean
): { x: number; y: number } | null {
  // Build candidate origin points in zone-priority order
  const candidates: Array<{ x: number; y: number; priority: number }> = [];

  // Try preferred zones first
  for (let zonePriority = 0; zonePriority < preferredZones.length; zonePriority++) {
    const zone = preferredZones[zonePriority];
    const zr = getZoneRect(zone, plotWidth, plotDepth);

    // Scan inside this zone
    const xStart = snap(Math.max(0, zr.x));
    const yStart = snap(Math.max(0, zr.y));
    const xEnd = snap(Math.min(plotWidth - w, zr.x + zr.width));
    const yEnd = snap(Math.min(plotDepth - d, zr.y + zr.depth));

    for (let y = yStart; y <= yEnd + 0.001; y = snap(y + SNAP)) {
      for (let x = xStart; x <= xEnd + 0.001; x = snap(x + SNAP)) {
        candidates.push({ x: snap(x), y: snap(y), priority: zonePriority * 10000 + y * 100 + x });
      }
    }
  }

  // Sort by priority (zone preference, then top-left)
  candidates.sort((a, b) => a.priority - b.priority);

  for (const { x, y } of candidates) {
    if (isFree(grid, x, y, w, d, plotWidth, plotDepth)) {
      return { x, y };
    }
  }

  // Fallback: full plot scan top-left to bottom-right
  for (let y = 0; y <= plotDepth - d + 0.001; y = snap(y + SNAP)) {
    for (let x = 0; x <= plotWidth - w + 0.001; x = snap(x + SNAP)) {
      if (isFree(grid, snap(x), snap(y), w, d, plotWidth, plotDepth)) {
        return { x: snap(x), y: snap(y) };
      }
    }
  }

  return null;
}

// ─── Choose actual dimensions ─────────────────────────────────────────────────
// Use ideal dimensions if they fit, otherwise shrink toward minimum.

function chooseDimensions(
  spec: RoomSpec,
  plotWidth: number,
  plotDepth: number
): { w: number; d: number } {
  const [wMin, wIdeal] = spec.widthRange;
  const [dMin, dIdeal] = spec.depthRange;

  const w = snap(Math.min(wIdeal, plotWidth));
  const d = snap(Math.min(dIdeal, plotDepth));

  return {
    w: Math.max(wMin, w),
    d: Math.max(dMin, d),
  };
}

// ─── ID helpers ──────────────────────────────────────────────────────────────

let _counter = 0;

function uid(prefix: string): string {
  return `${prefix}-${++_counter}`;
}

export function resetCounter(): void {
  _counter = 0;
}

// ─── Plan a single floor ──────────────────────────────────────────────────────

export function planFloor(
  floorIndex: number,
  specs: RoomSpec[],
  input: LayoutInput,
  stairReservation?: { x: number; y: number; width: number; depth: number }
): FloorPlan {
  const { plotWidth, plotDepth, vastuCompliant } = input;
  const grid = createGrid(plotWidth, plotDepth);
  const placedRooms: PlacedRoom[] = [];

  // Reserve staircase footprint if supplied (so other rooms don't overlap it)
  if (stairReservation) {
    markRect(
      grid,
      stairReservation.x,
      stairReservation.y,
      stairReservation.width,
      stairReservation.depth
    );
  }

  // Separate specs for this floor
  const floorSpecs = specs.filter(
    (s) => s.targetFloor === floorIndex || s.targetFloor === -1
  );

  for (const spec of floorSpecs) {
    const { w, d } = chooseDimensions(spec, plotWidth, plotDepth);

    const pos = findPlacement(
      grid,
      w,
      d,
      spec.preferredZones,
      plotWidth,
      plotDepth,
      vastuCompliant
    );

    if (!pos) {
      // Skip: no space (will appear in warnings)
      continue;
    }

    markRect(grid, pos.x, pos.y, w, d);

    placedRooms.push({
      id: uid(`room-f${floorIndex}`),
      name: spec.name,
      type: spec.type,
      floor: floorIndex,
      x: pos.x,
      y: pos.y,
      width: w,
      depth: d,
      area: parseFloat((w * d).toFixed(2)),
      vastuZone: spec.preferredZones[0],
      spec,
    });
  }

  return {
    floor: floorIndex,
    rooms: placedRooms,
    stairReservation,
  };
}

// ─── Multi-floor planner ──────────────────────────────────────────────────────

export function planAllFloors(
  specs: RoomSpec[],
  input: LayoutInput
): FloorPlan[] {
  const floorPlans: FloorPlan[] = [];

  // Decide stair location deterministically on ground floor first
  let stairReservation:
    | { x: number; y: number; width: number; depth: number }
    | undefined;

  if (input.floors > 1 || input.hasStaircase) {
    const stairSpec = specs.find((s) => s.type === "staircase" && s.targetFloor === 0);
    if (stairSpec) {
      const { w, d } = chooseDimensions(stairSpec, input.plotWidth, input.plotDepth);

      // Place staircase in Vastu-preferred zone before any other room
      const tempGrid = createGrid(input.plotWidth, input.plotDepth);
      const pos = findPlacement(
        tempGrid,
        w,
        d,
        stairSpec.preferredZones,
        input.plotWidth,
        input.plotDepth,
        input.vastuCompliant
      );

      if (pos) {
        stairReservation = { x: pos.x, y: pos.y, width: w, depth: d };
      }
    }
  }

  for (let floor = 0; floor < input.floors; floor++) {
    const floorSpecs = specs.filter(
      (s) => s.targetFloor === floor || s.targetFloor === -1
    );

    // Remove staircase from regular specs (we handle it separately below)
    const nonStairSpecs = floorSpecs.filter((s) => s.type !== "staircase");

    const plan = planFloor(floor, nonStairSpecs, input, stairReservation);
    floorPlans.push(plan);
  }

  return floorPlans;
}
