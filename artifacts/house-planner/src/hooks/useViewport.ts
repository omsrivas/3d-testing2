"use client";

import { useCallback, useRef } from "react";
import { useUIStore } from "@/store/uiStore";
import type { ViewMode } from "@/store/uiStore";
import type { Point2D } from "@/types/house";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.1;

export function useViewport(dimension: ViewMode) {
  const viewport =
    dimension === "2d"
      ? useUIStore((s) => s.viewport2D)
      : useUIStore((s) => s.viewport3D);
  const updateViewport =
    dimension === "2d"
      ? useUIStore((s) => s.updateViewport2D)
      : useUIStore((s) => s.updateViewport3D);
  const resetViewport = useUIStore((s) => s.resetViewport);

  const lastPanPoint = useRef<Point2D | null>(null);

  const zoomIn = useCallback(() => {
    updateViewport({ zoom: Math.min(viewport.zoom + ZOOM_STEP, MAX_ZOOM) });
  }, [viewport.zoom, updateViewport]);

  const zoomOut = useCallback(() => {
    updateViewport({ zoom: Math.max(viewport.zoom - ZOOM_STEP, MIN_ZOOM) });
  }, [viewport.zoom, updateViewport]);

  const zoomTo = useCallback(
    (zoom: number) => {
      updateViewport({ zoom: Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM) });
    },
    [updateViewport]
  );

  const pan = useCallback(
    (deltaX: number, deltaY: number) => {
      updateViewport({
        panX: viewport.panX + deltaX,
        panY: viewport.panY + deltaY,
      });
    },
    [viewport.panX, viewport.panY, updateViewport]
  );

  const screenToWorld = useCallback(
    (screenPoint: Point2D): Point2D => ({
      x: (screenPoint.x - viewport.panX) / viewport.zoom,
      y: (screenPoint.y - viewport.panY) / viewport.zoom,
    }),
    [viewport]
  );

  const worldToScreen = useCallback(
    (worldPoint: Point2D): Point2D => ({
      x: worldPoint.x * viewport.zoom + viewport.panX,
      y: worldPoint.y * viewport.zoom + viewport.panY,
    }),
    [viewport]
  );

  const reset = useCallback(() => {
    resetViewport(dimension);
  }, [resetViewport, dimension]);

  return {
    viewport,
    zoomIn,
    zoomOut,
    zoomTo,
    pan,
    screenToWorld,
    worldToScreen,
    reset,
    lastPanPoint,
  };
}
