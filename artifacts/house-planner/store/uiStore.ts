import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { SnapTarget, TransformMode } from "@/types/geometry";

export type ViewMode = "2d" | "3d";
export type EditorTool =
  | "select"
  | "draw_wall"
  | "draw_room"
  | "place_furniture"
  | "add_door"
  | "add_window"
  | "measure"
  | "pan";

export type SidebarPanel =
  | "rooms"
  | "walls"
  | "furniture"
  | "ai_assistant"
  | "materials"
  | "settings"
  | null;

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  rotationX: number;
  rotationY: number;
}

interface UIState {
  viewMode: ViewMode;
  activeTool: EditorTool;
  sidebarPanel: SidebarPanel;
  sidebarOpen: boolean;
  propertiesOpen: boolean;
  snapEnabled: boolean;
  snapTargets: SnapTarget[];
  gridVisible: boolean;
  gridSize: number;
  transformMode: TransformMode;
  viewport2D: ViewportState;
  viewport3D: ViewportState;
  isDragging: boolean;
  isDrawing: boolean;
  showDimensions: boolean;
  showAreaLabels: boolean;
  theme: "light" | "dark";
}

interface UIActions {
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: EditorTool) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  toggleSidebar: () => void;
  toggleProperties: () => void;
  toggleSnap: () => void;
  setSnapTargets: (targets: SnapTarget[]) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  setTransformMode: (mode: TransformMode) => void;
  updateViewport2D: (updates: Partial<ViewportState>) => void;
  updateViewport3D: (updates: Partial<ViewportState>) => void;
  setDragging: (dragging: boolean) => void;
  setDrawing: (drawing: boolean) => void;
  toggleDimensions: () => void;
  toggleAreaLabels: () => void;
  setTheme: (theme: "light" | "dark") => void;
  resetViewport: (dimension: "2d" | "3d") => void;
}

const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotationX: 0,
  rotationY: 0,
};

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    immer((set) => ({
      viewMode: "2d",
      activeTool: "select",
      sidebarPanel: "rooms",
      sidebarOpen: true,
      propertiesOpen: false,
      snapEnabled: true,
      snapTargets: ["grid", "wall", "corner"],
      gridVisible: true,
      gridSize: 10,
      transformMode: "translate",
      viewport2D: { ...DEFAULT_VIEWPORT },
      viewport3D: { ...DEFAULT_VIEWPORT, rotationX: -45, rotationY: 30 },
      isDragging: false,
      isDrawing: false,
      showDimensions: true,
      showAreaLabels: true,
      theme: "light",

      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode;
        }),

      setActiveTool: (tool) =>
        set((state) => {
          state.activeTool = tool;
          state.isDrawing = false;
        }),

      setSidebarPanel: (panel) =>
        set((state) => {
          state.sidebarPanel = panel;
          if (panel !== null) state.sidebarOpen = true;
        }),

      toggleSidebar: () =>
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        }),

      toggleProperties: () =>
        set((state) => {
          state.propertiesOpen = !state.propertiesOpen;
        }),

      toggleSnap: () =>
        set((state) => {
          state.snapEnabled = !state.snapEnabled;
        }),

      setSnapTargets: (targets) =>
        set((state) => {
          state.snapTargets = targets;
        }),

      toggleGrid: () =>
        set((state) => {
          state.gridVisible = !state.gridVisible;
        }),

      setGridSize: (size) =>
        set((state) => {
          state.gridSize = size;
        }),

      setTransformMode: (mode) =>
        set((state) => {
          state.transformMode = mode;
        }),

      updateViewport2D: (updates) =>
        set((state) => {
          Object.assign(state.viewport2D, updates);
        }),

      updateViewport3D: (updates) =>
        set((state) => {
          Object.assign(state.viewport3D, updates);
        }),

      setDragging: (dragging) =>
        set((state) => {
          state.isDragging = dragging;
        }),

      setDrawing: (drawing) =>
        set((state) => {
          state.isDrawing = drawing;
        }),

      toggleDimensions: () =>
        set((state) => {
          state.showDimensions = !state.showDimensions;
        }),

      toggleAreaLabels: () =>
        set((state) => {
          state.showAreaLabels = !state.showAreaLabels;
        }),

      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),

      resetViewport: (dimension) =>
        set((state) => {
          if (dimension === "2d") {
            state.viewport2D = { ...DEFAULT_VIEWPORT };
          } else {
            state.viewport3D = {
              ...DEFAULT_VIEWPORT,
              rotationX: -45,
              rotationY: 30,
            };
          }
        }),
    })),
    { name: "UIStore" }
  )
);
