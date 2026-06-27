import React, { forwardRef, useMemo } from "react";
import type {
  LayoutOutput, Room, Wall, Door,
  Window as WinType, Stair, FacingDirection,
} from "@/lib/layoutEngine";
import { RoomFurniture } from "./FurnitureSymbols";

// ─── Drawing constants ────────────────────────────────────────────────────────
export const BASE_SCALE = 45;
const MARGIN_TOP   = 138;
const MARGIN_SIDE  = 88;
const MARGIN_BOT   = 96;
const TITLE_H      = 132;
const SHEET_PAD    = 24;
const DIM_GAP      = 48;
const TICK         = 7;
const EXT_T        = 20;
const INT_T        = 7;

const S          = BASE_SCALE;
const px         = (m: number) => m * S;
const M_TO_FT    = 3.28084;
const M2_TO_SQFT = 10.7639;
const fmtFt      = (m: number) => `${Math.round(m * M_TO_FT)}'`;
const fmtFtD     = (m: number) => {
  const total = Math.round(m * M_TO_FT);
  return `${total}′`;
};
const fmtDims    = (w: number, d: number) =>
  `${Math.round(w * M_TO_FT)}′ × ${Math.round(d * M_TO_FT)}′`;
const fmtSqft    = (m2: number) => `${Math.round(m2 * M2_TO_SQFT)} sq ft`;

// ─── Typeface — consistent premium architectural font stack ──────────────────
const FONT = `"Helvetica Neue", Helvetica, Arial, sans-serif`;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  paper:      "#FDFCFA",
  plotBg:     "#F3F0E8",
  wallExt:    "#18140F",
  wallInt:    "#2C2720",
  border:     "#1C1A17",
  dimLine:    "#B8B2AA",
  dimText:    "#4A4640",
  label:      "#1A1714",
  labelSub:   "#8A827A",
  labelHalo:  "rgba(243,240,232,0.88)",
  doorLine:   "#1C1A17",
  doorZone:   "rgba(155,145,128,0.08)",
  winFill:    "rgba(172,218,242,0.48)",
  winLine:    "#1C1A17",
  winReveal:  "rgba(28,26,23,0.40)",
  stairFill:  "#E0DBD0",
  stairAlt:   "#CEC9BC",
  stairLine:  "#6A6258",
  separator:  "#C8C2BA",
  scaleBar:   "#1C1A17",
  accent:     "#1C1A17",
  sub:        "#8A8480",
  gridLine:   "rgba(0,0,0,0.030)",
} as const;

// ─── Room base colours ────────────────────────────────────────────────────────
const ROOM_BASE: Record<string, string> = {
  living:         "#EDE4CC",
  family_lounge:  "#EDE4CC",
  dining:         "#E8DFCA",
  foyer:          "#EAE0CA",
  pooja:          "#F2E8CA",
  passage:        "#E8E4D8",
  master_bedroom: "#EAD6A8",
  bedroom:        "#ECD8AC",
  kitchen:        "#D6D0C8",
  bathroom:       "#C2D8EE",
  toilet:         "#C2D8EE",
  staircase:      "#DEDAD2",
  utility:        "#DCD8D0",
  balcony:        "#C8DCC4",
  parking:        "#CCCAC4",
  entrance_gate:  "#C4C0B8",
  front_garden:   "#82BA68",
  terrace:        "#CACAC0",
};

// ─── Room texture pattern IDs ─────────────────────────────────────────────────
const ROOM_TEXTURE: Record<string, string> = {
  living:         "wood",
  family_lounge:  "wood",
  dining:         "wood",
  foyer:          "wood",
  master_bedroom: "wood",
  bedroom:        "wood",
  pooja:          "wood",
  passage:        "concrete",
  staircase:      "concrete",
  utility:        "concrete",
  kitchen:        "tile-kitchen",
  bathroom:       "tile-bath",
  toilet:         "tile-bath",
  parking:        "paving",
  entrance_gate:  "paving",
  terrace:        "paving",
  front_garden:   "lawn",
  balcony:        "hatch-bal",
};

const ROOM_LABELS: Record<string, string> = {
  living:         "LIVING ROOM",
  family_lounge:  "FAMILY LOUNGE",
  dining:         "DINING ROOM",
  kitchen:        "KITCHEN",
  master_bedroom: "MASTER BEDROOM",
  bedroom:        "BEDROOM",
  bathroom:       "BATHROOM",
  toilet:         "COMMON W.C.",
  balcony:        "BALCONY",
  parking:        "CAR PORCH",
  staircase:      "STAIRCASE",
  foyer:          "FOYER",
  pooja:          "POOJA ROOM",
  utility:        "UTILITY",
  passage:        "PASSAGE",
  front_garden:   "FRONT GARDEN",
  entrance_gate:  "ENTRANCE GATE",
  terrace:        "TERRACE",
};

export function floorName(f: number) {
  if (f === 0) return "GROUND FLOOR PLAN";
  if (f === 1) return "FIRST FLOOR PLAN";
  if (f === 2) return "SECOND FLOOR PLAN";
  return `FLOOR ${f + 1} PLAN`;
}

