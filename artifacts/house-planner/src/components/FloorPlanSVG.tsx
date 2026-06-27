import React, { forwardRef, useMemo } from "react";
import type {
  LayoutOutput, Room, Wall, Door,
  Window as WinType, Stair, FacingDirection,
} from "@/lib/layoutEngine";
import { RoomFurniture } from "./FurnitureSymbols";

// ─── Drawing constants ────────────────────────────────────────────────────────
export const BASE_SCALE = 45;
const MARGIN_TOP   = 130;
const MARGIN_SIDE  = 82;
const MARGIN_BOT   = 92;
const TITLE_H      = 128;
const SHEET_PAD    = 22;
const DIM_GAP      = 46;
const TICK         = 8;
const EXT_T        = 20;   // thick exterior walls
const INT_T        = 7;    // thinner interior walls

const S          = BASE_SCALE;
const px         = (m: number) => m * S;
const M_TO_FT    = 3.28084;
const M2_TO_SQFT = 10.7639;
const fmtFt      = (m: number) => `${Math.round(m * M_TO_FT)}'`;
const fmtDims    = (w: number, d: number) =>
  `${Math.round(w * M_TO_FT)}′ × ${Math.round(d * M_TO_FT)}′`;
const fmtSqft    = (m2: number) => `${Math.round(m2 * M2_TO_SQFT)} sq ft`;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  paper:      "#FFFFFF",
  plotBg:     "#F4F1EC",
  wallExt:    "#141210",    // deep charcoal exterior walls
  wallInt:    "#2E2924",    // slightly lighter interior walls
  border:     "#1C1A17",
  dimLine:    "#AEA9A2",
  dimText:    "#4A4640",
  label:      "#1A1714",
  labelSub:   "#7A7268",
  doorLine:   "#1C1A17",
  winFill:    "rgba(178,215,240,0.42)",
  winLine:    "#1C1A17",
  stairFill:  "#E0DBD0",
  stairAlt:   "#CEC9BC",
  stairLine:  "#686258",
  separator:  "#C4BFB8",
  scaleBar:   "#1C1A17",
  hatch:      "rgba(45,95,35,0.22)",
  accent:     "#1C1A17",
  sub:        "#8C8880",
} as const;

