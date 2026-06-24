"use client";

import { useCallback } from "react";
import { useHouseStore } from "@/store/houseStore";
import {
  buildWallGraph,
  detectRooms,
  extrudeWalls,
  mergeCoplanarFaces,
} from "@/lib/geometryEngine";
import type { WallGraph } from "@/types/geometry";

export function useGeometryEngine() {
  const project = useHouseStore((s) => s.project);
  const activeFloorId = useHouseStore((s) => s.activeFloorId);

  const getActiveWalls = useCallback(() => {
    if (!project || !activeFloorId) return [];
    const floor = project.floors.find((f) => f.id === activeFloorId);
    if (!floor) return [];
    return floor.wallIds.map((id) => project.walls[id]).filter(Boolean);
  }, [project, activeFloorId]);

  const getWallGraph = useCallback((): WallGraph => {
    return buildWallGraph(getActiveWalls());
  }, [getActiveWalls]);

  const getRoomPolygons = useCallback(() => {
    return detectRooms(getWallGraph());
  }, [getWallGraph]);

  const get3DGeometry = useCallback(
    (ceilingHeight = 2.7) => {
      const walls = getActiveWalls();
      const extruded = extrudeWalls(walls, ceilingHeight);
      return mergeCoplanarFaces(extruded);
    },
    [getActiveWalls]
  );

  return {
    getActiveWalls,
    getWallGraph,
    getRoomPolygons,
    get3DGeometry,
  };
}
