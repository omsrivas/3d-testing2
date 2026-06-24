import type { Point2D, Dimensions2D } from "./house";

export type FurnitureCategory =
  | "seating"
  | "tables"
  | "storage"
  | "beds"
  | "appliances"
  | "fixtures"
  | "lighting"
  | "decor"
  | "outdoor"
  | "office";

export type FurnitureOrigin = "catalog" | "custom" | "ai_generated";

export interface FurnitureDefinition {
  id: string;
  name: string;
  category: FurnitureCategory;
  origin: FurnitureOrigin;
  dimensions2D: Dimensions2D;
  footprint: Point2D[];
  modelPath?: string;
  thumbnailUrl?: string;
  tags: string[];
  defaultMaterialId?: string;
  variants?: FurnitureVariant[];
}

export interface FurnitureVariant {
  id: string;
  name: string;
  color?: string;
  materialId?: string;
  thumbnailUrl?: string;
}

export interface PlacedFurniture {
  id: string;
  definitionId: string;
  roomId: string;
  position: Point2D;
  rotation: number;
  variantId?: string;
  locked: boolean;
  label?: string;
  metadata: Record<string, unknown>;
}

export interface FurnitureSuggestion {
  definitionId: string;
  confidence: number;
  reason: string;
  suggestedPosition?: Point2D;
  suggestedRotation?: number;
}