// ─── Room base colours (warm, rich, non-flat) ────────────────────────────────
const ROOM_BASE: Record<string, string> = {
  living:         "#EAE1CB",   // warm ivory
  family_lounge:  "#EAE1CB",
  dining:         "#E4DAC2",   // slightly deeper ivory
  foyer:          "#E6DBC6",
  pooja:          "#F0E6C8",   // warm gold ivory
  passage:        "#E6E0D4",
  master_bedroom: "#E6D2A4",   // soft warm beige
  bedroom:        "#E8D4A8",
  kitchen:        "#D4CFCA",   // stone grey
  bathroom:       "#BDD6E6",   // light blue tile
  toilet:         "#BDD6E6",
  staircase:      "#DDDAD2",
  utility:        "#DAD6CE",
  balcony:        "#C4DAC0",   // sage green
  parking:        "#CBCAC4",   // light grey paving
  entrance_gate:  "#C6C2BA",
  front_garden:   "#74AF5C",   // natural green
  terrace:        "#C8C8C0",
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
  front_garden:   "grass",
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
      {/* Wood grain — diagonal walnut hairlines */}
      <pattern id="tex-wood" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <line x1="0"  y1="10" x2="10" y2="0"  stroke="rgba(95,62,28,0.12)" strokeWidth="1.1" />
        <line x1="-2" y1="7"  x2="7"  y2="-2" stroke="rgba(95,62,28,0.06)" strokeWidth="0.6" />
        <line x1="3"  y1="10" x2="10" y2="3"  stroke="rgba(95,62,28,0.06)" strokeWidth="0.6" />
        <line x1="0"  y1="3"  x2="3"  y2="0"  stroke="rgba(130,90,40,0.08)" strokeWidth="0.5" />
      </pattern>

      {/* Bathroom tile — fine blue-grey grid */}
      <pattern id="tex-tile-bath" x="0" y="0" width="13" height="13" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0"  x2="13" y2="0"  stroke="rgba(70,110,150,0.20)" strokeWidth="0.9" />
        <line x1="0" y1="0"  x2="0"  y2="13" stroke="rgba(70,110,150,0.20)" strokeWidth="0.9" />
        <rect x="1" y="1" width="11" height="11" fill="rgba(200,230,245,0.06)" />
      </pattern>

      {/* Kitchen stone tile — larger warm-grey grid */}
      <pattern id="tex-tile-kitchen" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0"  x2="20" y2="0"  stroke="rgba(70,62,52,0.16)" strokeWidth="0.9" />
        <line x1="0" y1="0"  x2="0"  y2="20" stroke="rgba(70,62,52,0.16)" strokeWidth="0.9" />
        <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(70,62,52,0.08)" strokeWidth="0.4" />
        <line x1="10" y1="0" x2="10" y2="20" stroke="rgba(70,62,52,0.08)" strokeWidth="0.4" />
        <rect x="1" y="1" width="18" height="18" fill="rgba(180,170,155,0.04)" />
      </pattern>

      {/* Paving — brick bond for parking / terrace */}
      <pattern id="tex-paving" x="0" y="0" width="26" height="14" patternUnits="userSpaceOnUse">
        <line x1="0"  y1="0"  x2="26" y2="0"  stroke="rgba(60,58,54,0.16)" strokeWidth="0.9" />
        <line x1="0"  y1="7"  x2="26" y2="7"  stroke="rgba(60,58,54,0.10)" strokeWidth="0.5" />
        <line x1="13" y1="0"  x2="13" y2="7"  stroke="rgba(60,58,54,0.10)" strokeWidth="0.5" />
        <line x1="0"  y1="7"  x2="0"  y2="14" stroke="rgba(60,58,54,0.10)" strokeWidth="0.5" />
        <line x1="26" y1="7"  x2="26" y2="14" stroke="rgba(60,58,54,0.10)" strokeWidth="0.5" />
      </pattern>

      {/* Grass — fine vertical strokes */}
      <pattern id="tex-grass" x="0" y="0" width="7" height="9" patternUnits="userSpaceOnUse">
        <line x1="2"   y1="9" x2="2"   y2="4" stroke="rgba(25,80,18,0.24)" strokeWidth="0.9" />
        <line x1="5.5" y1="9" x2="4.5" y2="5" stroke="rgba(25,80,18,0.16)" strokeWidth="0.7" />
      </pattern>

      {/* Concrete — subtle stipple for utility / passage / stairs */}
      <pattern id="tex-concrete" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="4.5" cy="4.5" r="0.8" fill="rgba(55,48,38,0.11)" />
        <circle cx="0"   cy="0"   r="0.5" fill="rgba(55,48,38,0.07)" />
        <circle cx="9"   cy="0"   r="0.5" fill="rgba(55,48,38,0.07)" />
      </pattern>

      {/* Balcony hatch — diagonal green lines */}
      <pattern id="tex-hatch-bal" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <line x1="0" y1="10" x2="10" y2="0" stroke="rgba(40,100,38,0.22)" strokeWidth="1" />
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

function DoorSymbol({ door, wall, ox, oy }: {
  door: Door; wall: Wall | undefined; ox: number; oy: number;
}) {
  if (!wall) return null;
  const horiz = isH(wall);
  const cx = ox + px(door.x);
  const cy = oy + px(door.y);
  const dw = px(door.width);
  return horiz ? (
    <g stroke={C.doorLine} fill="none" strokeWidth="1.1">
      <line x1={cx - dw / 2} y1={cy} x2={cx - dw / 2} y2={cy + dw} />
      <path d={`M ${cx + dw / 2},${cy} A ${dw},${dw} 0 0,0 ${cx - dw / 2},${cy + dw}`}
        strokeDasharray="4 2.5" />
    </g>
  ) : (
    <g stroke={C.doorLine} fill="none" strokeWidth="1.1">
      <line x1={cx} y1={cy - dw / 2} x2={cx + dw} y2={cy - dw / 2} />
      <path d={`M ${cx},${cy + dw / 2} A ${dw},${dw} 0 0,1 ${cx + dw},${cy - dw / 2}`}
        strokeDasharray="4 2.5" />
    </g>
  );
}

function WindowSymbol({ win, wall, ox, oy }: {
  win: WinType; wall: Wall | undefined; ox: number; oy: number;
}) {
  if (!wall) return null;
  const horiz = isH(wall);
  const cx = ox + px(win.x);
  const cy = oy + px(win.y);
  const ww = px(win.width);
  const T  = Math.max(wall.type === "external" ? EXT_T : INT_T, px(wall.thickness));
  return horiz ? (
    <g>
      <rect x={cx - ww / 2} y={cy - T / 2} width={ww} height={T} fill={C.winFill} />
      <line x1={cx - ww / 2} y1={cy - T / 2} x2={cx + ww / 2} y2={cy - T / 2} stroke={C.winLine} strokeWidth="1.4" />
      <line x1={cx - ww / 2} y1={cy}          x2={cx + ww / 2} y2={cy}          stroke={C.winLine} strokeWidth="0.7" />
      <line x1={cx - ww / 2} y1={cy + T / 2}  x2={cx + ww / 2} y2={cy + T / 2} stroke={C.winLine} strokeWidth="1.4" />
      <line x1={cx - ww / 2} y1={cy - T / 2}  x2={cx - ww / 2} y2={cy + T / 2} stroke={C.winLine} strokeWidth="1.1" />
      <line x1={cx + ww / 2} y1={cy - T / 2}  x2={cx + ww / 2} y2={cy + T / 2} stroke={C.winLine} strokeWidth="1.1" />
    </g>
  ) : (
    <g>
      <rect x={cx - T / 2} y={cy - ww / 2} width={T} height={ww} fill={C.winFill} />
      <line x1={cx - T / 2} y1={cy - ww / 2} x2={cx - T / 2} y2={cy + ww / 2} stroke={C.winLine} strokeWidth="1.4" />
      <line x1={cx}          y1={cy - ww / 2} x2={cx}          y2={cy + ww / 2} stroke={C.winLine} strokeWidth="0.7" />
      <line x1={cx + T / 2}  y1={cy - ww / 2} x2={cx + T / 2}  y2={cy + ww / 2} stroke={C.winLine} strokeWidth="1.4" />
      <line x1={cx - T / 2}  y1={cy - ww / 2} x2={cx + T / 2}  y2={cy - ww / 2} stroke={C.winLine} strokeWidth="1.1" />
      <line x1={cx - T / 2}  y1={cy + ww / 2} x2={cx + T / 2}  y2={cy + ww / 2} stroke={C.winLine} strokeWidth="1.1" />
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
            stroke={C.stairLine} strokeWidth="0.5" />
        ) : (
          <rect key={i} x={x} y={y + (i * rh) / n} width={rw} height={rh / n}
            fill={i % 2 === 0 ? C.stairFill : C.stairAlt}
            stroke={C.stairLine} strokeWidth="0.5" />
        )
      )}
      <rect x={x} y={y} width={rw} height={rh}
        fill="none" stroke={C.stairLine} strokeWidth="1" />
      {wide ? (
        <line x1={x + 8} y1={y + rh / 2} x2={x + rw - 8} y2={y + rh / 2}
          stroke={C.stairLine} strokeWidth="1" markerEnd="url(#stairArrow)" />
      ) : (
        <line x1={x + rw / 2} y1={y + 8} x2={x + rw / 2} y2={y + rh - 8}
          stroke={C.stairLine} strokeWidth="1" markerEnd="url(#stairArrow)" />
      )}
      <text x={x + rw / 2} y={y + rh / 2 + (wide ? -8 : 4)}
        textAnchor="middle" fontSize="7.5"
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="700"
        fill={C.stairLine} letterSpacing="0.06em">
        {stair.fromFloor === 0 ? "UP" : "DN"}
      </text>
    </g>
  );
}

