"use client";

import { useCallback } from "react";
import {
  buildWallGraph,
  extrudeWalls,
  mergeCoplanarFaces,
  detectRooms,
} from "@/lib/geometryEngine";
import type { WallGraph } from "@/types/geometry";

/**
 * useGeometryEngine
 *
 * Converts structured layout JSON (walls from the layout engine)
 * into geometric representations used by the 2D and 3D renderers.
 *
 * Input walls use the layoutEngine Wall type (x1/y1/x2/y2 format).
 * The geometry engine works with its own Wall type (start/end Point2D).
 * This hook handles the bridge.
 */

interface LayoutWall {
  id: string;
  floor: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  type: "external" | "internal" | "parapet";
  length: number;
  roomIds: string[];
}

function toGeomWalls(layoutWalls: LayoutWall[]) {
  return layoutWalls.map((w) => ({
    id: w.id,
    start: { x: w.x1, y: w.y1 },
    end: { x: w.x2, y: w.y2 },
    thickness: w.thickness,
    height: 3.0,
    openingIds: [],
  }));
}

export function useGeometryEngine() {
  const getWallGraph = useCallback(
    (layoutWalls: LayoutWall[], floor: number): WallGraph => {
      const floorWalls = toGeomWalls(
        layoutWalls.filter((w) => w.floor === floor)
      );
      return buildWallGraph(floorWalls);
    },
    []
  );

  const getRoomPolygons = useCallback(
    (layoutWalls: LayoutWall[], floor: number) => {
      const graph = buildWallGraph(
        toGeomWalls(layoutWalls.filter((w) => w.floor === floor))
      );
      return detectRooms(graph);
    },
    []
  );

  const get3DGeometry = useCallback(
    (layoutWalls: LayoutWall[], floor: number, ceilingHeight = 3.0) => {
      const geomWalls = toGeomWalls(
        layoutWalls.filter((w) => w.floor === floor)
      );
      const extruded = extrudeWalls(geomWalls, ceilingHeight);
      return mergeCoplanarFaces(extruded);
    },
    []
  );

  return { getWallGraph, getRoomPolygons, get3DGeometry };
}
