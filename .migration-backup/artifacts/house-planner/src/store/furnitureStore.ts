import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { PlacedFurniture, FurnitureDefinition } from "@/types/furniture";
import type { Point2D } from "@/types/house";
import { nanoid } from "./utils";

interface FurnitureState {
  definitions: Record<string, FurnitureDefinition>;
  placed: Record<string, PlacedFurniture>;
  selectedId: string | null;
  hoveredId: string | null;
  pendingPlacementId: string | null;
}

interface FurnitureActions {
  loadDefinitions: (defs: FurnitureDefinition[]) => void;
  addDefinition: (def: FurnitureDefinition) => void;

  placeFurniture: (
    definitionId: string,
    roomId: string,
    position: Point2D,
    rotation?: number
  ) => string;
  moveFurniture: (id: string, position: Point2D) => void;
  rotateFurniture: (id: string, rotation: number) => void;
  updatePlaced: (id: string, updates: Partial<PlacedFurniture>) => void;
  removeFurniture: (id: string) => void;
  duplicateFurniture: (id: string) => string;

  selectFurniture: (id: string | null) => void;
  hoverFurniture: (id: string | null) => void;
  setPendingPlacement: (definitionId: string | null) => void;

  getFurnitureInRoom: (roomId: string) => PlacedFurniture[];
}

export const useFurnitureStore = create<FurnitureState & FurnitureActions>()(
  devtools(
    immer((set, get) => ({
      definitions: {},
      placed: {},
      selectedId: null,
      hoveredId: null,
      pendingPlacementId: null,

      loadDefinitions: (defs) =>
        set((state) => {
          defs.forEach((d) => {
            state.definitions[d.id] = d;
          });
        }),

      addDefinition: (def) =>
        set((state) => {
          state.definitions[def.id] = def;
        }),

      placeFurniture: (definitionId, roomId, position, rotation = 0) => {
        const id = nanoid();
        set((state) => {
          state.placed[id] = {
            id,
            definitionId,
            roomId,
            position,
            rotation,
            locked: false,
            metadata: {},
          };
        });
        return id;
      },

      moveFurniture: (id, position) =>
        set((state) => {
          if (state.placed[id]) state.placed[id].position = position;
        }),

      rotateFurniture: (id, rotation) =>
        set((state) => {
          if (state.placed[id]) state.placed[id].rotation = rotation;
        }),

      updatePlaced: (id, updates) =>
        set((state) => {
          if (state.placed[id]) Object.assign(state.placed[id], updates);
        }),

      removeFurniture: (id) =>
        set((state) => {
          delete state.placed[id];
          if (state.selectedId === id) state.selectedId = null;
        }),

      duplicateFurniture: (id) => {
        const source = get().placed[id];
        if (!source) return "";
        const newId = nanoid();
        set((state) => {
          state.placed[newId] = {
            ...structuredClone(source),
            id: newId,
            position: {
              x: source.position.x + 20,
              y: source.position.y + 20,
            },
          };
        });
        return newId;
      },

      selectFurniture: (id) =>
        set((state) => {
          state.selectedId = id;
        }),

      hoverFurniture: (id) =>
        set((state) => {
          state.hoveredId = id;
        }),

      setPendingPlacement: (definitionId) =>
        set((state) => {
          state.pendingPlacementId = definitionId;
        }),

      getFurnitureInRoom: (roomId) => {
        return Object.values(get().placed).filter((p) => p.roomId === roomId);
      },
    })),
    { name: "FurnitureStore" }
  )
);
