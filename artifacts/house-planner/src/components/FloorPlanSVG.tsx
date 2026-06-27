import React, { forwardRef, useMemo } from "react";
import type {
  LayoutOutput, Room, Wall, Door,
  Window as WinType, Stair, FacingDirection,
} from "@/lib/layoutEngine";

// ─── Drawing constants ────────────────────────────────────────────────────────
export const BASE_SCALE = 40;  // px per metre (base coordinate system)
const MARGIN     = 90;         // px: space for dimension lines around plot
const TITLE_H    = 72;         // px: title block height
const DIM_OFFSET = 36;         // px: distance of dim line from plot edge
const DIM_TICK   = 9;          // px: half-tick length on dimension lines
const COMPASS_R  = 28;         // px: compass radius

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const M_TO_FT    = 3.28084;
const M2_TO_SQFT = 10.7639;
const fmtFt  = (m: number)  => `${Math.round(m * M_TO_FT)} ft`;
const fmtSqft = (m2: number) => `${Math.round(m2 * M2_TO_SQFT)} sq ft`;

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
  paper:       "#F8F5EF",
  plotBg:      "#EFEBE3",
  gridLine:    "rgba(100,90,70,0.06)",
  extWall:     "#1E1A16",
  intWall:     "#4A4038",
  dimLine:     "#8A7A68",
  dimText:     "#6A5A48",
  doorLeaf:    "#7A4A20",
  doorArc:     "#9A6030",
  doorArcFill: "rgba(160,90,40,0.06)",
  winFrame:    "#4478A0",
  winGlass:    "rgba(140,200,240,0.40)",
  stairLine:   "#6A5848",
  stairAlt:    "rgba(100,80,60,0.08)",
  stairFill:   "rgba(200,185,158,0.12)",
  compass:     "#3A3028",
  compassN:    "#B02818",
  border:      "#C4B090",
  labelBg:     "rgba(255,252,245,0.95)",
  labelText:   "#1A1410",
  areaText:    "#6A5A48",
  setback:     "rgba(80,140,60,0.22)",
  setbackFill: "rgba(80,140,60,0.04)",
  titleBg:     "#EDE8DF",
  titleBorder: "#C4B090",
  titleText:   "#2A2218",
  titleSub:    "#7A6A58",
  scaleBar:    "#4A3A28",
  parking:     "rgba(150,155,140,0.20)",
};

const ROOM_FILLS: Record<string, string> = {
  living:         "rgba(252,238,202,0.88)",
  dining:         "rgba(230,248,210,0.88)",
  kitchen:        "rgba(255,242,168,0.88)",
  master_bedroom: "rgba(226,212,248,0.88)",
  bedroom:        "rgba(212,224,250,0.88)",
  bathroom:       "rgba(188,236,250,0.88)",
  toilet:         "rgba(188,236,250,0.85)",
  balcony:        "rgba(184,224,192,0.82)",
  parking:        "rgba(182,186,168,0.80)",
  staircase:      "rgba(235,218,188,0.85)",
  foyer:          "rgba(255,245,215,0.88)",
  pooja:          "rgba(255,228,185,0.90)",
  utility:        "rgba(215,210,195,0.80)",
  passage:        "rgba(245,238,218,0.82)",
  terrace:        "rgba(190,215,185,0.78)",
};

const ROOM_LABELS: Record<string, string> = {
  living: "LIVING", dining: "DINING", kitchen: "KITCHEN",
  master_bedroom: "MASTER BED", bedroom: "BEDROOM",
  bathroom: "BATH", toilet: "W.C.", balcony: "BALCONY",
  parking: "PARKING", staircase: "STAIR", foyer: "FOYER",
  pooja: "POOJA", utility: "UTILITY", passage: "PASSAGE", terrace: "TERRACE",
};