// ─── SVG texture pattern definitions ─────────────────────────────────────────
function TexturePatterns() {
  return (
    <>
      {/* Premium wood grain — diagonal walnut hairlines, 2 weights */}
      <pattern id="tex-wood" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
        <line x1="0"  y1="12" x2="12" y2="0"  stroke="rgba(92,58,22,0.11)" strokeWidth="1.2" />
        <line x1="-3" y1="9"  x2="9"  y2="-3" stroke="rgba(92,58,22,0.05)" strokeWidth="0.6" />
        <line x1="3"  y1="12" x2="12" y2="3"  stroke="rgba(92,58,22,0.05)" strokeWidth="0.6" />
        <line x1="0"  y1="4"  x2="4"  y2="0"  stroke="rgba(130,88,38,0.07)" strokeWidth="0.5" />
        <line x1="8"  y1="12" x2="12" y2="8"  stroke="rgba(130,88,38,0.07)" strokeWidth="0.5" />
      </pattern>

      {/* Bathroom tile — fine blue-grey grid */}
      <pattern id="tex-tile-bath" x="0" y="0" width="13" height="13" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="13" height="13" fill="rgba(192,224,242,0.05)" />
        <line x1="0" y1="0" x2="13" y2="0"  stroke="rgba(62,108,148,0.22)" strokeWidth="0.8" />
        <line x1="0" y1="0" x2="0"  y2="13" stroke="rgba(62,108,148,0.22)" strokeWidth="0.8" />
      </pattern>

      {/* Kitchen stone tile — larger warm-grey grid with sub-lines */}
      <pattern id="tex-tile-kitchen" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
        <line x1="0"  y1="0"  x2="22" y2="0"  stroke="rgba(68,60,50,0.17)" strokeWidth="0.9" />
        <line x1="0"  y1="0"  x2="0"  y2="22" stroke="rgba(68,60,50,0.17)" strokeWidth="0.9" />
        <line x1="0"  y1="11" x2="22" y2="11" stroke="rgba(68,60,50,0.07)" strokeWidth="0.4" />
        <line x1="11" y1="0"  x2="11" y2="22" stroke="rgba(68,60,50,0.07)" strokeWidth="0.4" />
        <rect x="1"  y="1"  width="20" height="20" fill="rgba(175,165,148,0.03)" />
      </pattern>

      {/* Paving — brick bond */}
      <pattern id="tex-paving" x="0" y="0" width="28" height="14" patternUnits="userSpaceOnUse">
        <line x1="0"  y1="0"  x2="28" y2="0"  stroke="rgba(58,56,52,0.17)" strokeWidth="0.9" />
        <line x1="0"  y1="7"  x2="28" y2="7"  stroke="rgba(58,56,52,0.10)" strokeWidth="0.5" />
        <line x1="0"  y1="14" x2="28" y2="14" stroke="rgba(58,56,52,0.10)" strokeWidth="0.5" />
        <line x1="14" y1="0"  x2="14" y2="7"  stroke="rgba(58,56,52,0.10)" strokeWidth="0.5" />
        <line x1="0"  y1="7"  x2="0"  y2="14" stroke="rgba(58,56,52,0.10)" strokeWidth="0.5" />
        <line x1="28" y1="7"  x2="28" y2="14" stroke="rgba(58,56,52,0.10)" strokeWidth="0.5" />
      </pattern>

      {/* Lawn — finer organic grass blades, varied */}
      <pattern id="tex-lawn" x="0" y="0" width="8" height="10" patternUnits="userSpaceOnUse">
        <line x1="2"   y1="10" x2="1.5" y2="5.5" stroke="rgba(28,85,20,0.26)" strokeWidth="0.9" />
        <line x1="5.5" y1="10" x2="5"   y2="6.0" stroke="rgba(22,72,15,0.18)" strokeWidth="0.7" />
        <line x1="3.5" y1="10" x2="4.2" y2="7.0" stroke="rgba(32,95,22,0.13)" strokeWidth="0.5" />
        <line x1="7"   y1="10" x2="6.8" y2="6.5" stroke="rgba(22,72,15,0.14)" strokeWidth="0.6" />
      </pattern>

      {/* Concrete stipple */}
      <pattern id="tex-concrete" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="4.5" cy="4.5" r="0.75" fill="rgba(52,45,36,0.11)" />
        <circle cx="0"   cy="0"   r="0.45" fill="rgba(52,45,36,0.07)" />
        <circle cx="9"   cy="0"   r="0.45" fill="rgba(52,45,36,0.07)" />
        <circle cx="0"   cy="9"   r="0.45" fill="rgba(52,45,36,0.07)" />
        <circle cx="9"   cy="9"   r="0.45" fill="rgba(52,45,36,0.07)" />
      </pattern>

      {/* Balcony hatch — diagonal green lines */}
      <pattern id="tex-hatch-bal" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <line x1="0" y1="10" x2="10" y2="0" stroke="rgba(38,98,35,0.20)" strokeWidth="0.9" />
      </pattern>
    </>
  );
}

// ─── Wall geometry ────────────────────────────────────────────────────────────
function isH(wall: Wall) { return Math.abs(wall.y2 - wall.y1) < 0.01; }

function wallSegments(
  wall: Wall, doors: Door[], wins: WinType[],
): Array<[number, number, number, number]> {
  const horiz = isH(wall);
  const len   = wall.length;
  const gaps: { t0: number; t1: number }[] = [];
  for (const d of doors) {
    if (d.wallId !== wall.id) continue;
    const dc = horiz ? d.x - wall.x1 : d.y - wall.y1;
    const hw = d.width / 2;
    gaps.push({ t0: (dc - hw) / len, t1: (dc + hw) / len });
  }
  for (const w of wins) {
    if (w.wallId !== wall.id) continue;
    const wc = horiz ? w.x - wall.x1 : w.y - wall.y1;
    const hw = w.width / 2;
    gaps.push({ t0: (wc - hw) / len, t1: (wc + hw) / len });
  }
  gaps.sort((a, b) => a.t0 - b.t0);
  const lerp = (t: number): [number, number] => [
    wall.x1 + (wall.x2 - wall.x1) * t,
    wall.y1 + (wall.y2 - wall.y1) * t,
  ];
  const segs: Array<[number, number, number, number]> = [];
  let t = 0;
  for (const g of gaps) {
    const t0 = Math.max(0, g.t0), t1 = Math.min(1, g.t1);
    if (t0 > t + 0.001) {
      const [ax, ay] = lerp(t), [bx, by] = lerp(t0);
      segs.push([ax, ay, bx, by]);
    }
    t = t1;
  }
  if (t < 0.999) {
    const [ax, ay] = lerp(t);
    segs.push([ax, ay, wall.x2, wall.y2]);
  }
  return segs;
}