function RoomLabel({ room, ox, oy }: { room: Room; ox: number; oy: number }) {
  if (room.type === "entrance_gate") return null;
  const cx    = ox + px(room.x) + px(room.width) / 2;
  const cy    = oy + px(room.y) + px(room.depth) / 2;
  const label = ROOM_LABELS[room.type] ?? room.type.toUpperCase().replace(/_/g, " ");
  const dims  = fmtDims(room.width, room.depth);
  const area  = fmtSqft(room.area);
  const roomPx  = px(room.width);
  const roomPxH = px(room.depth);
  const nameSize = Math.min(9.5, (roomPx * 0.80) / (label.length * 0.58));
  const subSize  = Math.min(7, (roomPx * 0.76) / (dims.length * 0.55));
  const showSub  = subSize >= 5.5 && roomPxH >= 34;
  if (nameSize < 4.5 || roomPxH < 20) return null;
  const lineH  = showSub ? nameSize * 1.35 : 0;
  const totalH = nameSize + (showSub ? lineH + subSize * 2.5 : 0);
  const startY = cy - totalH / 2 + nameSize;
  const bgW = Math.min(roomPx * 0.84, label.length * nameSize * 0.62 + 12);
  const bgH = totalH + 8;
  return (
    <g>
      <rect x={cx - bgW / 2} y={startY - nameSize - 3} width={bgW} height={bgH}
        fill="rgba(255,255,255,0.72)" rx="1.5" />
      <text x={cx} y={startY} textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={nameSize} fontWeight="700"
        letterSpacing="0.06em" fill={C.label}>
        {label}
      </text>
      {showSub && (
        <>
          <text x={cx} y={startY + lineH} textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize={subSize} fill={C.labelSub} letterSpacing="0.03em">
            {dims}
          </text>
          <text x={cx} y={startY + lineH + subSize * 1.6} textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize={subSize} fill={C.labelSub} letterSpacing="0.03em">
            {area}
          </text>
        </>
      )}
    </g>
  );
}