// ─── Floor name helper ────────────────────────────────────────────────────────
export function floorName(f: number) {
  if (f === 0) return "GROUND FLOOR";
  if (f === 1) return "FIRST FLOOR";
  if (f === 2) return "SECOND FLOOR";
  return `FLOOR ${f + 1}`;
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────
const S = BASE_SCALE;
const px = (m: number) => m * S;

function isHorizontalWall(wall: Wall) {
  return Math.abs(wall.y2 - wall.y1) < 0.01;
}

/** Break a wall into drawn segments (gaps = doors + windows) */
function wallSegments(
  wall: Wall,
  doors: Door[],
  windows: WinType[],
): Array<[number, number, number, number]> {
  const isH = isHorizontalWall(wall);
  const len  = wall.length;
  type Gap = { t0: number; t1: number };
  const gaps: Gap[] = [];
  for (const d of doors) {
    if (d.wallId !== wall.id) continue;
    const dc = isH ? (d.x - wall.x1) : (d.y - wall.y1);
    const hw = d.width / 2;
    gaps.push({ t0: (dc - hw) / len, t1: (dc + hw) / len });
  }
  for (const w of windows) {
    if (w.wallId !== wall.id) continue;
    const wc = isH ? (w.x - wall.x1) : (w.y - wall.y1);
    const hw = w.width / 2;
    gaps.push({ t0: (wc - hw) / len, t1: (wc + hw) / len });
  }
  gaps.sort((a, b) => a.t0 - b.t0);
  const segs: Array<[number, number, number, number]> = [];
  let t = 0;
  for (const g of gaps) {
    const t0 = Math.max(0, g.t0);
    const t1 = Math.min(1, g.t1);
    if (t0 > t + 0.001) {
      segs.push([
        wall.x1 + (wall.x2 - wall.x1) * t,
        wall.y1 + (wall.y2 - wall.y1) * t,
        wall.x1 + (wall.x2 - wall.x1) * t0,
        wall.y1 + (wall.y2 - wall.y1) * t0,
      ]);
    }
    t = t1;
  }
  if (t < 0.999) {
    segs.push([
      wall.x1 + (wall.x2 - wall.x1) * t,
      wall.y1 + (wall.y2 - wall.y1) * t,
      wall.x2, wall.y2,
    ]);
  }
  return segs;
}

// ─── SVG sub-components ───────────────────────────────────────────────────────

function RoomFill({ room, ox, oy }: { room: Room; ox: number; oy: number }) {
  const x  = ox + px(room.x);
  const y  = oy + px(room.y);
  const rw = px(room.width);
  const rh = px(room.depth);
  const fill = ROOM_FILLS[room.type] ?? "rgba(220,215,200,0.80)";
  return <rect x={x} y={y} width={rw} height={rh} fill={fill} />;
}

function RoomLabel({ room, ox, oy }: { room: Room; ox: number; oy: number }) {
  const cx = ox + px(room.x) + px(room.width) / 2;
  const cy = oy + px(room.y) + px(room.depth) / 2;
  const label = ROOM_LABELS[room.type] ?? room.type.toUpperCase();
  const area  = fmtSqft(room.area);
  return (
    <g>
      <text
        x={cx} y={cy - 3}
        textAnchor="middle"
        fontFamily="'Courier New', 'Courier', monospace"
        fontSize={Math.min(10, px(room.width) / label.length * 1.6)}
        fontWeight="700"
        letterSpacing="0.06em"
        fill={C.labelText}
      >
        {label}
      </text>
      <text
        x={cx} y={cy + 11}
        textAnchor="middle"
        fontFamily="'Courier New', 'Courier', monospace"
        fontSize={Math.min(8, px(room.width) / area.length * 1.3)}
        fill={C.areaText}
      >
        {area}
      </text>
    </g>
  );
}

function WallLines({ wall, doors, windows, ox, oy }: {
  wall: Wall; doors: Door[]; windows: WinType[]; ox: number; oy: number;
}) {
  const segs = wallSegments(wall, doors, windows);
  const sw   = Math.max(2, px(wall.thickness));
  const col  = wall.type === "external" ? C.extWall : C.intWall;
  return (
    <>
      {segs.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={ox + px(x1)} y1={oy + px(y1)}
          x2={ox + px(x2)} y2={oy + px(y2)}
          stroke={col}
          strokeWidth={sw}
          strokeLinecap="square"
        />
      ))}
    </>
  );
}