// ─── Drawing sub-components ───────────────────────────────────────────────────

function WallRect({ wall, doors, windows, ox, oy }: {
  wall: Wall; doors: Door[]; windows: WinType[]; ox: number; oy: number;
}) {
  const horiz  = isH(wall);
  const isExt  = wall.type === "external";
  const T      = Math.max(isExt ? EXT_T : INT_T, px(wall.thickness));
  const color  = isExt ? C.wallExt : C.wallInt;
  const segs   = wallSegments(wall, doors, windows);
  return (
    <>
      {segs.map(([x1, y1, x2, y2], i) =>
        horiz ? (
          <rect key={i}
            x={ox + px(x1)} y={oy + px(y1) - T / 2}
            width={Math.max(1, px(x2 - x1))} height={T}
            fill={color}
          />
        ) : (
          <rect key={i}
            x={ox + px(x1) - T / 2} y={oy + px(y1)}
            width={T} height={Math.max(1, px(y2 - y1))}
            fill={color}
          />
        )
      )}
    </>
  );
}

/**
 * Professional architectural door symbol:
 * — Solid door leaf at 90° to wall (open position)
 * — Quarter-circle swing arc (solid fine line, not dashed)
 * — Subtle swing-zone fill
 * — Hinge pivot dot
 */
function DoorSymbol({ door, wall, ox, oy }: {
  door: Door; wall: Wall | undefined; ox: number; oy: number;
}) {
  if (!wall) return null;
  const horiz = isH(wall);
  const cx = ox + px(door.x);
  const cy = oy + px(door.y);
  const dw = px(door.width);

  const leafSW = "1.6";   // door leaf stroke weight
  const arcSW  = "0.60";  // swing arc stroke weight (lighter)

  return horiz ? (
    // Horizontal wall: hinge at left (cx-dw/2), leaf swings down
    <g>
      {/* Swing zone — very subtle tint */}
      <path
        d={`M ${cx - dw / 2},${cy} L ${cx + dw / 2},${cy} A ${dw},${dw} 0 0,0 ${cx - dw / 2},${cy + dw} Z`}
        fill={C.doorZone} stroke="none"
      />
      {/* Door leaf — solid, at 90° to wall (pointing into room) */}
      <line
        x1={cx - dw / 2} y1={cy}
        x2={cx - dw / 2} y2={cy + dw}
        stroke={C.doorLine} strokeWidth={leafSW} strokeLinecap="square"
      />
      {/* Swing arc — solid, light weight */}
      <path
        d={`M ${cx - dw / 2},${cy + dw} A ${dw},${dw} 0 0,1 ${cx + dw / 2},${cy}`}
        stroke={C.doorLine} strokeWidth={arcSW} fill="none"
      />
      {/* Hinge pivot mark */}
      <circle cx={cx - dw / 2} cy={cy} r={2.5} fill={C.doorLine} />
    </g>
  ) : (
    // Vertical wall: hinge at top (cy-dw/2), leaf swings right
    <g>
      <path
        d={`M ${cx},${cy - dw / 2} L ${cx},${cy + dw / 2} A ${dw},${dw} 0 0,1 ${cx + dw},${cy - dw / 2} Z`}
        fill={C.doorZone} stroke="none"
      />
      <line
        x1={cx} y1={cy - dw / 2}
        x2={cx + dw} y2={cy - dw / 2}
        stroke={C.doorLine} strokeWidth={leafSW} strokeLinecap="square"
      />
      <path
        d={`M ${cx + dw},${cy - dw / 2} A ${dw},${dw} 0 0,0 ${cx},${cy + dw / 2}`}
        stroke={C.doorLine} strokeWidth={arcSW} fill="none"
      />
      <circle cx={cx} cy={cy - dw / 2} r={2.5} fill={C.doorLine} />
    </g>
  );
}

/**
 * Professional architectural window symbol:
 * — Glazing fill (light blue)
 * — Two outer frame lines (wall face thickness)
 * — Two inner reveal lines (frame depth, 3px inside)
 * — End jamb lines
 * — Vertical glazing bar if wide enough
 * — Sill projection line (exterior face, dashed)
 */
