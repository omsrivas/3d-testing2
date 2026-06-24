import type { Wall } from "@/types/house";
import type { WallGraph, WallNode, WallEdge, SnapResult } from "@/types/geometry";
import type { ExtrudedWall, MergedGeometry } from "./types";

export function buildWallGraph(walls: Wall[]): WallGraph {
  const nodeMap = new Map<string, WallNode>();
  const edges: WallEdge[] = [];

  const pointKey = (x: number, y: number) =>
    `${Math.round(x * 100)},${Math.round(y * 100)}`;

  const getOrCreateNode = (x: number, y: number): WallNode => {
    const key = pointKey(x, y);
    if (!nodeMap.has(key)) {
      const node: WallNode = {
        id: key,
        point: { x, y },
        connectedEdgeIds: [],
      };
      nodeMap.set(key, node);
    }
    return nodeMap.get(key)!;
  };

  for (const wall of walls) {
    const startNode = getOrCreateNode(wall.start.x, wall.start.y);
    const endNode = getOrCreateNode(wall.end.x, wall.end.y);

    const edge: WallEdge = {
      id: `edge-${wall.id}`,
      wallId: wall.id,
      startNodeId: startNode.id,
      endNodeId: endNode.id,
    };

    startNode.connectedEdgeIds.push(edge.id);
    endNode.connectedEdgeIds.push(edge.id);
    edges.push(edge);
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

export function extrudeWalls(
  walls: Wall[],
  defaultHeight = 2.7
): ExtrudedWall[] {
  return walls.map((wall) => {
    const height = wall.height ?? defaultHeight;
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;
    const t = wall.thickness * 0.5;

    const x0 = wall.start.x + nx * t;
    const z0 = wall.start.y + ny * t;
    const x1 = wall.start.x - nx * t;
    const z1 = wall.start.y - ny * t;
    const x2 = wall.end.x - nx * t;
    const z2 = wall.end.y - ny * t;
    const x3 = wall.end.x + nx * t;
    const z3 = wall.end.y + ny * t;

    const vertices: [number, number, number][] = [
      [x0, 0, z0],
      [x1, 0, z1],
      [x2, 0, z2],
      [x3, 0, z3],
      [x0, height, z0],
      [x1, height, z1],
      [x2, height, z2],
      [x3, height, z3],
    ];

    const faces = [
      [0, 1, 2, 3],
      [4, 7, 6, 5],
      [0, 4, 5, 1],
      [1, 5, 6, 2],
      [2, 6, 7, 3],
      [3, 7, 4, 0],
    ];

    return {
      wallId: wall.id,
      vertices,
      faces,
      normal: [nx, 0, ny],
    };
  });
}

export function mergeCoplanarFaces(
  extruded: ExtrudedWall[]
): MergedGeometry {
  const allVertices: number[] = [];
  const allNormals: number[] = [];
  const allUVs: number[] = [];
  const allIndices: number[] = [];
  let offset = 0;

  for (const wall of extruded) {
    for (const face of wall.faces) {
      const faceVerts = face.map((i) => wall.vertices[i]);

      const v0 = faceVerts[0];
      const v1 = faceVerts[1];
      const v2 = faceVerts[2];
      const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
      const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

      for (let i = 0; i < faceVerts.length; i++) {
        const v = faceVerts[i];
        allVertices.push(v[0], v[1], v[2]);
        allNormals.push(nx / nl, ny / nl, nz / nl);
        const u = i === 0 || i === 3 ? 0 : 1;
        const vCoord = i < 2 ? 0 : 1;
        allUVs.push(u, vCoord);
      }

      allIndices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
      offset += 4;
    }
  }

  return {
    vertices: new Float32Array(allVertices),
    normals: new Float32Array(allNormals),
    uvs: new Float32Array(allUVs),
    indices: new Uint32Array(allIndices),
  };
}

export function snapToWall(
  point: import("@/types/house").Point2D,
  walls: Wall[],
  threshold: number
): SnapResult {
  let minDist = Infinity;
  let bestPoint = point;
  let bestWallId: string | undefined;

  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) /
          lenSq
      )
    );

    const closestX = wall.start.x + t * dx;
    const closestY = wall.start.y + t * dy;
    const dist = Math.sqrt(
      (point.x - closestX) ** 2 + (point.y - closestY) ** 2
    );

    if (dist < minDist) {
      minDist = dist;
      bestPoint = { x: closestX, y: closestY };
      bestWallId = wall.id;
    }
  }

  if (minDist <= threshold) {
    return { snapped: true, point: bestPoint, target: "wall", targetId: bestWallId };
  }
  return { snapped: false, point, target: "none" };
}

export function snapToCorner(
  point: import("@/types/house").Point2D,
  walls: Wall[],
  threshold: number
): SnapResult {
  let minDist = Infinity;
  let bestPoint = point;
  let bestWallId: string | undefined;

  for (const wall of walls) {
    for (const corner of [wall.start, wall.end]) {
      const dist = Math.sqrt(
        (point.x - corner.x) ** 2 + (point.y - corner.y) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        bestPoint = corner;
        bestWallId = wall.id;
      }
    }
  }

  if (minDist <= threshold) {
    return { snapped: true, point: bestPoint, target: "corner", targetId: bestWallId };
  }
  return { snapped: false, point, target: "none" };
}

export function snapToGrid(
  point: import("@/types/house").Point2D,
  gridSize: number
): SnapResult {
  return {
    snapped: true,
    point: {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    },
    target: "grid",
  };
}
