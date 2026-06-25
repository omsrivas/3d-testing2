import type { Room, Point2D } from "@/types/house";
import type { FurnitureDefinition, PlacedFurniture } from "@/types/furniture";
import type { FurniturePlacementResult } from "./types";

export function findOptimalPosition(
  furniture: FurnitureDefinition,
  room: Room,
  existingPlacements: PlacedFurniture[],
  preferWall = false
): FurniturePlacementResult {
  const padding = 0.2;
  const fw = furniture.dimensions2D.width;
  const fh = furniture.dimensions2D.height;

  const maxX = room.position.x + room.dimensions.width - fw - padding;
  const maxY = room.position.y + room.dimensions.height - fh - padding;
  const minX = room.position.x + padding;
  const minY = room.position.y + padding;

  if (minX > maxX || minY > maxY) {
    return { success: false, reason: "Room too small for this furniture." };
  }

  if (preferWall) {
    const candidates: Point2D[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
    ];

    for (const candidate of candidates) {
      if (!collides(candidate, fw, fh, existingPlacements)) {
        return { success: true, position: candidate, rotation: 0 };
      }
    }
  }

  const stepX = 0.5;
  const stepY = 0.5;

  for (let y = minY; y <= maxY; y += stepY) {
    for (let x = minX; x <= maxX; x += stepX) {
      const pos: Point2D = { x, y };
      if (!collides(pos, fw, fh, existingPlacements)) {
        return { success: true, position: pos, rotation: 0 };
      }
    }
  }

  return {
    success: false,
    reason: "No free space found for this furniture in the room.",
  };
}

function collides(
  pos: Point2D,
  w: number,
  h: number,
  placements: PlacedFurniture[]
): boolean {
  const margin = 0.1;
  for (const p of placements) {
    const pw = 1;
    const ph = 1;
    const overlap =
      pos.x < p.position.x + pw + margin &&
      pos.x + w + margin > p.position.x &&
      pos.y < p.position.y + ph + margin &&
      pos.y + h + margin > p.position.y;
    if (overlap) return true;
  }
  return false;
}

export function rotateFurniturePoints(
  points: Point2D[],
  rotation: number
): Point2D[] {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map(({ x, y }) => ({
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }));
}