function WindowSymbol({ win, wall, ox, oy }: {
  win: WinType; wall: Wall | undefined; ox: number; oy: number;
}) {
  if (!wall) return null;
  const horiz = isH(wall);
  const cx = ox + px(win.x);
  const cy = oy + px(win.y);
  const ww = px(win.width);
  const T  = Math.max(wall.type === "external" ? EXT_T : INT_T, px(wall.thickness));
  const rev = Math.min(3.5, T * 0.18);   // reveal inset
  const nBars = Math.max(0, Math.floor(ww / 28) - 1);

  return horiz ? (
    <g>
      {/* Glazing fill */}
      <rect x={cx - ww / 2} y={cy - T / 2} width={ww} height={T} fill={C.winFill} />
      {/* Outer wall face lines */}
      <line x1={cx - ww / 2} y1={cy - T / 2} x2={cx + ww / 2} y2={cy - T / 2}
        stroke={C.winLine} strokeWidth="1.8" />
      <line x1={cx - ww / 2} y1={cy + T / 2} x2={cx + ww / 2} y2={cy + T / 2}
        stroke={C.winLine} strokeWidth="1.8" />
      {/* Inner reveal lines */}
      <line x1={cx - ww / 2} y1={cy - T / 2 + rev} x2={cx + ww / 2} y2={cy - T / 2 + rev}
        stroke={C.winReveal} strokeWidth="0.55" />
      <line x1={cx - ww / 2} y1={cy + T / 2 - rev} x2={cx + ww / 2} y2={cy + T / 2 - rev}
        stroke={C.winReveal} strokeWidth="0.55" />
      {/* End jambs */}
      <line x1={cx - ww / 2} y1={cy - T / 2} x2={cx - ww / 2} y2={cy + T / 2}
        stroke={C.winLine} strokeWidth="1.3" />
      <line x1={cx + ww / 2} y1={cy - T / 2} x2={cx + ww / 2} y2={cy + T / 2}
        stroke={C.winLine} strokeWidth="1.3" />
      {/* Glazing bars */}
      {Array.from({ length: nBars }).map((_, i) => {
        const bx = cx - ww / 2 + (i + 1) * ww / (nBars + 1);
        return (
          <line key={i} x1={bx} y1={cy - T / 2 + rev} x2={bx} y2={cy + T / 2 - rev}
            stroke={C.winReveal} strokeWidth="0.55" />
        );
      })}
      {/* Exterior sill projection (dashed) */}
      <line x1={cx - ww / 2 - 2} y1={cy - T / 2 - 4} x2={cx + ww / 2 + 2} y2={cy - T / 2 - 4}
        stroke={C.dimLine} strokeWidth="0.50" strokeDasharray="3 2.5" />
    </g>
  ) : (
    <g>
      <rect x={cx - T / 2} y={cy - ww / 2} width={T} height={ww} fill={C.winFill} />
      <line x1={cx - T / 2} y1={cy - ww / 2} x2={cx - T / 2} y2={cy + ww / 2}
        stroke={C.winLine} strokeWidth="1.8" />
      <line x1={cx + T / 2} y1={cy - ww / 2} x2={cx + T / 2} y2={cy + ww / 2}
        stroke={C.winLine} strokeWidth="1.8" />
      <line x1={cx - T / 2 + rev} y1={cy - ww / 2} x2={cx - T / 2 + rev} y2={cy + ww / 2}
        stroke={C.winReveal} strokeWidth="0.55" />
      <line x1={cx + T / 2 - rev} y1={cy - ww / 2} x2={cx + T / 2 - rev} y2={cy + ww / 2}
        stroke={C.winReveal} strokeWidth="0.55" />
      <line x1={cx - T / 2} y1={cy - ww / 2} x2={cx + T / 2} y2={cy - ww / 2}
        stroke={C.winLine} strokeWidth="1.3" />
      <line x1={cx - T / 2} y1={cy + ww / 2} x2={cx + T / 2} y2={cy + ww / 2}
        stroke={C.winLine} strokeWidth="1.3" />
      {Array.from({ length: nBars }).map((_, i) => {
        const by = cy - ww / 2 + (i + 1) * ww / (nBars + 1);
        return (
          <line key={i} x1={cx - T / 2 + rev} y1={by} x2={cx + T / 2 - rev} y2={by}
            stroke={C.winReveal} strokeWidth="0.55" />
        );
      })}
      <line x1={cx - T / 2 - 4} y1={cy - ww / 2 - 2} x2={cx - T / 2 - 4} y2={cy + ww / 2 + 2}
        stroke={C.dimLine} strokeWidth="0.50" strokeDasharray="3 2.5" />
    </g>
  );
}

function StairSymbol({ stair, ox, oy }: { stair: Stair; ox: number; oy: number }) {
  const x  = ox + px(stair.x);
  const y  = oy + px(stair.y);
  const rw = px(stair.width);
  const rh = px(stair.depth);
  const n  = Math.min(stair.steps, 18);
  const wide = stair.width >= stair.depth;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) =>
        wide ? (
          <rect key={i} x={x + (i * rw) / n} y={y} width={rw / n} height={rh}
            fill={i % 2 === 0 ? C.stairFill : C.stairAlt}
            stroke={C.stairLine} strokeWidth="0.4" />
        ) : (
          <rect key={i} x={x} y={y + (i * rh) / n} width={rw} height={rh / n}
            fill={i % 2 === 0 ? C.stairFill : C.stairAlt}
            stroke={C.stairLine} strokeWidth="0.4" />
        )
      )}
      <rect x={x} y={y} width={rw} height={rh}
        fill="none" stroke={C.stairLine} strokeWidth="0.9" />
      {wide ? (
        <line x1={x + 10} y1={y + rh / 2} x2={x + rw - 10} y2={y + rh / 2}
          stroke={C.stairLine} strokeWidth="0.9" markerEnd="url(#stairArrow)" />
      ) : (
        <line x1={x + rw / 2} y1={y + 10} x2={x + rw / 2} y2={y + rh - 10}
          stroke={C.stairLine} strokeWidth="0.9" markerEnd="url(#stairArrow)" />
      )}
      <text x={x + rw / 2} y={y + rh / 2 + (wide ? -9 : 4)}
        textAnchor="middle" fontSize="7"
        fontFamily={FONT} fontWeight="700"
        fill={C.stairLine} letterSpacing="0.08em">
        {stair.fromFloor === 0 ? "UP" : "DN"}
      </text>
    </g>
  );
}

/**
 * Room label — clean 3-tier typographic hierarchy with no box.
 * Uses SVG paintOrder trick for legibility over textured fills.
 */
