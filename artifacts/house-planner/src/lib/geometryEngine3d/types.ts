import type { Room } from "@/lib/layoutEngine";

// ─── Mesh roles ───────────────────────────────────────────────────────────────
export type MeshRole =
  | "exterior-wall"
  | "interior-wall"
  | "floor-slab"
  | "roof-slab"
  | "column"
  | "parapet"
  | "balcony-slab"
  | "balcony-railing"
  | "stair-tread"
  | "door-frame"
  | "window-frame"
  | "window-glass";

// ─── Box mesh specification ────────────────────────────────────────────────────
// Every geometry element is described as an axis-aligned box that may be
// rotated around the world Y-axis (vertical axis). The viewer constructs a
// BoxGeometry and applies position/rotation.
//
// Coordinate convention matching the layout engine:
//   World X  = layout X (East)
//   World Y  = height (Up)
//   World Z  = layout Y (South)

export interface BoxSpec {
  id: string;
  role: MeshRole;
  /** Width  – along the LOCAL x axis (wall direction for walls) */
  w: number;
  /** Height – along the world Y axis */
  h: number;
  /** Depth  – perpendicular to wall face / slab thickness */
  d: number;
  /** World-space centre X */
  cx: number;
  /** World-space centre Y */
  cy: number;
  /** World-space centre Z (= layout Y) */
  cz: number;
  /** Rotation around world Y axis (radians) */
  ry: number;
  /** Which storey this geometry belongs to (0 = ground) */
  floor: number;
}

// ─── Scene data returned by the engine ────────────────────────────────────────
export interface SceneData {
  meshes: BoxSpec[];
  rooms: Room[];
  floors: number;
  plotWidth: number;
  plotDepth: number;
  /** Suggested camera look-at target */
  center: [number, number, number];
  /** Approximate bounding-box diagonal – useful for initial camera distance */
  diagonal: number;
}
