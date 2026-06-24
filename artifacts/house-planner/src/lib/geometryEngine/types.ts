import type { Point2D } from "@/types/house";

export interface ExtrudedWall {
  wallId: string;
  vertices: [number, number, number][];
  faces: number[][];
  normal: [number, number, number];
}

export interface MergedGeometry {
  vertices: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

export interface RoomPolygon {
  roomId?: string;
  points: Point2D[];
  area: number;
  centroid: Point2D;
}

export interface SnapConfig {
  gridSize: number;
  threshold: number;
}