function RoomLabel({ room, ox, oy }: { room: Room; ox: number; oy: number }) {
  if (room.type === "entrance_gate") return null;

  const cx  = ox + px(room.x) + px(room.width)  / 2;
  const cy  = oy + px(room.y) + px(room.depth)   / 2;
  const rw  = px(room.width);
  const rh  = px(room.depth);

  const label = ROOM_LABELS[room.type] ?? room.type.toUpperCase().replace(/_/g, " ");
  const dims  = fmtDims(room.width, room.depth);
  const area  = fmtSqft(room.area);

  // Scale font size to fit room width
  const nameSize = Math.min(9.2, (rw * 0.82) / (label.length * 0.58));
  const subSize  = Math.min(6.8, (rw * 0.78) / (dims.length * 0.55));

  const showSub = subSize >= 5.2 && rh >= 36;
  if (nameSize < 4.5 || rh < 22) return null;

  const lineH  = nameSize * 1.45;
  const totalH = nameSize + (showSub ? lineH + subSize * 2.8 : 0);
  const startY = cy - totalH / 2 + nameSize;

  // Halo colour matches the room's base colour for perfect blend
  const halo = C.labelHalo;

  return (
    <g fontFamily={FONT}>
      {/* Room name */}
      <text
        x={cx} y={startY}
        textAnchor="middle"
        fontSize={nameSize}
        fontWeight="700"
        letterSpacing="0.10em"
        fill={C.label}
        stroke={halo}
        strokeWidth="3.5"
        strokeLinejoin="round"
        style={{ paintOrder: "stroke" } as React.CSSProperties}
      >
        {label}
      </text>

      {showSub && (<>
        {/* Thin separator rule */}
        <line
          x1={cx - nameSize * label.length * 0.27}
          y1={startY + 4}
          x2={cx + nameSize * label.length * 0.27}
          y2={startY + 4}
          stroke={C.separator} strokeWidth="0.45"
        />
        {/* Dimensions */}
        <text
          x={cx} y={startY + lineH}
          textAnchor="middle"
          fontSize={subSize}
          fontWeight="400"
          letterSpacing="0.06em"
          fill={C.labelSub}
          stroke={halo}
          strokeWidth="3"
          strokeLinejoin="round"
          style={{ paintOrder: "stroke" } as React.CSSProperties}
        >
          {dims}
        </text>
        {/* Area */}
        <text
          x={cx} y={startY + lineH + subSize * 1.65}
          textAnchor="middle"
          fontSize={subSize * 0.90}
          fontWeight="400"
          letterSpacing="0.05em"
          fill={C.labelSub}
          stroke={halo}
          strokeWidth="3"
          strokeLinejoin="round"
          style={{ paintOrder: "stroke" } as React.CSSProperties}
        >
          {area}
        </text>
      </>)}
    </g>
  );
}

// ─── Sheet presentation components ───────────────────────────────────────────

/**
 * Dimension lines — refined with oblique tick terminators and clean extension lines.
 */
function DimensionLines({ pw, pd, ox, oy }: {
  pw: number; pd: number; ox: number; oy: number;
}) {
  const off = DIM_GAP;
  const t   = TICK;

  // Oblique 45° tick at each terminator
  const tick = (x: number, y: number, key: string) => (
    <line key={key}
      x1={x - t * 0.7} y1={y + t * 0.7}
      x2={x + t * 0.7} y2={y - t * 0.7}
      stroke={C.dimLine} strokeWidth="1.0" />
  );

  const extStyle = { stroke: C.dimLine, strokeWidth: "0.4" as const, strokeDasharray: "2.5 3" as const };
  const dimStyle = { stroke: C.dimLine, strokeWidth: "0.65" as const };
  const txtStyle = {
    fontFamily: FONT,
    fontSize: "8.5" as const,
    fontWeight: "500" as const,
    fill: C.dimText,
    letterSpacing: "0.04em" as const,
  };

  return (
    <g fill="none">
      {/* Extension lines */}
      <line x1={ox}      y1={oy}       x2={ox}      y2={oy - off}      {...extStyle} />
      <line x1={ox + pw} y1={oy}       x2={ox + pw} y2={oy - off}      {...extStyle} />
      <line x1={ox}      y1={oy + pd}  x2={ox}      y2={oy + pd + off} {...extStyle} />
      <line x1={ox + pw} y1={oy + pd}  x2={ox + pw} y2={oy + pd + off} {...extStyle} />
      <line x1={ox}      y1={oy}       x2={ox - off}      y2={oy}      {...extStyle} />
      <line x1={ox}      y1={oy + pd}  x2={ox - off}      y2={oy + pd} {...extStyle} />
      <line x1={ox + pw} y1={oy}       x2={ox + pw + off} y2={oy}      {...extStyle} />
      <line x1={ox + pw} y1={oy + pd}  x2={ox + pw + off} y2={oy + pd} {...extStyle} />

      {/* Dimension lines */}
      <line x1={ox} y1={oy - off}      x2={ox + pw} y2={oy - off}      {...dimStyle} />
      <line x1={ox} y1={oy + pd + off} x2={ox + pw} y2={oy + pd + off} {...dimStyle} />
      <line x1={ox - off} y1={oy}      x2={ox - off} y2={oy + pd}      {...dimStyle} />
      <line x1={ox + pw + off} y1={oy} x2={ox + pw + off} y2={oy + pd} {...dimStyle} />

      {/* Tick terminators */}
      {tick(ox,           oy - off,       "t1")}
      {tick(ox + pw,      oy - off,       "t2")}
      {tick(ox,           oy + pd + off,  "t3")}
      {tick(ox + pw,      oy + pd + off,  "t4")}
      {tick(ox - off,     oy,             "t5")}
      {tick(ox - off,     oy + pd,        "t6")}
      {tick(ox + pw + off, oy,            "t7")}
      {tick(ox + pw + off, oy + pd,       "t8")}

      {/* Dimension text */}
      <text x={ox + pw / 2} y={oy - off - 9}         textAnchor="middle" {...txtStyle}>
        {fmtFtD(pw / S)}
      </text>
      <text x={ox + pw / 2} y={oy + pd + off + 17}   textAnchor="middle" {...txtStyle}>
        {fmtFtD(pw / S)}
      </text>
      <text x={0} y={0}
        transform={`translate(${ox - off - 11},${oy + pd / 2}) rotate(-90)`}
        textAnchor="middle" {...txtStyle}>
        {fmtFtD(pd / S)}
      </text>
      <text x={0} y={0}
        transform={`translate(${ox + pw + off + 11},${oy + pd / 2}) rotate(90)`}
        textAnchor="middle" {...txtStyle}>
        {fmtFtD(pd / S)}
      </text>
    </g>
  );
}

