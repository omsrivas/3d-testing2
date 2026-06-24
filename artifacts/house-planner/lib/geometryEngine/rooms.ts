import type { WallGraph } from "@/types/geometry";
import type { RoomPolygon } from "./types";
import type { Point2D } from "@/types/house";

export function detectRooms(graph: WallGraph): RoomPolygon[] {
  const polygons: RoomPolygon[] = [];

  const edgeMap = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (!edgeMap.has(edge.startNodeId)) edgeMap.set(edge.startNodeId, new Set());
    if (!edgeMap.has(edge.endNodeId)) edgeMap.set(edge.endNodeId, new Set());
    edgeMap.get(edge.startNodeId)!.add(edge.endNodeId);
    edgeMap.get(edge.endNodeId)!.add(edge.startNodeId);
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const visited = new Set<string>();

  const dfs = (
    startId: string,
    path: string[],
    depth: number
  ): string[][] => {
    if (depth > 20) return [];
    const results: string[][] = [];

    const neighbors = edgeMap.get(startId) ?? new Set<string>();
    for (const neighborId of neighbors) {
      if (neighborId === path[0] && path.length >= 3) {
        results.push([...path]);
      } else if (!path.includes(neighborId)) {
        results.push(...dfs(neighborId, [...path, neighborId], depth + 1));
      }
    }
    return results;
  };

  for (const node of graph.nodes) {
    if ((edgeMap.get(node.id)?.size ?? 0) < 2) continue;
    const cycles = dfs(node.id, [node.id], 0);
    for (const cycle of cycles) {
      const key = [...cycle].sort().join(",");
      if (!visited.has(key)) {
        visited.add(key);
        const points = cycle.map((id) => nodeById.get(id)!.point);
        polygons.push(makePolygon(points));
      }
    }
  }

  return polygons;
}

function makePolygon(points: Point2D[]): RoomPolygon {
  const area = Math.abs(
    points.reduce((acc, p, i) => {
      const next = points[(i + 1) % points.length];
      return acc + p.x * next.y - next.x * p.y;
    }, 0) / 2
  );

  const centroid: Point2D = {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };

  return { points, area, centroid };
}
