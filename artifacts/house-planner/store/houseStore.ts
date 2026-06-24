import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { HouseProject, Room, Wall, Opening, Floor } from "@/types/house";
import { nanoid } from "./utils";

interface HouseState {
  project: HouseProject | null;
  activeFloorId: string | null;
  selectedRoomId: string | null;
  selectedWallId: string | null;
  selectedOpeningId: string | null;
  history: HouseProject[];
  historyIndex: number;
}

interface HouseActions {
  initProject: (name: string, description?: string) => void;
  loadProject: (project: HouseProject) => void;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  setActiveFloor: (floorId: string) => void;
  addFloor: (floor: Omit<Floor, "id">) => string;
  removeFloor: (floorId: string) => void;

  addRoom: (room: Omit<Room, "id">) => string;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;
  selectRoom: (roomId: string | null) => void;

  addWall: (wall: Omit<Wall, "id">) => string;
  updateWall: (wallId: string, updates: Partial<Wall>) => void;
  removeWall: (wallId: string) => void;
  selectWall: (wallId: string | null) => void;

  addOpening: (opening: Omit<Opening, "id">) => string;
  updateOpening: (openingId: string, updates: Partial<Opening>) => void;
  removeOpening: (openingId: string) => void;
  selectOpening: (openingId: string | null) => void;
}

export const useHouseStore = create<HouseState & HouseActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        project: null,
        activeFloorId: null,
        selectedRoomId: null,
        selectedWallId: null,
        selectedOpeningId: null,
        history: [],
        historyIndex: -1,

        initProject: (name, description) => {
          const floorId = nanoid();
          const now = new Date().toISOString();
          const project: HouseProject = {
            id: nanoid(),
            name,
            description,
            floors: [
              {
                id: floorId,
                level: 0,
                name: "Ground Floor",
                roomIds: [],
                wallIds: [],
                ceilingHeight: 2.7,
              },
            ],
            rooms: {},
            walls: {},
            openings: {},
            totalArea: 0,
            createdAt: now,
            updatedAt: now,
            metadata: {},
          };
          set((state) => {
            state.project = project;
            state.activeFloorId = floorId;
            state.history = [project];
            state.historyIndex = 0;
          });
        },

        loadProject: (project) => {
          set((state) => {
            state.project = project;
            state.activeFloorId = project.floors[0]?.id ?? null;
            state.history = [project];
            state.historyIndex = 0;
          });
        },

        saveSnapshot: () => {
          const { project, history, historyIndex } = get();
          if (!project) return;
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(structuredClone(project));
          set((state) => {
            state.history = newHistory.slice(-50);
            state.historyIndex = state.history.length - 1;
          });
        },

        undo: () => {
          const { historyIndex, history } = get();
          if (historyIndex <= 0) return;
          const newIndex = historyIndex - 1;
          set((state) => {
            state.project = structuredClone(history[newIndex]);
            state.historyIndex = newIndex;
          });
        },

        redo: () => {
          const { historyIndex, history } = get();
          if (historyIndex >= history.length - 1) return;
          const newIndex = historyIndex + 1;
          set((state) => {
            state.project = structuredClone(history[newIndex]);
            state.historyIndex = newIndex;
          });
        },

        setActiveFloor: (floorId) => {
          set((state) => {
            state.activeFloorId = floorId;
          });
        },

        addFloor: (floor) => {
          const id = nanoid();
          set((state) => {
            if (!state.project) return;
            state.project.floors.push({ ...floor, id });
            state.project.updatedAt = new Date().toISOString();
          });
          return id;
        },

        removeFloor: (floorId) => {
          set((state) => {
            if (!state.project) return;
            state.project.floors = state.project.floors.filter(
              (f: Floor) => f.id !== floorId
            );
            if (state.activeFloorId === floorId) {
              state.activeFloorId = state.project.floors[0]?.id ?? null;
            }
            state.project.updatedAt = new Date().toISOString();
          });
        },

        addRoom: (room) => {
          const id = nanoid();
          set((state) => {
            if (!state.project || !state.activeFloorId) return;
            state.project.rooms[id] = { ...room, id };
            const floor = state.project.floors.find(
              (f: Floor) => f.id === state.activeFloorId
            );
            if (floor) floor.roomIds.push(id);
            state.project.updatedAt = new Date().toISOString();
          });
          return id;
        },

        updateRoom: (roomId, updates) => {
          set((state) => {
            if (!state.project) return;
            Object.assign(state.project.rooms[roomId], updates);
            state.project.updatedAt = new Date().toISOString();
          });
        },

        removeRoom: (roomId) => {
          set((state) => {
            if (!state.project) return;
            delete state.project.rooms[roomId];
            state.project.floors.forEach((f: Floor) => {
              f.roomIds = f.roomIds.filter((id: string) => id !== roomId);
            });
            state.project.updatedAt = new Date().toISOString();
          });
        },

        selectRoom: (roomId) => {
          set((state) => {
            state.selectedRoomId = roomId;
            state.selectedWallId = null;
            state.selectedOpeningId = null;
          });
        },

        addWall: (wall) => {
          const id = nanoid();
          set((state) => {
            if (!state.project || !state.activeFloorId) return;
            state.project.walls[id] = { ...wall, id };
            const floor = state.project.floors.find(
              (f: Floor) => f.id === state.activeFloorId
            );
            if (floor) floor.wallIds.push(id);
            state.project.updatedAt = new Date().toISOString();
          });
          return id;
        },

        updateWall: (wallId, updates) => {
          set((state) => {
            if (!state.project) return;
            Object.assign(state.project.walls[wallId], updates);
            state.project.updatedAt = new Date().toISOString();
          });
        },

        removeWall: (wallId) => {
          set((state) => {
            if (!state.project) return;
            delete state.project.walls[wallId];
            state.project.floors.forEach((f: Floor) => {
              f.wallIds = f.wallIds.filter((id: string) => id !== wallId);
            });
            state.project.updatedAt = new Date().toISOString();
          });
        },

        selectWall: (wallId) => {
          set((state) => {
            state.selectedWallId = wallId;
            state.selectedRoomId = null;
            state.selectedOpeningId = null;
          });
        },

        addOpening: (opening) => {
          const id = nanoid();
          set((state) => {
            if (!state.project) return;
            state.project.openings[id] = { ...opening, id };
            const wall = state.project.walls[opening.wallId];
            if (wall) wall.openingIds.push(id);
            state.project.updatedAt = new Date().toISOString();
          });
          return id;
        },

        updateOpening: (openingId, updates) => {
          set((state) => {
            if (!state.project) return;
            Object.assign(state.project.openings[openingId], updates);
            state.project.updatedAt = new Date().toISOString();
          });
        },

        removeOpening: (openingId) => {
          set((state) => {
            if (!state.project) return;
            const opening = state.project.openings[openingId];
            if (opening) {
              const wall = state.project.walls[opening.wallId];
              if (wall) {
                wall.openingIds = wall.openingIds.filter(
                  (id: string) => id !== openingId
                );
              }
            }
            delete state.project.openings[openingId];
            state.project.updatedAt = new Date().toISOString();
          });
        },

        selectOpening: (openingId) => {
          set((state) => {
            state.selectedOpeningId = openingId;
            state.selectedRoomId = null;
            state.selectedWallId = null;
          });
        },
      })),
      { name: "house-planner-project", partialize: (s) => ({ project: s.project }) }
    ),
    { name: "HouseStore" }
  )
);