/**
 * North arrow — refined elegant circle compass.
 */
function NorthArrow({ x, y }: { x: number; y: number }) {
  const r = 17;
  const rI = 12;
  return (
    <g transform={`translate(${x},${y})`} fontFamily={FONT}>
      {/* Outer ring */}
      <circle cx="0" cy="0" r={r} fill="none" stroke={C.accent} strokeWidth="0.8" />
      {/* Inner ring */}
      <circle cx="0" cy="0" r={rI} fill="none" stroke={C.accent} strokeWidth="0.35" />
      {/* North needle — solid filled */}
      <polygon points={`0,${-rI + 1} 4.5,2 0,0`}    fill={C.accent} />
      {/* South needle — outline only */}
      <polygon points={`0,${rI - 1}  -4.5,-2 0,0`}  fill="none" stroke={C.accent} strokeWidth="0.7" />
      {/* Hub dot */}
      <circle cx="0" cy="0" r="1.5" fill={C.accent} />
      {/* N label */}
      <text x="0" y={-r - 8} textAnchor="middle"
        fontSize="10" fontWeight="700" fill={C.accent} letterSpacing="0.18em">N</text>
      {/* NORTH label */}
      <text x="0" y={r + 13} textAnchor="middle"
        fontSize="6" fontWeight="500" fill={C.sub} letterSpacing="0.16em">NORTH</text>
    </g>
  );
}

/**
 * Scale bar — clean segmented bar with metre/feet labels.
 */
function ScaleBar({ x, y }: { x: number; y: number }) {
  const barM  = 5;
  const barPx = barM * S;
  const segs  = 5;
  const segW  = barPx / segs;
  const ratio = Math.round(1 / (S / 1000) * 25.4);
  return (
    <g transform={`translate(${x},${y})`} fontFamily={FONT}>
      <text x={0} y={-7} fontSize="6.5" fontWeight="600" fill={C.sub} letterSpacing="0.12em">
        SCALE  1 : {ratio}
      </text>
      {Array.from({ length: segs }).map((_, i) => (
        <rect key={i} x={i * segW} y={0} width={segW} height={4.5}
          fill={i % 2 === 0 ? C.scaleBar : C.paper}
          stroke={C.scaleBar} strokeWidth="0.5" />
      ))}
      <text x={0}          y={14} textAnchor="middle" fontSize="6" fill={C.sub}>0</text>
      <text x={barPx * 0.5} y={14} textAnchor="middle" fontSize="6" fill={C.sub}>{fmtFt(barM * 0.5)}</text>
      <text x={barPx}      y={14} textAnchor="middle" fontSize="6" fill={C.sub}>{fmtFt(barM)}</text>
    </g>
  );
}

/**
 * Title block — four-column layout, refined typography.
 */