function DoorSymbol({ door, wall, ox, oy }: {
  door: Door; wall: Wall | undefined; ox: number; oy: number;
}) {
  if (!wall) return null;
  const isH = isHorizontalWall(wall);
  const cx  = ox + px(door.x);
  const cy  = oy + px(door.y);
  const dw  = px(door.width);

  if (isH) {
    // Hinge at left end, swing south
    const hx = cx - dw / 2, hy = cy;
    return (
      <g>
        <path
          d={`M ${cx + dw / 2},${hy} A ${dw},${dw} 0 0,0 ${hx},${hy + dw}`}
          fill={C.doorArcFill}
          stroke={C.doorArc}
          strokeWidth="0.8"
          strokeDasharray="3 2"
        />
        <line x1={hx} y1={hy} x2={hx} y2={hy + dw}
          stroke={C.doorLeaf} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  } else {
    // Hinge at top end, swing east
    const hx = cx, hy = cy - dw / 2;
    return (
      <g>
        <path
          d={`M ${hx},${cy + dw / 2} A ${dw},${dw} 0 0,1 ${hx + dw},${hy}`}
          fill={C.doorArcFill}
          stroke={C.doorArc}
          strokeWidth="0.8"
          strokeDasharray="3 2"
        />
        <line x1={hx} y1={hy} x2={hx + dw} y2={hy}
          stroke={C.doorLeaf} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
}

function WindowSymbol({ win, wall, ox, oy }: {
  win: WinType; wall: Wall | undefined; ox: number; oy: number;
}) {
  if (!wall) return null;
  const isH   = isHorizontalWall(wall);
  const cx    = ox + px(win.x);
  const cy    = oy + px(win.y);
  const ww    = px(win.width);
  const depth = win.type === "ventilator" ? 4 : 8;

  if (isH) {
    return (
      <g>
        <rect x={cx - ww / 2} y={cy - depth / 2} width={ww} height={depth}
          fill={C.winGlass} stroke={C.winFrame} strokeWidth="0.7" />
        <line x1={cx - ww / 2} y1={cy} x2={cx + ww / 2} y2={cy}
          stroke={C.winFrame} strokeWidth="0.8" />
        <line x1={cx - ww / 4} y1={cy - depth / 2} x2={cx - ww / 4} y2={cy + depth / 2}
          stroke={C.winFrame} strokeWidth="0.5" />
        <line x1={cx + ww / 4} y1={cy - depth / 2} x2={cx + ww / 4} y2={cy + depth / 2}
          stroke={C.winFrame} strokeWidth="0.5" />
      </g>
    );
  } else {
    return (
      <g>
        <rect x={cx - depth / 2} y={cy - ww / 2} width={depth} height={ww}
          fill={C.winGlass} stroke={C.winFrame} strokeWidth="0.7" />
        <line x1={cx} y1={cy - ww / 2} x2={cx} y2={cy + ww / 2}
          stroke={C.winFrame} strokeWidth="0.8" />
        <line x1={cx - depth / 2} y1={cy - ww / 4} x2={cx + depth / 2} y2={cy - ww / 4}
          stroke={C.winFrame} strokeWidth="0.5" />
        <line x1={cx - depth / 2} y1={cy + ww / 4} x2={cx + depth / 2} y2={cy + ww / 4}
          stroke={C.winFrame} strokeWidth="0.5" />
      </g>
    );
  }
}

function StairSymbol({ stair, ox, oy }: { stair: Stair; ox: number; oy: number }) {
  const x  = ox + px(stair.x);
  const y  = oy + px(stair.y);
  const rw = px(stair.width);
  const rh = px(stair.depth);
  const n  = Math.min(stair.steps, 14);
  const isW = stair.width > stair.depth;
  const treads = Array.from({ length: n });

  return (
    <g>
      {treads.map((_, i) => {
        if (isW) {
          const tw = rw / n;
          return (
            <rect key={i}
              x={x + i * tw} y={y}
              width={tw} height={rh}
              fill={i % 2 === 0 ? C.stairFill : C.stairAlt}
              stroke={C.stairLine} strokeWidth="0.6"
            />
          );
        } else {
          const th = rh / n;
          return (
            <rect key={i}
              x={x} y={y + i * th}
              width={rw} height={th}
              fill={i % 2 === 0 ? C.stairFill : C.stairAlt}
              stroke={C.stairLine} strokeWidth="0.6"
            />
          );
        }
      })}
      {/* Arrow */}
      <text
        x={x + rw / 2} y={y + rh / 2 + 4}
        textAnchor="middle"
        fontFamily="'Courier New', monospace"
        fontSize="9"
        fill={C.stairLine}
        fontWeight="700"
      >
        {stair.fromFloor === 0 ? "▲ UP" : "▼ DN"}
      </text>
    </g>
  );
}

function ParkingSymbol({ room, ox, oy }: { room: Room; ox: number; oy: number }) {
  const x  = ox + px(room.x);
  const y  = oy + px(room.y);
  const rw = px(room.width);
  const rh = px(room.depth);
  const m  = 8;
  const bw = Math.min(px(1.8), rw - m * 2);
  const bh = Math.min(px(4.2), rh - m * 2);
  const bx = x + (rw - bw) / 2;
  const by = y + (rh - bh) / 2;
  return (
    <g>
      <rect x={bx} y={by} width={bw} height={bh} rx="4"
        fill={C.parking} stroke={C.stairLine} strokeWidth="0.8" />
      <line x1={bx + bw * 0.25} y1={by + 3} x2={bx + bw * 0.25} y2={by + bh - 3}
        stroke={C.stairLine} strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1={bx + bw * 0.75} y1={by + 3} x2={bx + bw * 0.75} y2={by + bh - 3}
        stroke={C.stairLine} strokeWidth="0.5" strokeDasharray="3 3" />
      <text x={x + rw / 2} y={y + rh - m}
        textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="10" fill={C.stairLine} fontWeight="700">P</text>
    </g>
  );
}

function BalconyHatch({ room, ox, oy }: { room: Room; ox: number; oy: number }) {
  const x  = ox + px(room.x);
  const y  = oy + px(room.y);
  const rw = px(room.width);
  const rh = px(room.depth);
  const sp = 10;
  const lines = [];
  for (let d = -rh; d < rw; d += sp) {
    const x1 = Math.max(0, d);
    const y1 = Math.max(0, -d);
    const x2 = Math.min(rw, d + rh);
    const y2 = Math.min(rh, -d + rw);
    lines.push(<line key={d}
      x1={x + x1} y1={y + y1} x2={x + x2} y2={y + y2}
      stroke="rgba(80,140,60,0.18)" strokeWidth="0.8"
    />);
  }
  return <g clipPath={`url(#clip-${room.id})`}>{lines}</g>;
}

function NorthCompass({ x, y }: { x: number; y: number }) {
  const r = COMPASS_R;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r + 6} fill="rgba(30,26,20,0.88)" stroke={C.border} strokeWidth="1" />
      <circle r={r + 3} fill="none" stroke={C.compass} strokeWidth="0.4" />
      {/* N arrow (filled red) */}
      <polygon points={`0,${-r} 6,2 0,-4 -6,2`} fill={C.compassN} stroke={C.compassN} strokeWidth="0.3" />
      {/* S arrow (dark) */}
      <polygon points={`0,${r} 6,-2 0,4 -6,-2`} fill={C.compass} stroke={C.compass} strokeWidth="0.3" />
      {/* E/W ticks */}
      <line x1={-r + 4} y1="0" x2={r - 4} y2="0" stroke={C.compass} strokeWidth="0.5" />
      <line x1="0" y1={-r + 4} x2="0" y2={r - 4} stroke={C.compass} strokeWidth="0.5" />
      {/* Cardinal labels */}
      <text x="0" y={-r - 8} textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="11" fontWeight="800" fill={C.compassN}>N</text>
      <text x="0" y={r + 14} textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="9" fill={C.compass}>S</text>
      <text x={r + 9} y="3" textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="9" fill={C.compass}>E</text>
      <text x={-r - 9} y="3" textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="9" fill={C.compass}>W</text>
    </g>
  );
}

function DimensionLines({ plotWidth, plotDepth, ox, oy }: {
  plotWidth: number; plotDepth: number; ox: number; oy: number;
}) {
  const pw  = px(plotWidth);
  const pd  = px(plotDepth);
  const off = DIM_OFFSET;
  const tk  = DIM_TICK;

  return (
    <g stroke={C.dimLine} fill="none">
      {/* Top: width */}
      <line x1={ox} y1={oy - off} x2={ox + pw} y2={oy - off} strokeWidth="0.9" />
      <line x1={ox} y1={oy - off - tk} x2={ox} y2={oy - off + tk} strokeWidth="0.9" />
      <line x1={ox + pw} y1={oy - off - tk} x2={ox + pw} y2={oy - off + tk} strokeWidth="0.9" />
      <text x={ox + pw / 2} y={oy - off - 5}
        textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="10" fontWeight="700" fill={C.dimText}>
        {fmtFt(plotWidth)}
      </text>

      {/* Bottom: width */}
      <line x1={ox} y1={oy + pd + off} x2={ox + pw} y2={oy + pd + off} strokeWidth="0.9" />
      <line x1={ox} y1={oy + pd + off - tk} x2={ox} y2={oy + pd + off + tk} strokeWidth="0.9" />
      <line x1={ox + pw} y1={oy + pd + off - tk} x2={ox + pw} y2={oy + pd + off + tk} strokeWidth="0.9" />
      <text x={ox + pw / 2} y={oy + pd + off + 14}
        textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="10" fontWeight="700" fill={C.dimText}>
        {fmtFt(plotWidth)}
      </text>

      {/* Left: depth */}
      <line x1={ox - off} y1={oy} x2={ox - off} y2={oy + pd} strokeWidth="0.9" />
      <line x1={ox - off - tk} y1={oy} x2={ox - off + tk} y2={oy} strokeWidth="0.9" />
      <line x1={ox - off - tk} y1={oy + pd} x2={ox - off + tk} y2={oy + pd} strokeWidth="0.9" />
      <text
        x={0} y={0}
        transform={`translate(${ox - off - 14},${oy + pd / 2}) rotate(-90)`}
        textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="10" fontWeight="700" fill={C.dimText}>
        {fmtFt(plotDepth)}
      </text>

      {/* Right: depth */}
      <line x1={ox + pw + off} y1={oy} x2={ox + pw + off} y2={oy + pd} strokeWidth="0.9" />
      <line x1={ox + pw + off - tk} y1={oy} x2={ox + pw + off + tk} y2={oy} strokeWidth="0.9" />
      <line x1={ox + pw + off - tk} y1={oy + pd} x2={ox + pw + off + tk} y2={oy + pd} strokeWidth="0.9" />
      <text
        x={0} y={0}
        transform={`translate(${ox + pw + off + 16},${oy + pd / 2}) rotate(90)`}
        textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="10" fontWeight="700" fill={C.dimText}>
        {fmtFt(plotDepth)}
      </text>
    </g>
  );
}

function SetbackLayer({ plotWidth, plotDepth, facing, ox, oy }: {
  plotWidth: number; plotDepth: number; facing: FacingDirection; ox: number; oy: number;
}) {
  const pw   = px(plotWidth);
  const pd   = px(plotDepth);
  const front = px(1.5);
  const side  = px(0.9);
  const back  = px(0.6);

  // Front strip based on facing
  const strips: Array<{ x: number; y: number; w: number; h: number }> = [];
  if (facing === "N") strips.push({ x: 0,           y: 0,        w: pw,  h: front });
  if (facing === "S") strips.push({ x: 0,           y: pd-front, w: pw,  h: front });
  if (facing === "E") strips.push({ x: pw-front,    y: 0,        w: front, h: pd  });
  if (facing === "W") strips.push({ x: 0,           y: 0,        w: front, h: pd  });
  // Side strips
  strips.push({ x: 0, y: 0, w: side, h: pd });
  strips.push({ x: pw-side, y: 0, w: side, h: pd });
  // Back strip
  if (facing === "N") strips.push({ x: 0, y: pd-back, w: pw, h: back });
  if (facing === "S") strips.push({ x: 0, y: 0,       w: pw, h: back });
  if (facing === "E") strips.push({ x: 0, y: 0,       w: back, h: pd });
  if (facing === "W") strips.push({ x: pw-back, y: 0, w: back, h: pd });

  return (
    <g opacity="0.7">
      {strips.map((s, i) => (
        <rect key={i}
          x={ox + s.x} y={oy + s.y} width={s.w} height={s.h}
          fill={C.setbackFill} stroke={C.setback}
          strokeWidth="0.6" strokeDasharray="5 4"
        />
      ))}
    </g>
  );
}

function ScaleBar({ x, y, scale }: { x: number; y: number; scale: number }) {
  // Show a 5-metre scale bar
  const barM  = 5;
  const barPx = barM * scale;
  const ticks = [0, 1, 2, 3, 4, 5];
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={-4} fontFamily="'Courier New', monospace" fontSize="7.5"
        fill={C.scaleBar} letterSpacing="0.05em">SCALE 1:{Math.round(1000 / scale * 25.4 / 25.4)}</text>
      {ticks.map((t, i) => (
        <rect key={t}
          x={t * (barPx / barM)} y={0}
          width={barPx / barM} height={6}
          fill={i % 2 === 0 ? C.scaleBar : "white"}
          stroke={C.scaleBar} strokeWidth="0.5"
        />
      ))}
      <text x={0} y={16} fontFamily="'Courier New', monospace" fontSize="7" fill={C.scaleBar}>0</text>
      <text x={barPx / 2} y={16} textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="7" fill={C.scaleBar}>{fmtFt(barM / 2)}</text>
      <text x={barPx} y={16} textAnchor="middle" fontFamily="'Courier New', monospace"
        fontSize="7" fill={C.scaleBar}>{fmtFt(barM)}</text>
    </g>
  );
}

