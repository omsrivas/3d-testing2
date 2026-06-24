"use client";

import { useCallback } from "react";
import { useHouseStore } from "@/store/houseStore";
import {
  generateLayout,
  validateLayout,
  calculateRoomArea,
  calculateTotalArea,
} from "@/lib/layoutEngine";
import type { LayoutConstraints } from "@/types/ai";

export function useLayoutEngine() {
  const project = useHouseStore((s) => s.project);
  const loadProject = useHouseStore((s) => s.loadProject);
  const saveSnapshot = useHouseStore((s) => s.saveSnapshot);

  const generate = useCallback(
    async (constraints: LayoutConstraints, prompt?: string) => {
      const result = await generateLayout(constraints, prompt);
      if (result.success && result.project) {
        saveSnapshot();
        loadProject(result.project as Parameters<typeof loadProject>[0]);
      }
      return result;
    },
    [loadProject, saveSnapshot]
  );

  const validate = useCallback(() => {
    if (!project) return { valid: false, issues: ["No project loaded"] };
    return validateLayout(project);
  }, [project]);

  const getRoomArea = useCallback(
    (roomId: string) => {
      if (!project) return 0;
      const room = project.rooms[roomId];
      if (!room) return 0;
      return calculateRoomArea(room);
    },
    [project]
  );

  const getTotalArea = useCallback(() => {
    if (!project) return 0;
    return calculateTotalArea(project);
  }, [project]);

  return { generate, validate, getRoomArea, getTotalArea };
}