function TitleBlock({
  svgW, svgH, plotWidth, plotDepth, floor, numFloors, bedrooms, bathrooms,
}: {
  svgW: number; svgH: number;
  plotWidth: number; plotDepth: number;
  floor: number; numFloors: number;
  bedrooms: number; bathrooms: number;
}) {
  const pw   = Math.round(plotWidth * M_TO_FT);
  const pd   = Math.round(plotDepth * M_TO_FT);
  const pa   = Math.round(plotWidth * plotDepth * M2_TO_SQFT);
  const date = new Date().toLocaleDateString("en-GB",
    { day: "2-digit", month: "long", year: "numeric" });
  const ratio = Math.round(1 / (S / 1000) * 25.4);

  const y0  = svgH - TITLE_H;
  const lp  = 18;
  const tp  = 20;
  const blk = SHEET_PAD + 2;
  const c1x = blk;
  const c2x = svgW * 0.40;
  const c3x = svgW * 0.62;
  const c4x = svgW * 0.80;
  const brkW = svgW - SHEET_PAD * 2 - 4;
  const brkH = TITLE_H - SHEET_PAD - 2;

  return (
    <g fontFamily={FONT}>
      {/* Block background */}
      <rect x={c1x} y={y0} width={brkW} height={brkH} fill={C.paper} />
      {/* Heavy top rule */}
      <line x1={c1x} y1={y0}     x2={c1x + brkW} y2={y0}
        stroke={C.accent} strokeWidth="2.5" />
      {/* Fine secondary rule */}
      <line x1={c1x} y1={y0 + 5} x2={c1x + brkW} y2={y0 + 5}
        stroke={C.separator} strokeWidth="0.4" />

      {/* Column separators */}
      {[c2x, c3x, c4x].map((cx, i) => (
        <line key={i} x1={cx} y1={y0 + 8} x2={cx} y2={svgH - SHEET_PAD - 2}
          stroke={C.separator} strokeWidth="0.5" />
      ))}

      {/* Column 1 — Plan title */}
      <text x={c1x + lp} y={y0 + tp} fontSize="6" fontWeight="600"
        fill={C.sub} letterSpacing="0.20em">ARCHITECTURAL FLOOR PLAN</text>
      <text x={c1x + lp} y={y0 + tp + 27} fontSize="16.5" fontWeight="700"
        fill={C.accent} letterSpacing="0.03em">{floorName(floor)}</text>
      <text x={c1x + lp} y={y0 + tp + 44} fontSize="7.5" fill={C.sub} letterSpacing="0.02em">
        {bedrooms} Bedrooms  ·  {bathrooms} Bathrooms  ·  Floor {floor + 1} of {numFloors}
      </text>
      <line x1={c1x + lp} y1={y0 + tp + 52} x2={c2x - lp} y2={y0 + tp + 52}
        stroke={C.separator} strokeWidth="0.4" />
      <text x={c1x + lp} y={y0 + tp + 66} fontSize="7" fill={C.sub}>{date}</text>

      {/* Column 2 — Plot dimensions */}
      <text x={c2x + lp} y={y0 + tp} fontSize="6" fontWeight="600"
        fill={C.sub} letterSpacing="0.20em">PLOT DIMENSIONS</text>
      <text x={c2x + lp} y={y0 + tp + 29} fontSize="20" fontWeight="700" fill={C.accent}>
        {pw}′ × {pd}′
      </text>
      <text x={c2x + lp} y={y0 + tp + 46} fontSize="7.5" fill={C.sub}>
        {plotWidth.toFixed(2)} m × {plotDepth.toFixed(2)} m
      </text>
      <text x={c2x + lp} y={y0 + tp + 62} fontSize="7.5" fill={C.sub}>
        Plot area: {pa.toLocaleString()} sq ft
      </text>

      {/* Column 3 — Drawing scale */}
      <text x={c3x + lp} y={y0 + tp} fontSize="6" fontWeight="600"
        fill={C.sub} letterSpacing="0.20em">DRAWING SCALE</text>
      <text x={c3x + lp} y={y0 + tp + 29} fontSize="20" fontWeight="700" fill={C.accent}>
        1 : {ratio}
      </text>
      <text x={c3x + lp} y={y0 + tp + 46} fontSize="7.5" fill={C.sub}>Units: Feet / Sq Ft</text>
      <text x={c3x + lp} y={y0 + tp + 62} fontSize="7" fill={C.sub} fontStyle="italic">For reference only</text>

      {/* Column 4 — Drawing info */}
      <text x={c4x + lp} y={y0 + tp} fontSize="6" fontWeight="600"
        fill={C.sub} letterSpacing="0.20em">DRAWING INFO</text>
      <text x={c4x + lp} y={y0 + tp + 20} fontSize="8" fill={C.sub} letterSpacing="0.04em">Bedrooms</text>
      <text x={c4x + lp} y={y0 + tp + 34} fontSize="14" fontWeight="700" fill={C.accent}>{bedrooms}</text>
      <text x={c4x + lp} y={y0 + tp + 50} fontSize="8" fill={C.sub} letterSpacing="0.04em">Bathrooms</text>
      <text x={c4x + lp} y={y0 + tp + 64} fontSize="14" fontWeight="700" fill={C.accent}>{bathrooms}</text>
    </g>
  );
}

/**
 * Sheet border — double-rule with corner crosshairs.
 */
