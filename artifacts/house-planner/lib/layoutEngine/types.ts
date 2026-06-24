// ─── Enums ────────────────────────────────────────────────────────────────────

export type FacingDirection = "N" | "S" | "E" | "W";

export type RoomType =
  | "living"
  | "dining"
  | "kitchen"
  | "master_bedroom"
  | "bedroom"
  | "bathroom"
  | "toilet"
  | "balcony"
  | "parking"
  | "staircase"
  | "foyer"
  | "pooja"
  | "utility"
  | "passage"
  | "terrace";

export type VastuZone =
  | "NE"
  | "N"
  | "NW"
  | "W"
  | "SW"
  | "S"
  | "SE"
  | "E"
  | "center";

export type WallType = "external" | "internal" | "parapet";
export type DoorType = "main" | "internal" | "bathroom" | "balcony" | "service";
export type WindowType = "casement" | "sliding" | "ventilator";
export type StairType = "straight" | "L-shape" | "dog-leg";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface LayoutInput {
  /** Plot width in metres (E-W dimension) */
  plotWidth: number;
  /** Plot depth in metres (N-S dimension) */
  plotDepth: number;
  /** Which side faces the road */
  facingDirection: FacingDirection;
  /** Number of occupied floors (1 = G, 2 = G+1, …) */
  floors: number;
  /** Total bedrooms across all floors */
  bedrooms: number;
  /** Total bathrooms (attached + common) across all floors */
  bathrooms: number;
  /** Include a balcony */
  hasBalcony: boolean;
  /** Include covered parking */
  hasParking: boolean;
  /** Include a staircase (auto-enabled when floors > 1) */
  hasStaircase: boolean;
  /** Apply Vastu Shastra room placement rules */
  vastuCompliant: boolean;
}

// ─── Output entities ─────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  floor: number;
  /** X position of room's NW corner (metres from plot origin) */
  x: number;
  /** Y position of room's NW corner (metres from plot origin) */
  y: number;
  /** Width along X axis (metres) */
  width: number;
  /** Depth along Y axis (metres) */
  depth: number;
  /** Computed area in square metres */
  area: number;
  vastuZone: VastuZone;
}

export interface Wall {
  id: string;
  floor: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Thickness in metres (0.23 external, 0.115 internal) */
  thickness: number;
  type: WallType;
  /** Pre-computed length in metres */
  length: number;
  /** Rooms this wall belongs to */
  roomIds: string[];
}

export interface Door {
  id: string;
  floor: number;
  wallId: string;
  /** Centre X of door opening (metres from plot origin) */
  x: number;
  /** Centre Y of door opening (metres from plot origin) */
  y: number;
  /** Opening width in metres */
  width: number;
  /** Opening height in metres */
  height: number;
  type: DoorType;
  /** Which face of the wall the door swings toward */
  swingDirection: "inward" | "outward";
  /** Compass direction the door faces */
  facingWall: FacingDirection;
}

export interface Window {
  id: string;
  floor: number;
  wallId: string;
  /** Centre X of window opening (metres from plot origin) */
  x: number;
  /** Centre Y of window opening (metres from plot origin) */
  y: number;
  /** Opening width in metres */
  width: number;
  /** Opening height in metres */
  height: number;
  /** Height of sill from floor level in metres */
  sillHeight: number;
  type: WindowType;
  /** Compass direction the window faces */
  facingWall: FacingDirection;
}

export interface Stair {
  id: string;
  /** Floor the stair begins on */
  fromFloor: number;
  /** Floor the stair leads to */
  toFloor: number;
  x: number;
  y: number;
  width: number;
  depth: number;
  type: StairType;
  /** Number of risers */
  steps: number;
  /** Height of each riser in metres */
  riserHeight: number;
  /** Depth of each tread in metres */
  treadDepth: number;
  /** Primary direction of ascent */
  direction: FacingDirection;
  /** Landing width (for L-shape / dog-leg) */
  landingWidth?: number;
}

// ─── Full output ──────────────────────────────────────────────────────────────

export interface LayoutOutput {
  rooms: Room[];
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  stairs: Stair[];
  metadata: LayoutMetadata;
}

export interface LayoutMetadata {
  /** Total built-up area across all floors */
  totalBuiltUpArea: number;
  /** Ratio of built-up area to total plot area */
  plotCoverageRatio: number;
  /** 0-100 Vastu compliance score */
  vastuScore: number;
  /** Any planning warnings */
  warnings: string[];
  /** Room count summary */
  roomSummary: Record<RoomType, number>;
}

// ─── Internal planner types ───────────────────────────────────────────────────

export interface RoomSpec {
  type: RoomType;
  name: string;
  /** Preferred width range [min, ideal] */
  widthRange: [number, number];
  /** Preferred depth range [min, ideal] */
  depthRange: [number, number];
  /** Vastu preferred zones in priority order */
  preferredZones: VastuZone[];
  /** Which floor this room belongs to (0 = ground, 1 = first, …, -1 = any) */
  targetFloor: number;
  priority: number;
}

export interface OccupancyGrid {
  cells: boolean[][];
  cellSize: number;
  cols: number;
  rows: number;
}

export interface PlacedRoom extends Room {
  spec: RoomSpec;
}

export interface FloorPlan {
  floor: number;
  rooms: PlacedRoom[];
  stairReservation?: { x: number; y: number; width: number; depth: number };
}
