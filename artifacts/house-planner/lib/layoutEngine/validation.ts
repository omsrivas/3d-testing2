import type { HouseProject, Room } from "@/types/house";
import type { LayoutValidationResult } from "./types";
import { doBoxesOverlap, getBoundingBox } from "./grid";

const MIN_ROOM_AREA = 4;
const MIN_CORRIDOR_WIDTH = 0.9;

export function validateLayout(project: HouseProject): LayoutValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  const rooms = Object.values(project.rooms);

  if (rooms.length === 0) {
    issues.push("Project has no rooms defined.");
  }

  for (const room of rooms) {
    const area = room.dimensions.width * room.dimensions.height;
    if (area < MIN_ROOM_AREA) {
      warnings.push(
        `Room "${room.name}" is very small (${area.toFixed(1)} m²). Minimum recommended is ${MIN_ROOM_AREA} m².`
      );
    }

    if (room.dimensions.width < MIN_CORRIDOR_WIDTH || room.dimensions.height < MIN_CORRIDOR_WIDTH) {
      issues.push(
        `Room "${room.name}" is narrower than the minimum corridor width (${MIN_CORRIDOR_WIDTH} m).`
      );
    }
  }

  const roomList = rooms;
  for (let i = 0; i < roomList.length; i++) {
    for (let j = i + 1; j < roomList.length; j++) {
      if (doBoxesOverlap(getBoundingBox(roomList[i]), getBoundingBox(roomList[j]))) {
        warnings.push(
          `Rooms "${roomList[i].name}" and "${roomList[j].name}" overlap.`
        );
      }
    }
  }

  const walls = Object.values(project.walls);
  if (walls.length === 0 && rooms.length > 0) {
    warnings.push("No walls have been drawn yet.");
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

export function calculateRoomArea(room: Room): number {
  return room.dimensions.width * room.dimensions.height;
}

export function calculateTotalArea(project: HouseProject): number {
  return Object.values(project.rooms).reduce(
    (sum, room) => sum + calculateRoomArea(room),
    0
  );
}