function SheetBorder({ svgW, svgH }: { svgW: number; svgH: number }) {
  const p = SHEET_PAD;
  const g = 5;
  return (
    <>
      {/* Outer border */}
      <rect x={p} y={p} width={svgW - p * 2} height={svgH - p * 2}
        fill="none" stroke={C.accent} strokeWidth="1.8" />
      {/* Inner fine rule */}
      <rect x={p + g} y={p + g} width={svgW - (p + g) * 2} height={svgH - (p + g) * 2}
        fill="none" stroke={C.separator} strokeWidth="0.4" />
      {/* Corner crosshairs */}
      {([[p, p], [svgW - p, p], [p, svgH - p], [svgW - p, svgH - p]] as [number,number][]).map(([cx, cy], i) => (
        <g key={i}>
          <line x1={cx - 14} y1={cy}      x2={cx + 14} y2={cy}      stroke={C.sub} strokeWidth="0.45" />
          <line x1={cx}      y1={cy - 14} x2={cx}      y2={cy + 14} stroke={C.sub} strokeWidth="0.45" />
        </g>
      ))}
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface FloorPlanSVGProps {
  layout:    LayoutOutput;
  floor:     number;
  plotWidth: number;
  plotDepth: number;
  facing:    FacingDirection;
  bedrooms:  number;
  bathrooms: number;
}

// ─── Main SVG component ───────────────────────────────────────────────────────
const FloorPlanSVG = forwardRef<SVGSVGElement, FloorPlanSVGProps>(
  function FloorPlanSVG({ layout, floor, plotWidth, plotDepth, bedrooms, bathrooms }, ref) {

    const pw   = px(plotWidth);
    const pd   = px(plotDepth);
    const OX   = MARGIN_SIDE;
    const OY   = MARGIN_TOP;
    const svgW = MARGIN_SIDE * 2 + pw;
    const svgH = MARGIN_TOP + pd + MARGIN_BOT + TITLE_H + SHEET_PAD;

    const rooms   = useMemo(() => layout.rooms.filter(r => r.floor === floor),      [layout, floor]);
    const walls   = useMemo(() => layout.walls.filter(w => w.floor === floor),      [layout, floor]);
    const doors   = useMemo(() => layout.doors.filter(d => d.floor === floor),      [layout, floor]);
    const windows = useMemo(() => layout.windows.filter(w => w.floor === floor),    [layout, floor]);
    const stairs  = useMemo(() => layout.stairs.filter(s => s.fromFloor === floor), [layout, floor]);

    const wallById = useMemo(() => {
      const m = new Map<string, Wall>();
      walls.forEach(w => m.set(w.id, w));
      return m;
    }, [walls]);

    const numFloors = Math.max(...layout.rooms.map(r => r.floor)) + 1;
    const openRooms = rooms.filter(r =>
      r.type === "balcony" || r.type === "terrace" ||
      r.type === "front_garden" || r.type === "entrance_gate"
    );

    return (
      <svg
        ref={ref}
        width={svgW} height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          <TexturePatterns />

          <marker id="stairArrow" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill={C.stairLine} />
          </marker>

          {/* Radial vignette — warmth and depth */}
          <radialGradient id="plot-vignette" cx="50%" cy="50%" r="72%">
            <stop offset="50%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(18,12,6,0.09)" />
          </radialGradient>

          {/* Plot drop shadow filter */}
          <filter id="plot-shadow" x="-2%" y="-2%" width="108%" height="108%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(0,0,0,0.12)" />
          </filter>

          {openRooms.map(r => (
            <clipPath key={r.id} id={`bclip-${r.id}`}>
              <rect x={OX + px(r.x)} y={OY + px(r.y)} width={px(r.width)} height={px(r.depth)} />
            </clipPath>
          ))}
        </defs>

        {/* ① Paper */}
        <rect x={0} y={0} width={svgW} height={svgH} fill={C.paper} />

        {/* ② Plot background with subtle shadow */}
        <rect x={OX} y={OY} width={pw} height={pd} fill={C.plotBg} filter="url(#plot-shadow)" />

        {/* ③ Faint metre grid */}
        {Array.from({ length: Math.ceil(plotWidth) + 1 }).map((_, i) => (
          <line key={`gx${i}`}
            x1={OX + i * S} y1={OY} x2={OX + i * S} y2={OY + pd}
            stroke={C.gridLine} strokeWidth="0.4" />
        ))}
        {Array.from({ length: Math.ceil(plotDepth) + 1 }).map((_, i) => (
          <line key={`gy${i}`}
            x1={OX} y1={OY + i * S} x2={OX + pw} y2={OY + i * S}
            stroke={C.gridLine} strokeWidth="0.4" />
        ))}

        {/* ④ Room base colours */}
        {rooms.map(r => (
          <rect key={`base-${r.id}`}
            x={OX + px(r.x)} y={OY + px(r.y)}
            width={px(r.width)} height={px(r.depth)}
            fill={ROOM_BASE[r.type] ?? "#F3F0E8"}
          />
        ))}

        {/* ⑤ Room texture overlays */}
        {rooms.map(r => {
          const tex = ROOM_TEXTURE[r.type];
          if (!tex) return null;
          return (
            <rect key={`tex-${r.id}`}
              x={OX + px(r.x)} y={OY + px(r.y)}
              width={px(r.width)} height={px(r.depth)}
              fill={`url(#tex-${tex})`}
            />
          );
        })}

        {/* ⑥ Plot vignette */}
        <rect x={OX} y={OY} width={pw} height={pd} fill="url(#plot-vignette)" />

        {/* ⑦ Furniture & landscaping */}
        {rooms.map(r => (
          <RoomFurniture key={`furn-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑧ Plot outer boundary */}
        <rect x={OX} y={OY} width={pw} height={pd}
          fill="none" stroke={C.border} strokeWidth="2.5" />

        {/* ⑨ Walls — exterior first (thick dark), then interior (thinner) */}
        {walls.filter(w => w.type === "external").map(w => (
          <WallRect key={w.id} wall={w} doors={doors} windows={windows} ox={OX} oy={OY} />
        ))}
        {walls.filter(w => w.type !== "external").map(w => (
          <WallRect key={w.id} wall={w} doors={doors} windows={windows} ox={OX} oy={OY} />
        ))}

        {/* ⑩ Windows */}
        {windows.map(w => (
          <WindowSymbol key={w.id} win={w} wall={wallById.get(w.wallId)} ox={OX} oy={OY} />
        ))}

        {/* ⑪ Doors */}
        {doors.map(d => (
          <DoorSymbol key={d.id} door={d} wall={wallById.get(d.wallId)} ox={OX} oy={OY} />
        ))}

        {/* ⑫ Stairs */}
        {stairs.map(s => (
          <StairSymbol key={s.id} stair={s} ox={OX} oy={OY} />
        ))}

        {/* ⑬ Room labels */}
        {rooms.map(r => (
          <RoomLabel key={`lbl-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑭ Dimension lines */}
        <DimensionLines pw={pw} pd={pd} ox={OX} oy={OY} />

        {/* ⑮ North arrow */}
        <NorthArrow x={OX + pw / 2} y={OY - MARGIN_TOP * 0.46} />

        {/* ⑯ Scale bar */}
        <ScaleBar x={OX} y={OY + pd + DIM_GAP + 30} />

        {/* ⑰ Title block */}
        <TitleBlock
          svgW={svgW} svgH={svgH}
          plotWidth={plotWidth} plotDepth={plotDepth}
          floor={floor} numFloors={numFloors}
          bedrooms={bedrooms} bathrooms={bathrooms}
        />

        {/* ⑱ Sheet border — topmost layer */}
        <SheetBorder svgW={svgW} svgH={svgH} />
      </svg>
    );
  }
);

export default FloorPlanSVG;
