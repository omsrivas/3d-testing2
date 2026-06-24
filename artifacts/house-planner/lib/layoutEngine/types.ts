import type { HouseProject } from "@/types/house";
import type { LayoutConstraints, LayoutGenerationResponse } from "@/types/ai";

export interface LayoutValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export interface RoomAreaResult {
  roomId: string;
  area: number;
  unit: "sqm" | "sqft";
}

export interface LayoutEngineOptions {
  gridSize?: number;
  wallThickness?: number;
  minRoomSize?: number;
  maxRoomSize?: number;
}

export type GenerateLayoutFn = (
  constraints: LayoutConstraints,
  prompt?: string
) => Promise<LayoutGenerationResponse>;

export type ValidateLayoutFn = (
  project: HouseProject
) => LayoutValidationResult;