function TitleBlock({ width, plotWidth, plotDepth, floor, floors, title }: {
  width: number; plotWidth: number; plotDepth: number;
  floor: number; floors: number; title: string;
}) {
  const pw = Math.round(plotWidth * M_TO_FT);
  const pd = Math.round(plotDepth * M_TO_FT);
  return (
    <g>
      <rect x={0} y={0} width={width} height={TITLE_H}
        fill={C.titleBg} stroke={C.titleBorder} strokeWidth="1" />
      <line x1={0} y1={TITLE_H} x2={width} y2={TITLE_H} stroke={C.titleBorder} strokeWidth="1.5" />

      {/* Logo / App name */}
      <text x={18} y={24}
        fontFamily="'Courier New', monospace" fontSize="13" fontWeight="800"
        letterSpacing="0.12em" fill={C.titleText}>FLOOR PLAN</text>

      {/* Main title */}
      <text x={18} y={42}
        fontFamily="'Courier New', monospace" fontSize="10.5" fontWeight="600"
        fill={C.titleText}>{title}</text>

      {/* Floor indicator */}
      <text x={18} y={60}
        fontFamily="'Courier New', monospace" fontSize="9" fill={C.titleSub}
        letterSpacing="0.08em">{floorName(floor)} — Floor {floor + 1} of {floors}</text>

      {/* Right block: dimensions */}
      <line x1={width - 180} y1={8} x2={width - 180} y2={TITLE_H - 8}
        stroke={C.titleBorder} strokeWidth="0.8" />

      <text x={width - 170} y={22}
        fontFamily="'Courier New', monospace" fontSize="8" fill={C.titleSub}
        letterSpacing="0.06em">PLOT SIZE</text>
      <text x={width - 170} y={36}
        fontFamily="'Courier New', monospace" fontSize="11" fontWeight="700"
        fill={C.titleText}>{pw}′ × {pd}′</text>
      <text x={width - 170} y={50}
        fontFamily="'Courier New', monospace" fontSize="8.5" fill={C.titleSub}>
        ({plotWidth.toFixed(1)}m × {plotDepth.toFixed(1)}m)
      </text>
      <text x={width - 170} y={63}
        fontFamily="'Courier New', monospace" fontSize="7.5" fill={C.titleSub}>
        {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </text>
    </g>
  );
}

// ─── Main SVG component ───────────────────────────────────────────────────────

export interface FloorPlanSVGProps {
  layout: LayoutOutput;
  floor: number;
  plotWidth: number;
  plotDepth: number;
  facing: FacingDirection;
  title?: string;
}

const FloorPlanSVG = forwardRef<SVGSVGElement, FloorPlanSVGProps>(function FloorPlanSVG(
  { layout, floor, plotWidth, plotDepth, facing, title = "ARCHITECTURAL FLOOR PLAN" },
  ref,
) {
  const scale = BASE_SCALE;
  const pw    = px(plotWidth);
  const pd    = px(plotDepth);

  // SVG canvas dimensions
  const OX     = MARGIN;
  const OY     = TITLE_H + MARGIN;
  const svgW   = MARGIN + pw + MARGIN;
  const svgH   = TITLE_H + MARGIN + pd + MARGIN;

  const rooms   = useMemo(() => layout.rooms.filter(r => r.floor === floor), [layout, floor]);
  const walls   = useMemo(() => layout.walls.filter(w => w.floor === floor), [layout, floor]);
  const doors   = useMemo(() => layout.doors.filter(d => d.floor === floor), [layout, floor]);
  const windows = useMemo(() => layout.windows.filter(w => w.floor === floor), [layout, floor]);
  const stairs  = useMemo(() => layout.stairs.filter(s => s.fromFloor === floor), [layout, floor]);
  const wallMap = useMemo(() => new Map(walls.map(w => [w.id, w])), [walls]);

  // Clip paths for balcony hatch
  const balconies = rooms.filter(r => r.type === "balcony");

  const compassX = OX + pw + MARGIN - COMPASS_R - 10;
  const compassY = OY + pd + MARGIN - COMPASS_R - 12;

  return (
    <svg
      ref={ref}
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      xmlns="http://www.w3.org/2000/svg"
      fontFamily="'Courier New', Courier, monospace"
      style={{ display: "block" }}
    >
      {/* Clip paths */}
      <defs>
        {balconies.map(r => (
          <clipPath key={r.id} id={`clip-${r.id}`}>
            <rect x={OX + px(r.x)} y={OY + px(r.y)} width={px(r.width)} height={px(r.depth)} />
          </clipPath>
        ))}
      </defs>

      {/* Paper background */}
      <rect x={0} y={0} width={svgW} height={svgH} fill={C.paper} />

      {/* Outer border */}
      <rect x={2} y={2} width={svgW - 4} height={svgH - 4}
        fill="none" stroke={C.border} strokeWidth="1.5" />

      {/* Title block */}
      <TitleBlock
        width={svgW}
        plotWidth={plotWidth}
        plotDepth={plotDepth}
        floor={floor}
        floors={layout.stairs.length > 0
          ? Math.max(...layout.rooms.map(r => r.floor)) + 1
          : 1}
        title={title}
      />

      {/* Plot background */}
      <rect x={OX} y={OY} width={pw} height={pd} fill={C.plotBg} />

      {/* Subtle grid */}
      {Array.from({ length: Math.ceil(plotWidth) + 1 }, (_, i) => (
        <line key={`gv${i}`}
          x1={OX + i * scale} y1={OY}
          x2={OX + i * scale} y2={OY + pd}
          stroke={C.gridLine} strokeWidth="0.5"
        />
      ))}
      {Array.from({ length: Math.ceil(plotDepth) + 1 }, (_, i) => (
        <line key={`gh${i}`}
          x1={OX} y1={OY + i * scale}
          x2={OX + pw} y2={OY + i * scale}
          stroke={C.gridLine} strokeWidth="0.5"
        />
      ))}

      {/* Setback guidelines */}
      <SetbackLayer
        plotWidth={plotWidth} plotDepth={plotDepth}
        facing={facing} ox={OX} oy={OY}
      />

      {/* Room fills */}
      {rooms.map(r => <RoomFill key={r.id} room={r} ox={OX} oy={OY} />)}

      {/* Balcony hatch */}
      {balconies.map(r => <BalconyHatch key={`h-${r.id}`} room={r} ox={OX} oy={OY} />)}

      {/* Parking symbol */}
      {rooms.filter(r => r.type === "parking").map(r =>
        <ParkingSymbol key={`p-${r.id}`} room={r} ox={OX} oy={OY} />
      )}

      {/* Stair symbols */}
      {stairs.map(s => <StairSymbol key={s.id} stair={s} ox={OX} oy={OY} />)}

      {/* Window symbols */}
      {windows.map(w => (
        <WindowSymbol key={w.id} win={w} wall={wallMap.get(w.wallId)} ox={OX} oy={OY} />
      ))}

      {/* Door symbols */}
      {doors.map(d => (
        <DoorSymbol key={d.id} door={d} wall={wallMap.get(d.wallId)} ox={OX} oy={OY} />
      ))}

      {/* Walls (drawn last so they appear on top of fills) */}
      {walls.map(w => (
        <WallLines key={w.id} wall={w} doors={doors} windows={windows} ox={OX} oy={OY} />
      ))}

      {/* Plot border */}
      <rect x={OX} y={OY} width={pw} height={pd}
        fill="none" stroke={C.extWall} strokeWidth={Math.max(3, px(0.23))} />

      {/* Room labels */}
      {rooms.map(r => <RoomLabel key={`lbl-${r.id}`} room={r} ox={OX} oy={OY} />)}

      {/* Dimension lines */}
      <DimensionLines
        plotWidth={plotWidth} plotDepth={plotDepth} ox={OX} oy={OY}
      />

      {/* North compass */}
      <NorthCompass x={compassX} y={compassY} />

      {/* Scale bar */}
      <ScaleBar x={OX} y={OY + pd + MARGIN - 22} scale={scale} />
    </svg>
  );
});

export default FloorPlanSVG;
