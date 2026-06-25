// ─── Architectural constants (SI units – metres) ─────────────────────────────

// ── Walls ────────────────────────────────────────────────────────────────────
export const EXT_WALL_T     = 0.2286;  // 9 in  – exterior / party wall
export const INT_WALL_T     = 0.1143;  // 4.5 in – internal partition

// ── Heights ──────────────────────────────────────────────────────────────────
export const WALL_H         = 3.048;   // 10 ft  – floor-to-ceiling clear height
export const PLINTH_H       = 0.450;   // 18 in  – plinth above finished ground

// ── RCC Slabs ────────────────────────────────────────────────────────────────
export const SLAB_T         = 0.125;   // 5 in   – structural slab (125 mm RCC)
export const SLAB_PROJ      = 0.075;   // 3 in   – slab overhang beyond ext wall
export const BALCONY_SLAB_T = 0.100;   // 4 in   – thinner cantilever slab
export const FLOOR_TO_FLOOR = WALL_H + SLAB_T;   // 3.173 m per storey

// ── RCC Beams (under slab, along wall lines) ──────────────────────────────────
export const BEAM_D         = 0.300;   // 12 in  – beam depth below slab soffit
export const BEAM_W         = EXT_WALL_T; // beam width = wall thickness

// ── RCC Lintels (above openings) ─────────────────────────────────────────────
export const LINTEL_H       = 0.225;   // 9 in   – lintel depth
export const LINTEL_EXT     = 0.150;   // 6 in   – extension beyond opening each side

// ── Openings ─────────────────────────────────────────────────────────────────
export const DOOR_H_MAIN    = 2.1;     // main entrance door height
export const DOOR_H_INT     = 2.1;     // internal door height
export const WIN_SILL       = 0.9;     // standard window sill height
export const WIN_H          = 1.2;     // standard window height
export const VENT_SILL      = 1.95;    // ventilator sill
export const VENT_H         = 0.45;    // ventilator height

// ── Frames ───────────────────────────────────────────────────────────────────
export const FRAME_W        = 0.075;   // door/window frame face width
export const FRAME_D        = 0.065;   // door/window frame depth
export const GLASS_T        = 0.008;   // glass pane thickness

// ── Columns (square tied column, 230 mm – matches ext wall) ──────────────────
export const COL_W          = 0.230;
export const COL_D          = 0.230;

// ── Parapet (sits on roof slab) ───────────────────────────────────────────────
export const PARAPET_H      = 0.900;   // 36 in  – parapet height
export const PARAPET_T      = 0.150;   // 6 in   – parapet wall thickness
export const PARAPET_CAP_T  = 0.025;   // 1 in   – concrete coping cap thickness
export const PARAPET_CAP_PROJ = 0.030; // 30 mm  – coping projection beyond face

// ── Balcony / Terrace ────────────────────────────────────────────────────────
export const BALCONY_PROJ   = 1.2;     // projection beyond wall face (layout)
export const RAILING_H      = 1.05;    // balcony railing height
export const RAILING_T      = 0.075;   // railing thickness

// ── Stairs ───────────────────────────────────────────────────────────────────
export const RISER_H        = 0.175;   // 7 in riser
export const TREAD_D        = 0.270;   // 10.5 in tread (nosing-to-nosing)
export const TREAD_T        = 0.050;   // tread slab thickness (waist portion visible)
export const LANDING_T      = 0.125;   // landing slab thickness
