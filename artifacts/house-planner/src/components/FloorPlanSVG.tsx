import React, { forwardRef, useMemo } from "react";
import type {
  LayoutOutput, Room, Wall, Door,
  Window as WinType, Stair, FacingDirection,
} from "@/lib/layoutEngine";
import { RoomFurniture } from "./FurnitureSymbols";

// ─── Drawing constants ────────────────────────────────────────────────────────
export const BASE_SCALE = 45;   // px per metre
const MARGIN    = 116;          // space around plot for dimension lines
const TITLE_H   = 88;           // title block height
const DIM_GAP   = 48;           // offset of dimension line from plot edge
const TICK      = 9;            // 45° tick arm length
const EXT_T     = 14;           // exterior wall min thickness (px)
const INT_T     = 9;            // interior wall min thickness (px)

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const S          = BASE_SCALE;
const px         = (m: number) => m * S;
const M_TO_FT    = 3.28084;
const M2_TO_SQFT = 10.7639;
const fmtFt      = (m: number) => `${Math.round(m * M_TO_FT)}'`;
const fmtDims    = (w: number, d: number) =>
  `${Math.round(w * M_TO_FT)}′ × ${Math.round(d * M_TO_FT)}′`;
const fmtSqft    = (m2: number) => `${Math.round(m2 * M2_TO_SQFT)} sq ft`;

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  paper:      "#FFFFFF",
  plotBg:     "#FAFAFA",
  wall:       "#0E0E0E",
  border:     "#111111",
  dimLine:    "#777777",
  dimText:    "#444444",
  label:      "#111111",
  labelSub:   "#666666",
  doorLine:   "#111111",
  winFill:    "rgba(190,220,245,0.40)",
  winLine:    "#111111",
  stairFill:  "#EAE6DE",
  stairAlt:   "#D9D3C8",
  stairLine:  "#666666",
  compassRed: "#CC1111",
  scaleBar:   "#111111",
  titleBg:    "#F3F3F1",
  titleLine:  "#111111",
  titleText:  "#111111",
  titleSub:   "#666666",
  hatch:      "rgba(60,110,60,0.22)",
} as const;

