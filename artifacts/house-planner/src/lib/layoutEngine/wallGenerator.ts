import type { Room, Wall, WallType } from "./types";

// ─── Constants ───────────────────────────────────────────────────────────────

const EXT_THICKNESS = 0.23; // 9-inch brick wall (metres)
const INT_THICKNESS = 0.115; // 4.5-inch internal partition (metres)
const TOL = 0.05; // coincidence tolerance (metres)

// ─── Per-room wall edges ──────────────────────────────────────────────────────
// Each room produces 4 axis-aligned wall segments (N, E, S, W edges).

interface RawWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roomId: string;
  face: "N" | "E" | "S" | "W";
}

function roomEdges(room: Room): RawWall[] {
  const { x, y, width, depth, id } = room;
  return [
    { x1: x, y1: y, x2: x + width, y2: y, roomId: id, face: "N" },
    { x1: x + width, y1: y, x2: x + width, y2: y + depth, roomId: id, face: "E" },
    { x1: x, y1: y + depth, x2: x + width, y2: y + depth, roomId: id, face: "S" },
    { x1: x, y1: y, x2: x, y2: y + depth, roomId: id, face: "W" },
  ];
}

// ─── Segment key for deduplication ───────────────────────────────────────────
// Normalise so that the "lower" coordinate comes first.

function segKey(x1: number, y1: number, x2: number, y2: number): string {
  const norm = (v: number) => Math.round(v / TOL) * TOL;
  if (x1 < x2 || (x1 === x2 && y1 < y2)) {
    return `${norm(x1)},${norm(y1)},${norm(x2)},${norm(y2)}`;
  }
  return `${norm(x2)},${norm(y2)},${norm(x1)},${norm(y1)}`;
}

// ─── Detect whether a segment touches the plot boundary ──────────────────────

function isExternalEdge(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  plotWidth: number,
  plotDepth: number
): boolean {
  return (
    Math.abs(x1) < TOL && Math.abs(x2) < TOL // W boundary
    || Math.abs(y1) < TOL && Math.abs(y2) < TOL // N boundary
    || Math.abs(x1 - plotWidth) < TOL && Math.abs(x2 - plotWidth) < TOL // E boundary
    || Math.abs(y1 - plotDepth) < TOL && Math.abs(y2 - plotDepth) < TOL // S boundary
  );
}

// ─── Main generator ──────────────────────────────────────────────────────────

let _wCounter = 0;

export function resetWallCounter(): void {
  _wCounter = 0;
}

export function generateWalls(
  rooms: Room[],
  plotWidth: number,
  plotDepth: number
): Wall[] {
  // Group rooms by floor
  const byFloor = new Map<number, Room[]>();
  for (const room of rooms) {
    if (!byFloor.has(room.floor)) byFloor.set(room.floor, []);
    byFloor.get(room.floor)!.push(room);
  }

  const allWalls: Wall[] = [];

  for (const [floor, floorRooms] of byFloor) {
    // Collect all raw edges
    const edgeMap = new Map<string, { raw: RawWall; roomIds: string[] }>();

    for (const room of floorRooms) {
      for (const edge of roomEdges(room)) {
        const key = segKey(edge.x1, edge.y1, edge.x2, edge.y2);
        if (edgeMap.has(key)) {
          edgeMap.get(key)!.roomIds.push(edge.roomId);
        } else {
          edgeMap.set(key, { raw: edge, roomIds: [edge.roomId] });
        }
      }
    }

    // Convert unique edges to Wall objects
    for (const [, { raw, roomIds }] of edgeMap) {
      const external = isExternalEdge(
        raw.x1, raw.y1, raw.x2, raw.y2,
        plotWidth, plotDepth
      );

      // Shared edge between two rooms => internal wall
      const shared = roomIds.length > 1;
      const type: WallType = external ? "external" : shared ? "internal" : "external";

      const dx = raw.x2 - raw.x1;
      const dy = raw.y2 - raw.y1;
      const length = parseFloat(Math.sqrt(dx * dx + dy * dy).toFixed(3));
      if (length < 0.1) continue; // skip degenerate segments

      allWalls.push({
        id: `wall-${floor}-${++_wCounter}`,
        floor,
        x1: parseFloat(raw.x1.toFixed(3)),
        y1: parseFloat(raw.y1.toFixed(3)),
        x2: parseFloat(raw.x2.toFixed(3)),
        y2: parseFloat(raw.y2.toFixed(3)),
        thickness: type === "internal" ? INT_THICKNESS : EXT_THICKNESS,
        type,
        length,
        roomIds: [...new Set(roomIds)],
      });
    }
  }

  return allWalls;
}
