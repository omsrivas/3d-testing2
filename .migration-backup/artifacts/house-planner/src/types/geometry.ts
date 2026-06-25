import type { Point2D } from "./house";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Polygon {
  points: Point2D[];
}

export interface LineSegment {
  start: Point2D;
  end: Point2D;
}

export interface GridCell {
  col: number;
  row: number;
  occupied: boolean;
  roomId?: string;
}

export interface Grid {
  cols: number;
  rows: number;
  cellSize: number;
  cells: GridCell[][];
}

export type SnapTarget = "grid" | "wall" | "corner" | "midpoint" | "none";

export interface SnapResult {
  snapped: boolean;
  point: Point2D;
  target: SnapTarget;
  targetId?: string;
}

export interface IntersectionResult {
  intersects: boolean;
  point?: Point2D;
}

export interface WallGraph {
  nodes: WallNode[];
  edges: WallEdge[];
}

export interface WallNode {
  id: string;
  point: Point2D;
  connectedEdgeIds: string[];
}

export interface WallEdge {
  id: string;
  wallId: string;
  startNodeId: string;
  endNodeId: string;
}

export type TransformMode = "translate" | "rotate" | "scale";

export interface Transform2D {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface Transform3D {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}
