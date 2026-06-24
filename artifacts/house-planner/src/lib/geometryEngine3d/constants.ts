// ─── Architectural constants (SI units – metres) ─────────────────────────────

export const EXT_WALL_T  = 0.2286;  // 9 inches  – exterior / party wall
export const INT_WALL_T  = 0.1143;  // 4.5 inches – internal partition
export const WALL_H      = 3.048;   // 10 feet    – floor-to-ceiling clear height
export const SLAB_T      = 0.1524;  // 6 inches   – structural slab thickness
export const FLOOR_TO_FLOOR = WALL_H + SLAB_T;   // 3.2004 m per storey

// Openings
export const DOOR_H_MAIN = 2.1;     // main entrance door height
export const DOOR_H_INT  = 2.1;     // internal door height
export const WIN_SILL    = 0.9;     // standard window sill height
export const WIN_H       = 1.2;     // standard window height
export const VENT_SILL   = 1.95;    // ventilator sill
export const VENT_H      = 0.45;    // ventilator height

// Frames
export const FRAME_W     = 0.075;   // door/window frame face width
export const FRAME_D     = 0.065;   // door/window frame depth
export const GLASS_T     = 0.008;   // glass pane thickness

// Columns  (230 mm sq – matches ext wall thickness)
export const COL_W       = 0.23;
export const COL_D       = 0.23;

// Parapet  (sits on roof slab)
export const PARAPET_H   = 0.9;
export const PARAPET_T   = 0.115;   // 4.5-inch parapet

// Balcony
export const BALCONY_PROJ = 1.2;    // projection beyond wall face
export const RAILING_H   = 1.05;    // balcony railing height
export const RAILING_T   = 0.075;

// Stairs
export const RISER_H     = 0.175;   // 7-inch riser
export const TREAD_D     = 0.270;   // 10.5-inch tread (nosing to nosing)
export const TREAD_T     = 0.04;    // tread slab thickness
