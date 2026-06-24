"use client";

import { useCallback } from "react";
import { useUIStore } from "@/store/uiStore";
import { useHouseStore } from "@/store/houseStore";
import type { Point2D } from "@/types/house";
import type { SnapResult } from "@/types/geometry";
import { snapToGrid, snapToWall, snapToCorner } from "@/lib/geometryEngine";

export function useSnap() {
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const snapTargets = useUIStore((s) => s.snapTargets);
  const gridSize = useUIStore((s) => s.gridSize);
  const project = useHouseStore((s) => s.project);

  const snap = useCallback(
    (point: Point2D): SnapResult => {
      if (!snapEnabled) {
        return { snapped: false, point, target: "none" };
      }

      const walls = project ? Object.values(project.walls) : [];

      if (snapTargets.includes("corner")) {
        const cornerResult = snapToCorner(point, walls, gridSize * 0.5);
        if (cornerResult.snapped) return cornerResult;
      }

      if (snapTargets.includes("wall")) {
        const wallResult = snapToWall(point, walls, gridSize * 0.5);
        if (wallResult.snapped) return wallResult;
      }

      if (snapTargets.includes("grid")) {
        return snapToGrid(point, gridSize);
      }

      return { snapped: false, point, target: "none" };
    },
    [snapEnabled, snapTargets, gridSize, project]
  );

  return { snap };
}