// ─── Sheet presentation components ───────────────────────────────────────────

function DimensionLines({ pw, pd, ox, oy }: {
  pw: number; pd: number; ox: number; oy: number;
}) {
  const off = DIM_GAP;
  const t   = TICK;
  const tick45 = (x: number, y: number, key: string) => (
    <line key={key}
      x1={x - t} y1={y + t} x2={x + t} y2={y - t}
      stroke={C.dimLine} strokeWidth="1.1" />
  );
  const ext  = { stroke: C.dimLine, strokeWidth: "0.45" as const, strokeDasharray: "3 3" as const };
  const main = { stroke: C.dimLine, strokeWidth: "0.7" as const };
  const txt  = {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "9" as const, fontWeight: "600" as const,
    fill: C.dimText, letterSpacing: "0.05em" as const,
  };
  return (
    <g fill="none">
      <line x1={ox}      y1={oy}       x2={ox}      y2={oy - off}      {...ext} />
      <line x1={ox + pw} y1={oy}       x2={ox + pw} y2={oy - off}      {...ext} />
      <line x1={ox}      y1={oy + pd}  x2={ox}      y2={oy + pd + off} {...ext} />
      <line x1={ox + pw} y1={oy + pd}  x2={ox + pw} y2={oy + pd + off} {...ext} />
      <line x1={ox}      y1={oy}       x2={ox - off}      y2={oy}      {...ext} />
      <line x1={ox}      y1={oy + pd}  x2={ox - off}      y2={oy + pd} {...ext} />
      <line x1={ox + pw} y1={oy}       x2={ox + pw + off} y2={oy}      {...ext} />
      <line x1={ox + pw} y1={oy + pd}  x2={ox + pw + off} y2={oy + pd} {...ext} />
      <line x1={ox} y1={oy - off}      x2={ox + pw} y2={oy - off}      {...main} />
      <line x1={ox} y1={oy + pd + off} x2={ox + pw} y2={oy + pd + off} {...main} />
      <line x1={ox - off} y1={oy}      x2={ox - off} y2={oy + pd}      {...main} />
      <line x1={ox + pw + off} y1={oy} x2={ox + pw + off} y2={oy + pd} {...main} />
      {tick45(ox,           oy - off,      "t1")}
      {tick45(ox + pw,      oy - off,      "t2")}
      {tick45(ox,           oy + pd + off, "t3")}
      {tick45(ox + pw,      oy + pd + off, "t4")}
      {tick45(ox - off,     oy,            "t5")}
      {tick45(ox - off,     oy + pd,       "t6")}
      {tick45(ox + pw + off, oy,           "t7")}
      {tick45(ox + pw + off, oy + pd,      "t8")}
      <text x={ox + pw / 2} y={oy - off - 8}       textAnchor="middle" {...txt}>{fmtFt(pw / S)}</text>
      <text x={ox + pw / 2} y={oy + pd + off + 16}  textAnchor="middle" {...txt}>{fmtFt(pw / S)}</text>
      <text x={0} y={0} transform={`translate(${ox - off - 9},${oy + pd / 2}) rotate(-90)`}
        textAnchor="middle" {...txt}>{fmtFt(pd / S)}</text>
      <text x={0} y={0} transform={`translate(${ox + pw + off + 9},${oy + pd / 2}) rotate(90)`}
        textAnchor="middle" {...txt}>{fmtFt(pd / S)}</text>
    </g>
  );
}

