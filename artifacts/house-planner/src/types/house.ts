export type RoomType =
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "living_room"
  | "dining_room"
  | "hallway"
  | "garage"
  | "office"
  | "laundry"
  | "storage"
  | "balcony"
  | "custom";

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions2D {
  width: number;
  height: number;
}

export interface Dimensions3D {
  width: number;
  height: number;
  depth: number;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  position: Point2D;
  dimensions: Dimensions2D;
  color?: string;
  wallIds: string[];
  furnitureIds: string[];
  metadata: Record<string, unknown>;
}

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number;
  height: number;
  materialId?: string;
  openingIds: string[];
}

export type OpeningType = "door" | "window" | "archway" | "sliding_door";

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  position: number;
  width: number;
  height: number;
  sillHeight?: number;
}

export interface Floor {
  id: string;
  level: number;
  name: string;
  roomIds: string[];
  wallIds: string[];
  ceilingHeight: number;
}

export interface HouseProject {
  id: string;
  name: string;
  description?: string;
  floors: Floor[];
  rooms: Record<string, Room>;
  walls: Record<string, Wall>;
  openings: Record<string, Opening>;
  totalArea: number;
  createdAt: string;
  updatedAt: string;
  metadata: HouseMetadata;
}

export interface HouseMetadata {
  style?: string;
  bedrooms?: number;
  bathrooms?: number;
  stories?: number;
  lotSize?: number;
  budget?: number;
  notes?: string;
}
