import type { FurnitureDefinition, FurnitureCategory } from "@/types/furniture";

export interface FurnitureCatalogEntry extends FurnitureDefinition {
  popularity: number;
  roomCompatibility: string[];
}

export interface PlacementConstraints {
  minDistanceFromWall: number;
  requiresWallPlacement: boolean;
  requiresClearSpace: { front?: number; sides?: number };
  canStack: boolean;
}

export interface FurniturePlacementResult {
  success: boolean;
  position?: import("@/types/house").Point2D;
  rotation?: number;
  reason?: string;
}

export type CatalogFilter = {
  category?: FurnitureCategory;
  tags?: string[];
  maxWidth?: number;
  maxHeight?: number;
};
