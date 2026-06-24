/**
 * Layout Engine — public API
 *
 * Usage:
 *   import { generateLayout } from "@/lib/layoutEngine";
 *
 *   const result = generateLayout({
 *     plotWidth: 12,
 *     plotDepth: 18,
 *     facingDirection: "N",
 *     floors: 2,
 *     bedrooms: 3,
 *     bathrooms: 3,
 *     hasBalcony: true,
 *     hasParking: true,
 *     hasStaircase: true,
 *     vastuCompliant: true,
 *   });
 *
 *   if (result.success) {
 *     const { rooms, walls, doors, windows, stairs, metadata } = result.output;
 *   }
 */

export { generateLayout } from "./layoutEngine";
export { buildRoomSpecs } from "./roomSizer";
export { planAllFloors, planFloor } from "./floorPlanner";
export { generateWalls } from "./wallGenerator";
export { generateOpenings } from "./openingGenerator";
export { generateStairs } from "./stairGenerator";
export { validateLayout, buildRoomSummary } from "./validation";
export { getVastuZones, getZoneRect, classifyZone, scoreVastu } from "./vastu";

// Types (re-exported for consumers)
export type {
  LayoutInput,
  LayoutOutput,
  LayoutMetadata,
  Room,
  Wall,
  Door,
  Window,
  Stair,
  RoomSpec,
  FloorPlan,
  FacingDirection,
  RoomType,
  VastuZone,
  WallType,
  DoorType,
  WindowType,
  StairType,
} from "./types";