function NorthArrow({ x, y }: { x: number; y: number }) {
  const r = 18;
  return (
    <g transform={`translate(${x},${y})`} fontFamily="Arial, Helvetica, sans-serif">
      <circle cx="0" cy="0" r={r} fill="none" stroke={C.accent} strokeWidth="0.8" />
      <circle cx="0" cy="0" r={1.6} fill={C.accent} />
      <polygon points={`0,${-r + 3} 5,2 0,0`}    fill={C.accent} />
      <polygon points={`0,${r - 3}  -5,-2 0,0`}   fill="none" stroke={C.accent} strokeWidth="0.8" />
      <text x="0" y={-r - 7} textAnchor="middle"
        fontSize="11" fontWeight="800" fill={C.accent} letterSpacing="0.16em">N</text>
      <text x="0" y={r + 14} textAnchor="middle"
        fontSize="6.5" fontWeight="500" fill={C.sub} letterSpacing="0.14em">NORTH</text>
    </g>
  );
}

function ScaleBar({ x, y }: { x: number; y: number }) {
  const barM  = 5;
  const barPx = barM * S;
  const segs  = 5;
  const segW  = barPx / segs;
  const ratio = Math.round(1 / (S / 1000) * 25.4);
  return (
    <g transform={`translate(${x},${y})`} fontFamily="Arial, Helvetica, sans-serif">
      <text x={0} y={-6} fontSize="7" fontWeight="600" fill={C.sub} letterSpacing="0.10em">
        SCALE  1 : {ratio}
      </text>
      {Array.from({ length: segs }).map((_, i) => (
        <rect key={i} x={i * segW} y={0} width={segW} height={5}
          fill={i % 2 === 0 ? C.scaleBar : "white"}
          stroke={C.scaleBar} strokeWidth="0.5" />
      ))}
      <text x={0}         y={15} textAnchor="middle" fontSize="6.5" fill={C.sub}>0</text>
      <text x={barPx / 2} y={15} textAnchor="middle" fontSize="6.5" fill={C.sub}>{fmtFt(barM / 2)}</text>
      <text x={barPx}     y={15} textAnchor="middle" fontSize="6.5" fill={C.sub}>{fmtFt(barM)}</text>
    </g>
  );
}

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
  const date = new Date().toLocaleDateString("en-US",
    { month: "long", day: "2-digit", year: "numeric" });
  const ratio = Math.round(1 / (S / 1000) * 25.4);

  const y0  = svgH - TITLE_H;
  const lp  = 20;
  const tp  = 22;
  const c1x = SHEET_PAD + 2;
  const c2x = svgW * 0.40;
  const c3x = svgW * 0.62;
  const c4x = svgW * 0.80;
  const SAN = "Arial, Helvetica, sans-serif";

  return (
    <g fontFamily={SAN}>
      <rect x={SHEET_PAD + 2} y={y0} width={svgW - SHEET_PAD * 2 - 4} height={TITLE_H - SHEET_PAD - 2}
        fill={C.paper} />
      <line x1={SHEET_PAD + 2} y1={y0}     x2={svgW - SHEET_PAD - 2} y2={y0}
        stroke={C.accent} strokeWidth="2" />
      <line x1={SHEET_PAD + 2} y1={y0 + 4} x2={svgW - SHEET_PAD - 2} y2={y0 + 4}
        stroke={C.separator} strokeWidth="0.5" />
      <line x1={c2x} y1={y0 + 8} x2={c2x} y2={svgH - SHEET_PAD - 4}
        stroke={C.separator} strokeWidth="0.7" />
      <line x1={c3x} y1={y0 + 8} x2={c3x} y2={svgH - SHEET_PAD - 4}
        stroke={C.separator} strokeWidth="0.7" />
      <line x1={c4x} y1={y0 + 8} x2={c4x} y2={svgH - SHEET_PAD - 4}
        stroke={C.separator} strokeWidth="0.7" />
      <text x={c1x + lp} y={y0 + tp} fontSize="6.5" fontWeight="600"
        fill={C.sub} letterSpacing="0.18em">ARCHITECTURAL FLOOR PLAN</text>
      <text x={c1x + lp} y={y0 + tp + 26} fontSize="17" fontWeight="700"
        fill={C.accent} letterSpacing="0.04em">{floorName(floor)}</text>
      <text x={c1x + lp} y={y0 + tp + 44} fontSize="8" fill={C.sub} letterSpacing="0.02em">
        {bedrooms} Bedrooms  ·  {bathrooms} Bathrooms  ·  Floor {floor + 1} of {numFloors}
      </text>
      <line x1={c1x + lp} y1={y0 + tp + 52} x2={c2x - lp} y2={y0 + tp + 52}
        stroke={C.separator} strokeWidth="0.5" />
      <text x={c1x + lp} y={y0 + tp + 66} fontSize="7.5" fill={C.sub}>{date}</text>

      <text x={c2x + lp} y={y0 + tp} fontSize="6.5" fontWeight="600"
        fill={C.sub} letterSpacing="0.18em">PLOT DIMENSIONS</text>
      <text x={c2x + lp} y={y0 + tp + 28} fontSize="20" fontWeight="700" fill={C.accent}>
        {pw}′ × {pd}′
      </text>
      <text x={c2x + lp} y={y0 + tp + 46} fontSize="8" fill={C.sub}>
        {plotWidth.toFixed(2)} m × {plotDepth.toFixed(2)} m
      </text>
      <text x={c2x + lp} y={y0 + tp + 62} fontSize="8" fill={C.sub}>
        Plot area: {pa.toLocaleString()} sq ft
      </text>

      <text x={c3x + lp} y={y0 + tp} fontSize="6.5" fontWeight="600"
        fill={C.sub} letterSpacing="0.18em">DRAWING SCALE</text>
      <text x={c3x + lp} y={y0 + tp + 28} fontSize="20" fontWeight="700" fill={C.accent}>
        1 : {ratio}
      </text>
      <text x={c3x + lp} y={y0 + tp + 46} fontSize="8" fill={C.sub}>Units: Feet / Sq Ft</text>
      <text x={c3x + lp} y={y0 + tp + 62} fontSize="7.5" fill={C.sub} fontStyle="italic">
        For reference only
      </text>

      <text x={c4x + lp} y={y0 + tp} fontSize="6.5" fontWeight="600"
        fill={C.sub} letterSpacing="0.18em">DRAWING INFO</text>
      <text x={c4x + lp} y={y0 + tp + 22} fontSize="8.5" fill={C.sub}>Bedrooms</text>
      <text x={c4x + lp} y={y0 + tp + 34} fontSize="14" fontWeight="700" fill={C.accent}>
        {bedrooms}
      </text>
      <text x={c4x + lp} y={y0 + tp + 50} fontSize="8.5" fill={C.sub}>Bathrooms</text>
      <text x={c4x + lp} y={y0 + tp + 62} fontSize="14" fontWeight="700" fill={C.accent}>
        {bathrooms}
      </text>
    </g>
  );
}