// Professional architectural room fills — warm, rich, premium marketing-quality
const ROOM_FILLS: Record<string, string> = {
  living:         "#EDE6D3",   // warm cream
  family_lounge:  "#EDE6D3",   // warm cream (same as living)
  dining:         "#E6DDCA",   // slightly deeper cream
  kitchen:        "#F2ECD8",   // warm light parchment
  master_bedroom: "#F0D9BC",   // warm sandy peach (premium)
  bedroom:        "#EDD8B8",   // sandy peach
  bathroom:       "#C8DFED",   // sky blue
  toilet:         "#C8DFED",   // sky blue
  balcony:        "#D0E8CC",   // soft green terrace
  parking:        "#D2CFC6",   // stone grey paving
  staircase:      "#E2DDD2",   // warm neutral
  foyer:          "#E5DDC8",   // warm entry
  pooja:          "#F5EDD5",   // warm gold
  utility:        "#E5E0D8",   // cool neutral
  passage:        "#EAE5D8",   // warm passage
  front_garden:   "#90C86A",   // bright grass green
  entrance_gate:  "#C5BBAA",   // stone paving
  terrace:        "#D8DDD2",   // light terrace
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

// ─── Components ───────────────────────────────────────────────────────────────

function WallRect({ wall, doors, windows, ox, oy }: {
  wall: Wall; doors: Door[]; windows: WinType[]; ox: number; oy: number;
}) {
  const horiz = isH(wall);
  const T     = Math.max(wall.type === "external" ? EXT_T : INT_T, px(wall.thickness));
  const segs  = wallSegments(wall, doors, windows);

  return (
    <>
      {segs.map(([x1, y1, x2, y2], i) =>
        horiz ? (
          <rect key={i}
            x={ox + px(x1)} y={oy + px(y1) - T / 2}
            width={Math.max(1, px(x2 - x1))} height={T}
            fill={C.wall}
          />
        ) : (
          <rect key={i}
            x={ox + px(x1) - T / 2} y={oy + px(y1)}
            width={T} height={Math.max(1, px(y2 - y1))}
            fill={C.wall}
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
  const cx  = ox + px(door.x);
  const cy  = oy + px(door.y);
  const dw  = px(door.width);

  return horiz ? (
    <g stroke={C.doorLine} fill="none" strokeWidth="1.2">
      <line x1={cx - dw / 2} y1={cy} x2={cx - dw / 2} y2={cy + dw} />
      <path d={`M ${cx + dw / 2},${cy} A ${dw},${dw} 0 0,0 ${cx - dw / 2},${cy + dw}`}
        strokeDasharray="4 2.5" />
    </g>
  ) : (
    <g stroke={C.doorLine} fill="none" strokeWidth="1.2">
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
  const cx    = ox + px(win.x);
  const cy    = oy + px(win.y);
  const ww    = px(win.width);
  const T     = Math.max(wall.type === "external" ? EXT_T : INT_T, px(wall.thickness));
  const h     = T;

  return horiz ? (
    <g>
      <rect x={cx - ww / 2} y={cy - h / 2} width={ww} height={h} fill={C.winFill} />
      <line x1={cx - ww / 2} y1={cy - h / 2} x2={cx + ww / 2} y2={cy - h / 2}
        stroke={C.winLine} strokeWidth="1.5" />
      <line x1={cx - ww / 2} y1={cy} x2={cx + ww / 2} y2={cy}
        stroke={C.winLine} strokeWidth="0.8" />
      <line x1={cx - ww / 2} y1={cy + h / 2} x2={cx + ww / 2} y2={cy + h / 2}
        stroke={C.winLine} strokeWidth="1.5" />
      <line x1={cx - ww / 2} y1={cy - h / 2} x2={cx - ww / 2} y2={cy + h / 2}
        stroke={C.winLine} strokeWidth="1.2" />
      <line x1={cx + ww / 2} y1={cy - h / 2} x2={cx + ww / 2} y2={cy + h / 2}
        stroke={C.winLine} strokeWidth="1.2" />
    </g>
  ) : (
    <g>
      <rect x={cx - h / 2} y={cy - ww / 2} width={h} height={ww} fill={C.winFill} />
      <line x1={cx - h / 2} y1={cy - ww / 2} x2={cx - h / 2} y2={cy + ww / 2}
        stroke={C.winLine} strokeWidth="1.5" />
      <line x1={cx} y1={cy - ww / 2} x2={cx} y2={cy + ww / 2}
        stroke={C.winLine} strokeWidth="0.8" />
      <line x1={cx + h / 2} y1={cy - ww / 2} x2={cx + h / 2} y2={cy + ww / 2}
        stroke={C.winLine} strokeWidth="1.5" />
      <line x1={cx - h / 2} y1={cy - ww / 2} x2={cx + h / 2} y2={cy - ww / 2}
        stroke={C.winLine} strokeWidth="1.2" />
      <line x1={cx - h / 2} y1={cy + ww / 2} x2={cx + h / 2} y2={cy + ww / 2}
        stroke={C.winLine} strokeWidth="1.2" />
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
          <rect key={i}
            x={x + (i * rw) / n} y={y}
            width={rw / n} height={rh}
            fill={i % 2 === 0 ? C.stairFill : C.stairAlt}
            stroke={C.stairLine} strokeWidth="0.5"
          />
        ) : (
          <rect key={i}
            x={x} y={y + (i * rh) / n}
            width={rw} height={rh / n}
            fill={i % 2 === 0 ? C.stairFill : C.stairAlt}
            stroke={C.stairLine} strokeWidth="0.5"
          />
        )
      )}
      <rect x={x} y={y} width={rw} height={rh}
        fill="none" stroke={C.stairLine} strokeWidth="1" />
      {/* Arrow line */}
      {wide ? (
        <line x1={x + 8} y1={y + rh / 2} x2={x + rw - 8} y2={y + rh / 2}
          stroke={C.stairLine} strokeWidth="1" markerEnd="url(#arrowhead)" />
      ) : (
        <line x1={x + rw / 2} y1={y + 8} x2={x + rw / 2} y2={y + rh - 8}
          stroke={C.stairLine} strokeWidth="1" markerEnd="url(#arrowhead)" />
      )}
      <text
        x={x + rw / 2} y={y + rh / 2 + (wide ? -8 : 4)}
        textAnchor="middle" fontSize="7.5"
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="700"
        fill={C.stairLine} letterSpacing="0.06em">
        {stair.fromFloor === 0 ? "UP" : "DN"}
      </text>
    </g>
  );
}

function BalconyHatch({ room, ox, oy }: { room: Room; ox: number; oy: number }) {
  const x  = ox + px(room.x);
  const y  = oy + px(room.y);
  const rw = px(room.width);
  const rh = px(room.depth);
  const sp = 11;
  const lines = [];
  for (let d = 0; d < rw + rh; d += sp) {
    lines.push(
      <line key={d}
        x1={x + Math.min(d, rw)} y1={y + Math.max(0, d - rw)}
        x2={x + Math.max(0, d - rh)} y2={y + Math.min(d, rh)}
        stroke={C.hatch} strokeWidth="0.9"
      />
    );
  }
  return <g clipPath={`url(#bclip-${room.id})`}>{lines}</g>;
}

function RoomLabel({ room, ox, oy }: { room: Room; ox: number; oy: number }) {
  // Skip label for entrance gate — gate bars make it obvious
  if (room.type === "entrance_gate") return null;

  const cx    = ox + px(room.x) + px(room.width) / 2;
  const cy    = oy + px(room.y) + px(room.depth) / 2;
  const label = ROOM_LABELS[room.type] ?? room.type.toUpperCase().replace(/_/g, " ");
  const dims  = fmtDims(room.width, room.depth);
  const area  = fmtSqft(room.area);

  const roomPx   = px(room.width);
  const roomPxH  = px(room.depth);
  const nameSize = Math.min(10, (roomPx * 0.80) / (label.length * 0.58));
  const subSize  = Math.min(7.5, (roomPx * 0.76) / (dims.length * 0.55));
  const showSub  = subSize >= 5.5 && roomPxH >= 32;

  if (nameSize < 4.5 || roomPxH < 20) return null;

  const lineH  = showSub ? nameSize * 1.35 : 0;
  const totalH = nameSize + (showSub ? lineH + subSize * 2.5 : 0);
  const startY = cy - totalH / 2 + nameSize;

  // Background pill — prevents overlap with furniture
  const bgW = Math.min(roomPx * 0.86, label.length * nameSize * 0.62 + 14);
  const bgH = totalH + 8;
  const bgX = cx - bgW / 2;
  const bgY = startY - nameSize - 3;

  return (
    <g>
      {/* White background for legibility over furniture */}
      <rect x={bgX} y={bgY} width={bgW} height={bgH}
        fill="rgba(255,255,255,0.82)" rx="2" />
      <text x={cx} y={startY}
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={nameSize} fontWeight="700"
        letterSpacing="0.04em" fill={C.label}>
        {label}
      </text>
      {showSub && (
        <>
          <text x={cx} y={startY + lineH}
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize={subSize} fill={C.labelSub} letterSpacing="0.02em">
            {dims}
          </text>
          <text x={cx} y={startY + lineH + subSize * 1.6}
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize={subSize} fill={C.labelSub} letterSpacing="0.02em">
            {area}
          </text>
        </>
      )}
    </g>
  );
}

function DimensionLines({ pw, pd, ox, oy }: {
  pw: number; pd: number; ox: number; oy: number;
}) {
  const off  = DIM_GAP;
  const t    = TICK;

  const tick45 = (x: number, y: number, key: string) => (
    <line key={key}
      x1={x - t} y1={y + t} x2={x + t} y2={y - t}
      stroke={C.dimLine} strokeWidth="1.3"
    />
  );

  const extProps = {
    stroke: C.dimLine, strokeWidth: "0.5" as const,
    strokeDasharray: "3.5 3" as const,
  };
  const mainProps = { stroke: C.dimLine, strokeWidth: "0.9" as const };
  const tProps = {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "9.5" as const, fontWeight: "600" as const,
    fill: C.dimText, letterSpacing: "0.04em" as const,
  };

  return (
    <g fill="none">
      {/* Extension lines */}
      <line x1={ox}      y1={oy}       x2={ox}      y2={oy - off}      {...extProps} />
      <line x1={ox + pw} y1={oy}       x2={ox + pw} y2={oy - off}      {...extProps} />
      <line x1={ox}      y1={oy + pd}  x2={ox}      y2={oy + pd + off} {...extProps} />
      <line x1={ox + pw} y1={oy + pd}  x2={ox + pw} y2={oy + pd + off} {...extProps} />
      <line x1={ox}      y1={oy}       x2={ox - off}      y2={oy}      {...extProps} />
      <line x1={ox}      y1={oy + pd}  x2={ox - off}      y2={oy + pd} {...extProps} />
      <line x1={ox + pw} y1={oy}       x2={ox + pw + off} y2={oy}      {...extProps} />
      <line x1={ox + pw} y1={oy + pd}  x2={ox + pw + off} y2={oy + pd} {...extProps} />

      {/* Dimension lines */}
      <line x1={ox} y1={oy - off} x2={ox + pw} y2={oy - off} {...mainProps} />
      <line x1={ox} y1={oy + pd + off} x2={ox + pw} y2={oy + pd + off} {...mainProps} />
      <line x1={ox - off} y1={oy} x2={ox - off} y2={oy + pd} {...mainProps} />
      <line x1={ox + pw + off} y1={oy} x2={ox + pw + off} y2={oy + pd} {...mainProps} />

      {/* Tick marks */}
      {tick45(ox,      oy - off,      "t1")}
      {tick45(ox + pw, oy - off,      "t2")}
      {tick45(ox,      oy + pd + off, "t3")}
      {tick45(ox + pw, oy + pd + off, "t4")}
      {tick45(ox - off, oy,           "t5")}
      {tick45(ox - off, oy + pd,      "t6")}
      {tick45(ox + pw + off, oy,      "t7")}
      {tick45(ox + pw + off, oy + pd, "t8")}

      {/* Top width */}
      <text x={ox + pw / 2} y={oy - off - 7} textAnchor="middle" {...tProps}>
        {fmtFt(pw / S)}
      </text>
      {/* Bottom width */}
      <text x={ox + pw / 2} y={oy + pd + off + 16} textAnchor="middle" {...tProps}>
        {fmtFt(pw / S)}
      </text>
      {/* Left depth */}
      <text x={0} y={0}
        transform={`translate(${ox - off - 8},${oy + pd / 2}) rotate(-90)`}
        textAnchor="middle" {...tProps}>{fmtFt(pd / S)}</text>
      {/* Right depth */}
      <text x={0} y={0}
        transform={`translate(${ox + pw + off + 8},${oy + pd / 2}) rotate(90)`}
        textAnchor="middle" {...tProps}>{fmtFt(pd / S)}</text>
    </g>
  );
}

function NorthArrow({ x, y }: { x: number; y: number }) {
  // Bold "NORTH" text + thick solid downward arrow (matches reference image style)
  const aw = 14, ah = 30, sw = 5;
  return (
    <g transform={`translate(${x},${y})`} fontFamily="Arial, Helvetica, sans-serif">
      <text x="0" y={-ah * 0.5 - 6} textAnchor="middle"
        fontSize="12" fontWeight="900" fill={C.border} letterSpacing="0.12em">NORTH</text>
      {/* Shaft */}
      <line x1="0" y1={-ah * 0.4} x2="0" y2={ah * 0.25}
        stroke={C.border} strokeWidth={sw} strokeLinecap="round" />
      {/* Arrowhead */}
      <polygon points={`0,${ah * 0.58} ${aw * 0.5},${ah * 0.2} ${-aw * 0.5},${ah * 0.2}`}
        fill={C.border} />
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
      <text x={0} y={-5} fontSize="7.5" fontWeight="600" fill={C.scaleBar}
        letterSpacing="0.06em">SCALE  1 : {ratio}</text>
      {Array.from({ length: segs }).map((_, i) => (
        <rect key={i}
          x={i * segW} y={0} width={segW} height={6}
          fill={i % 2 === 0 ? C.scaleBar : "white"}
          stroke={C.scaleBar} strokeWidth="0.6"
        />
      ))}
      <text x={0} y={17} textAnchor="middle" fontSize="7" fill={C.scaleBar}>0</text>
      <text x={barPx / 2} y={17} textAnchor="middle" fontSize="7" fill={C.scaleBar}>
        {fmtFt(barM / 2)}
      </text>
      <text x={barPx} y={17} textAnchor="middle" fontSize="7" fill={C.scaleBar}>
        {fmtFt(barM)}
      </text>
      <text x={barPx + 5} y={7} fontSize="6.5" fill={C.titleSub}>{barM}m</text>
    </g>
  );
}

const C_titleSub = "#666666";

function TitleBlock({ svgW, plotWidth, plotDepth, floor, numFloors, bedrooms, bathrooms }: {
  svgW: number; plotWidth: number; plotDepth: number;
  floor: number; numFloors: number; bedrooms: number; bathrooms: number;
}) {
  const pw   = Math.round(plotWidth * M_TO_FT);
  const pd   = Math.round(plotDepth * M_TO_FT);
  const pa   = Math.round(plotWidth * plotDepth * M2_TO_SQFT);
  const date = new Date().toLocaleDateString("en-US",
    { month: "short", day: "2-digit", year: "numeric" });

  const c1 = svgW * 0.43;
  const c2 = svgW * 0.31;
  const lp = 16, tp = 12;

  return (
    <g fontFamily="Arial, Helvetica, sans-serif">
      <rect x={0} y={0} width={svgW} height={TITLE_H} fill={C.titleBg} />
      <line x1={0} y1={0} x2={svgW} y2={0} stroke={C.titleLine} strokeWidth="2.5" />
      <line x1={0} y1={TITLE_H} x2={svgW} y2={TITLE_H} stroke={C.titleLine} strokeWidth="1.5" />
      <line x1={c1} y1={4} x2={c1} y2={TITLE_H - 4} stroke={C.titleLine} strokeWidth="0.7" />
      <line x1={c1 + c2} y1={4} x2={c1 + c2} y2={TITLE_H - 4} stroke={C.titleLine} strokeWidth="0.7" />

      {/* Col 1: Floor name */}
      <text x={lp} y={tp + 11} fontSize="7" fontWeight="600"
        fill={C_titleSub} letterSpacing="0.12em">ARCHITECTURAL FLOOR PLAN</text>
      <text x={lp} y={tp + 32} fontSize="15" fontWeight="700"
        fill={C.titleText} letterSpacing="0.04em">{floorName(floor)}</text>
      <text x={lp} y={tp + 50} fontSize="8.5" fill={C_titleSub}>
        {bedrooms} Bedrooms · {bathrooms} Bathrooms · Floor {floor + 1} of {numFloors}
      </text>
      <line x1={lp} y1={tp + 56} x2={c1 - lp} y2={tp + 56}
        stroke={C.titleLine} strokeWidth="0.4" />
      <text x={lp} y={tp + 68} fontSize="7.5" fill={C_titleSub}>
        Date: {date}
      </text>

      {/* Col 2: Plot dimensions */}
      <text x={c1 + lp} y={tp + 11} fontSize="7" fontWeight="600"
        fill={C_titleSub} letterSpacing="0.12em">PLOT DIMENSIONS</text>
      <text x={c1 + lp} y={tp + 34} fontSize="18" fontWeight="700" fill={C.titleText}>
        {pw}′ × {pd}′
      </text>
      <text x={c1 + lp} y={tp + 52} fontSize="8.5" fill={C_titleSub}>
        {plotWidth.toFixed(2)}m × {plotDepth.toFixed(2)}m
      </text>
      <text x={c1 + lp} y={tp + 68} fontSize="8.5" fill={C_titleSub}>
        Plot area: {pa.toLocaleString()} sq ft
      </text>

      {/* Col 3: Drawing info */}
      <text x={c1 + c2 + lp} y={tp + 11} fontSize="7" fontWeight="600"
        fill={C_titleSub} letterSpacing="0.12em">DRAWING INFO</text>
      <text x={c1 + c2 + lp} y={tp + 30} fontSize="9" fill={C_titleSub}>
        Drawing Scale
      </text>
      <text x={c1 + c2 + lp} y={tp + 44} fontSize="12" fontWeight="700" fill={C.titleText}>
        1 : {Math.round(1 / (S / 1000) * 25.4)}
      </text>
      <text x={c1 + c2 + lp} y={tp + 60} fontSize="8" fill={C_titleSub}>
        Units: Feet / Sq Ft
      </text>
      <text x={c1 + c2 + lp} y={tp + 74} fontSize="7.5" fill={C_titleSub}
        fontStyle="italic">For reference only</text>
    </g>
  );
}

// ─── Exported props interface ─────────────────────────────────────────────────
export interface FloorPlanSVGProps {
  layout:     LayoutOutput;
  floor:      number;
  plotWidth:  number;
  plotDepth:  number;
  facing:     FacingDirection;
  bedrooms:   number;
  bathrooms:  number;
}

// ─── Main SVG component ───────────────────────────────────────────────────────
const FloorPlanSVG = forwardRef<SVGSVGElement, FloorPlanSVGProps>(
  function FloorPlanSVG({ layout, floor, plotWidth, plotDepth, bedrooms, bathrooms }, ref) {

    const pw    = px(plotWidth);
    const pd    = px(plotDepth);
    const OX    = MARGIN;
    const OY    = TITLE_H + MARGIN;
    const svgW  = MARGIN + pw + MARGIN;
    const svgH  = TITLE_H + MARGIN + pd + MARGIN;

    const rooms   = useMemo(() => layout.rooms.filter(r => r.floor === floor),   [layout, floor]);
    const walls   = useMemo(() => layout.walls.filter(w => w.floor === floor),   [layout, floor]);
    const doors   = useMemo(() => layout.doors.filter(d => d.floor === floor),   [layout, floor]);
    const windows = useMemo(() => layout.windows.filter(w => w.floor === floor), [layout, floor]);
    const stairs  = useMemo(() => layout.stairs.filter(s => s.fromFloor === floor), [layout, floor]);

    const wallById = useMemo(() => {
      const m = new Map<string, Wall>();
      walls.forEach(w => m.set(w.id, w));
      return m;
    }, [walls]);

    const numFloors    = Math.max(...layout.rooms.map(r => r.floor)) + 1;
    const openRooms    = rooms.filter(r => r.type === "balcony" || r.type === "terrace" || r.type === "front_garden" || r.type === "entrance_gate");

    return (
      <svg
        ref={ref}
        width={svgW} height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.stairLine} />
          </marker>
          {openRooms.map(r => (
            <clipPath key={r.id} id={`bclip-${r.id}`}>
              <rect
                x={OX + px(r.x)} y={OY + px(r.y)}
                width={px(r.width)} height={px(r.depth)}
              />
            </clipPath>
          ))}
        </defs>

        {/* ① Paper */}
        <rect x={0} y={0} width={svgW} height={svgH} fill={C.paper} />

        {/* ② Title block */}
        <TitleBlock
          svgW={svgW} plotWidth={plotWidth} plotDepth={plotDepth}
          floor={floor} numFloors={numFloors}
          bedrooms={bedrooms} bathrooms={bathrooms}
        />

        {/* ③ Plot background */}
        <rect x={OX} y={OY} width={pw} height={pd} fill={C.plotBg} />

        {/* ④ Very faint metre grid */}
        {Array.from({ length: Math.ceil(plotWidth) + 1 }).map((_, i) => (
          <line key={`gx${i}`}
            x1={OX + i * S} y1={OY} x2={OX + i * S} y2={OY + pd}
            stroke="rgba(0,0,0,0.045)" strokeWidth="0.5" />
        ))}
        {Array.from({ length: Math.ceil(plotDepth) + 1 }).map((_, i) => (
          <line key={`gy${i}`}
            x1={OX} y1={OY + i * S} x2={OX + pw} y2={OY + i * S}
            stroke="rgba(0,0,0,0.045)" strokeWidth="0.5" />
        ))}

        {/* ⑤ Room fills */}
        {rooms.map(r => (
          <rect key={r.id}
            x={OX + px(r.x)} y={OY + px(r.y)}
            width={px(r.width)} height={px(r.depth)}
            fill={ROOM_FILLS[r.type] ?? "#FAFAF8"}
          />
        ))}

        {/* ⑥ Balcony / terrace hatch */}
        {openRooms.map(r => (
          <BalconyHatch key={`hatch-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑥b Furniture & exterior elements */}
        {rooms.map(r => (
          <RoomFurniture key={`furn-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑦ Exterior boundary — clean single outer line */}
        <rect x={OX} y={OY} width={pw} height={pd}
          fill="none" stroke={C.border} strokeWidth="2" />

        {/* ⑧ Walls (solid filled rectangles) */}
        {walls.map(w => (
          <WallRect key={w.id} wall={w} doors={doors} windows={windows} ox={OX} oy={OY} />
        ))}

        {/* ⑨ Window symbols */}
        {windows.map(w => (
          <WindowSymbol key={w.id}
            win={w} wall={wallById.get(w.wallId)} ox={OX} oy={OY} />
        ))}

        {/* ⑩ Door symbols */}
        {doors.map(d => (
          <DoorSymbol key={d.id}
            door={d} wall={wallById.get(d.wallId)} ox={OX} oy={OY} />
        ))}

        {/* ⑪ Stair symbols */}
        {stairs.map(s => (
          <StairSymbol key={s.id} stair={s} ox={OX} oy={OY} />
        ))}

        {/* ⑫ Room labels */}
        {rooms.map(r => (
          <RoomLabel key={`lbl-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑬ Dimension lines */}
        <DimensionLines pw={pw} pd={pd} ox={OX} oy={OY} />

        {/* ⑭ North arrow — centred above the top plot edge, matching reference */}
        <NorthArrow x={OX + pw / 2} y={OY - MARGIN * 0.48} />

        {/* ⑮ Scale bar (bottom margin) */}
        <ScaleBar x={OX} y={OY + pd + DIM_GAP + 30} />

        {/* ⑯ Outer drawing border */}
        <rect x={5} y={5} width={svgW - 10} height={svgH - 10}
          fill="none" stroke={C.border} strokeWidth="1.8" />
        <rect x={8} y={8} width={svgW - 16} height={svgH - 16}
          fill="none" stroke={C.border} strokeWidth="0.4" />
      </svg>
    );
  }
);

export default FloorPlanSVG;