function SheetBorder({ svgW, svgH }: { svgW: number; svgH: number }) {
  const p = SHEET_PAD;
  const g = 5;
  return (
    <>
      <rect x={p} y={p} width={svgW - p * 2} height={svgH - p * 2}
        fill="none" stroke={C.accent} strokeWidth="2" />
      <rect x={p + g} y={p + g} width={svgW - (p + g) * 2} height={svgH - (p + g) * 2}
        fill="none" stroke={C.separator} strokeWidth="0.5" />
      {([[p, p], [svgW - p, p], [p, svgH - p], [svgW - p, svgH - p]] as [number,number][]).map(([cx, cy], i) => (
        <g key={i}>
          <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} stroke={C.sub} strokeWidth="0.5" />
          <line x1={cx} y1={cy - 12} x2={cx} y2={cy + 12} stroke={C.sub} strokeWidth="0.5" />
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
          <marker id="stairArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.stairLine} />
          </marker>
          {/* Plot inner vignette — depth and warmth */}
          <radialGradient id="plot-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="55%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(20,14,8,0.07)" />
          </radialGradient>
          {openRooms.map(r => (
            <clipPath key={r.id} id={`bclip-${r.id}`}>
              <rect x={OX + px(r.x)} y={OY + px(r.y)} width={px(r.width)} height={px(r.depth)} />
            </clipPath>
          ))}
        </defs>

        {/* ① Paper */}
        <rect x={0} y={0} width={svgW} height={svgH} fill={C.paper} />

        {/* ② Plot background */}
        <rect x={OX} y={OY} width={pw} height={pd} fill={C.plotBg} />

        {/* ③ Faint metre grid */}
        {Array.from({ length: Math.ceil(plotWidth) + 1 }).map((_, i) => (
          <line key={`gx${i}`}
            x1={OX + i * S} y1={OY} x2={OX + i * S} y2={OY + pd}
            stroke="rgba(0,0,0,0.035)" strokeWidth="0.4" />
        ))}
        {Array.from({ length: Math.ceil(plotDepth) + 1 }).map((_, i) => (
          <line key={`gy${i}`}
            x1={OX} y1={OY + i * S} x2={OX + pw} y2={OY + i * S}
            stroke="rgba(0,0,0,0.035)" strokeWidth="0.4" />
        ))}

        {/* ④ Room base colours */}
        {rooms.map(r => (
          <rect key={`base-${r.id}`}
            x={OX + px(r.x)} y={OY + px(r.y)}
            width={px(r.width)} height={px(r.depth)}
            fill={ROOM_BASE[r.type] ?? "#F4F1EC"}
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

        {/* ⑥ Plot vignette — subtle inner shadow for depth */}
        <rect x={OX} y={OY} width={pw} height={pd} fill="url(#plot-vignette)" />

        {/* ⑦ Furniture */}
        {rooms.map(r => (
          <RoomFurniture key={`furn-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑧ Plot outer boundary */}
        <rect x={OX} y={OY} width={pw} height={pd}
          fill="none" stroke={C.border} strokeWidth="2.5" />

        {/* ⑨ Walls — exterior (thick dark charcoal) then interior (thinner) */}
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
        <ScaleBar x={OX} y={OY + pd + DIM_GAP + 28} />

        {/* ⑰ Title block */}
        <TitleBlock
          svgW={svgW} svgH={svgH}
          plotWidth={plotWidth} plotDepth={plotDepth}
          floor={floor} numFloors={numFloors}
          bedrooms={bedrooms} bathrooms={bathrooms}
        />

        {/* ⑱ Sheet border — on top of everything */}
        <SheetBorder svgW={svgW} svgH={svgH} />
      </svg>
    );
  }
);

export default FloorPlanSVG;
