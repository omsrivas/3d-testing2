import React, { forwardRef, useMemo } from "react";
import type {
  LayoutOutput, Room, Wall, Door,
  Window as WinType, Stair, FacingDirection,
} from "@/lib/layoutEngine";
import { RoomFurniture } from "./FurnitureSymbols";

// ─── Drawing constants ────────────────────────────────────────────────────────
export const BASE_SCALE = 45;      // px per metre
const MARGIN_TOP   = 130;          // above plot: north arrow + dim line
const MARGIN_SIDE  = 82;           // each side: dim line + text
const MARGIN_BOT   = 92;           // below plot: dim line + scale bar
const TITLE_H      = 128;          // bottom title block height
const SHEET_PAD    = 22;           // outer sheet edge inset for border rect
const DIM_GAP      = 46;           // offset of dim line from plot edge
const TICK         = 8;            // tick arm length
const EXT_T        = 14;           // exterior wall min thickness (px)
const INT_T        = 9;            // interior wall min thickness (px)

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
  paper:       "#FFFFFF",
  plotBg:      "#F9F8F6",
  wall:        "#1C1A17",
  border:      "#1C1A17",
  dimLine:     "#A8A39C",
  dimText:     "#4A4640",
  label:       "#1C1A17",
  labelSub:    "#7A7268",
  doorLine:    "#1C1A17",
  winFill:     "rgba(185,218,242,0.38)",
  winLine:     "#1C1A17",
  stairFill:   "#EAE6DE",
  stairAlt:    "#D9D4C8",
  stairLine:   "#6A6460",
  separator:   "#C4BFB8",
  scaleBar:    "#1C1A17",
  hatch:       "rgba(60,110,60,0.20)",
  accent:      "#1C1A17",
  sub:         "#8C8880",
} as const;

// ─── Room fills & labels ──────────────────────────────────────────────────────
const ROOM_FILLS: Record<string, string> = {
  living:         "#EDE9DE",
  family_lounge:  "#EDE9DE",
  dining:         "#E8E3D2",
  kitchen:        "#F0EBD8",
  master_bedroom: "#EFD9BC",
  bedroom:        "#EDD8B8",
  bathroom:       "#C9E2ED",
  toilet:         "#C9E2ED",
  balcony:        "#D2E8CC",
  parking:        "#D4D0C8",
  staircase:      "#E4DFD6",
  foyer:          "#E7DEC8",
  pooja:          "#F6EDD8",
  utility:        "#E6E2DA",
  passage:        "#ECE8DC",
  front_garden:   "#8EC86A",
  entrance_gate:  "#C6BCAA",
  terrace:        "#D8DDD2",
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

// ─── Drawing sub-components ───────────────────────────────────────────────────

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
      <line x1={cx - T / 2} y1={cy - ww / 2}  x2={cx + T / 2} y2={cy - ww / 2} stroke={C.winLine} strokeWidth="1.1" />
      <line x1={cx - T / 2} y1={cy + ww / 2}  x2={cx + T / 2} y2={cy + ww / 2} stroke={C.winLine} strokeWidth="1.1" />
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
      <rect x={x} y={y} width={rw} height={rh} fill="none" stroke={C.stairLine} strokeWidth="1" />
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
        stroke={C.hatch} strokeWidth="0.8"
      />
    );
  }
  return <g clipPath={`url(#bclip-${room.id})`}>{lines}</g>;
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
        fill="rgba(255,255,255,0.78)" rx="1.5" />
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
      {tick45(ox,      oy - off,      "t1")}
      {tick45(ox + pw, oy - off,      "t2")}
      {tick45(ox,      oy + pd + off, "t3")}
      {tick45(ox + pw, oy + pd + off, "t4")}
      {tick45(ox - off, oy,           "t5")}
      {tick45(ox - off, oy + pd,      "t6")}
      {tick45(ox + pw + off, oy,      "t7")}
      {tick45(ox + pw + off, oy + pd, "t8")}
      <text x={ox + pw / 2} y={oy - off - 8}      textAnchor="middle" {...txt}>{fmtFt(pw / S)}</text>
      <text x={ox + pw / 2} y={oy + pd + off + 16} textAnchor="middle" {...txt}>{fmtFt(pw / S)}</text>
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
      <polygon points={`0,${-r + 3} 5,2 0,0`}     fill={C.accent} />
      <polygon points={`0,${r - 3}  -5,-2 0,0`}    fill="none" stroke={C.accent} strokeWidth="0.8" />
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
      <text x={0}          y={15} textAnchor="middle" fontSize="6.5" fill={C.sub}>0</text>
      <text x={barPx / 2}  y={15} textAnchor="middle" fontSize="6.5" fill={C.sub}>{fmtFt(barM / 2)}</text>
      <text x={barPx}      y={15} textAnchor="middle" fontSize="6.5" fill={C.sub}>{fmtFt(barM)}</text>
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

  const y0  = svgH - TITLE_H;         // top of title block
  const lp  = 20;                      // left padding per column
  const tp  = 22;                      // top padding inside block

  // Column x positions
  const c1x = SHEET_PAD + 2;
  const c2x = svgW * 0.40;
  const c3x = svgW * 0.62;
  const c4x = svgW * 0.80;

  const SAN = "Arial, Helvetica, sans-serif";

  return (
    <g fontFamily={SAN}>
      {/* Block background */}
      <rect x={SHEET_PAD + 2} y={y0} width={svgW - SHEET_PAD * 2 - 4} height={TITLE_H - SHEET_PAD - 2}
        fill={C.paper} />

      {/* Top separator — double line for elegance */}
      <line x1={SHEET_PAD + 2} y1={y0}     x2={svgW - SHEET_PAD - 2} y2={y0}
        stroke={C.accent} strokeWidth="2" />
      <line x1={SHEET_PAD + 2} y1={y0 + 4} x2={svgW - SHEET_PAD - 2} y2={y0 + 4}
        stroke={C.separator} strokeWidth="0.5" />

      {/* Vertical dividers */}
      <line x1={c2x} y1={y0 + 8} x2={c2x} y2={svgH - SHEET_PAD - 4}
        stroke={C.separator} strokeWidth="0.7" />
      <line x1={c3x} y1={y0 + 8} x2={c3x} y2={svgH - SHEET_PAD - 4}
        stroke={C.separator} strokeWidth="0.7" />
      <line x1={c4x} y1={y0 + 8} x2={c4x} y2={svgH - SHEET_PAD - 4}
        stroke={C.separator} strokeWidth="0.7" />

      {/* — Col 1: Floor name ——————————————————————————— */}
      <text x={c1x + lp} y={y0 + tp} fontSize="6.5" fontWeight="600"
        fill={C.sub} letterSpacing="0.18em">
        ARCHITECTURAL FLOOR PLAN
      </text>
      <text x={c1x + lp} y={y0 + tp + 26} fontSize="17" fontWeight="700"
        fill={C.accent} letterSpacing="0.04em">
        {floorName(floor)}
      </text>
      <text x={c1x + lp} y={y0 + tp + 44} fontSize="8" fill={C.sub} letterSpacing="0.02em">
        {bedrooms} Bedrooms  ·  {bathrooms} Bathrooms  ·  Floor {floor + 1} of {numFloors}
      </text>
      <line x1={c1x + lp} y1={y0 + tp + 52} x2={c2x - lp} y2={y0 + tp + 52}
        stroke={C.separator} strokeWidth="0.5" />
      <text x={c1x + lp} y={y0 + tp + 66} fontSize="7.5" fill={C.sub}>
        {date}
      </text>

      {/* — Col 2: Plot dimensions ————————————————————— */}
      <text x={c2x + lp} y={y0 + tp} fontSize="6.5" fontWeight="600"
        fill={C.sub} letterSpacing="0.18em">
        PLOT DIMENSIONS
      </text>
      <text x={c2x + lp} y={y0 + tp + 28} fontSize="20" fontWeight="700" fill={C.accent}>
        {pw}′ × {pd}′
      </text>
      <text x={c2x + lp} y={y0 + tp + 46} fontSize="8" fill={C.sub}>
        {plotWidth.toFixed(2)} m × {plotDepth.toFixed(2)} m
      </text>
      <text x={c2x + lp} y={y0 + tp + 62} fontSize="8" fill={C.sub}>
        Plot area: {pa.toLocaleString()} sq ft
      </text>

      {/* — Col 3: Scale ——————————————————————————————— */}
      <text x={c3x + lp} y={y0 + tp} fontSize="6.5" fontWeight="600"
        fill={C.sub} letterSpacing="0.18em">
        DRAWING SCALE
      </text>
      <text x={c3x + lp} y={y0 + tp + 28} fontSize="20" fontWeight="700" fill={C.accent}>
        1 : {ratio}
      </text>
      <text x={c3x + lp} y={y0 + tp + 46} fontSize="8" fill={C.sub}>
        Units: Feet / Sq Ft
      </text>
      <text x={c3x + lp} y={y0 + tp + 62} fontSize="7.5" fill={C.sub} fontStyle="italic">
        For reference only
      </text>

      {/* — Col 4: Drawing info ———————————————————————— */}
      <text x={c4x + lp} y={y0 + tp} fontSize="6.5" fontWeight="600"
        fill={C.sub} letterSpacing="0.18em">
        DRAWING INFO
      </text>
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
      {/* Corner crosshair accents */}
      {[
        [p, p], [svgW - p, p], [p, svgH - p], [svgW - p, svgH - p]
      ].map(([cx, cy], i) => (
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
          <marker id="stairArrow" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.stairLine} />
          </marker>
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

        {/* ③ Very faint metre grid */}
        {Array.from({ length: Math.ceil(plotWidth) + 1 }).map((_, i) => (
          <line key={`gx${i}`}
            x1={OX + i * S} y1={OY} x2={OX + i * S} y2={OY + pd}
            stroke="rgba(0,0,0,0.04)" strokeWidth="0.4" />
        ))}
        {Array.from({ length: Math.ceil(plotDepth) + 1 }).map((_, i) => (
          <line key={`gy${i}`}
            x1={OX} y1={OY + i * S} x2={OX + pw} y2={OY + i * S}
            stroke="rgba(0,0,0,0.04)" strokeWidth="0.4" />
        ))}

        {/* ④ Room fills */}
        {rooms.map(r => (
          <rect key={r.id}
            x={OX + px(r.x)} y={OY + px(r.y)}
            width={px(r.width)} height={px(r.depth)}
            fill={ROOM_FILLS[r.type] ?? "#F8F7F4"}
          />
        ))}

        {/* ⑤ Balcony / terrace hatch */}
        {openRooms.map(r => (
          <BalconyHatch key={`hatch-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑥ Furniture */}
        {rooms.map(r => (
          <RoomFurniture key={`furn-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑦ Plot outer boundary */}
        <rect x={OX} y={OY} width={pw} height={pd}
          fill="none" stroke={C.border} strokeWidth="2" />

        {/* ⑧ Walls */}
        {walls.map(w => (
          <WallRect key={w.id} wall={w} doors={doors} windows={windows} ox={OX} oy={OY} />
        ))}

        {/* ⑨ Windows */}
        {windows.map(w => (
          <WindowSymbol key={w.id} win={w} wall={wallById.get(w.wallId)} ox={OX} oy={OY} />
        ))}

        {/* ⑩ Doors */}
        {doors.map(d => (
          <DoorSymbol key={d.id} door={d} wall={wallById.get(d.wallId)} ox={OX} oy={OY} />
        ))}

        {/* ⑪ Stairs */}
        {stairs.map(s => (
          <StairSymbol key={s.id} stair={s} ox={OX} oy={OY} />
        ))}

        {/* ⑫ Room labels */}
        {rooms.map(r => (
          <RoomLabel key={`lbl-${r.id}`} room={r} ox={OX} oy={OY} />
        ))}

        {/* ⑬ Dimension lines */}
        <DimensionLines pw={pw} pd={pd} ox={OX} oy={OY} />

        {/* ⑭ North arrow — centred above plot */}
        <NorthArrow x={OX + pw / 2} y={OY - MARGIN_TOP * 0.46} />

        {/* ⑮ Scale bar — bottom left of plot area */}
        <ScaleBar x={OX} y={OY + pd + DIM_GAP + 28} />

        {/* ⑯ Title block at bottom */}
        <TitleBlock
          svgW={svgW} svgH={svgH}
          plotWidth={plotWidth} plotDepth={plotDepth}
          floor={floor} numFloors={numFloors}
          bedrooms={bedrooms} bathrooms={bathrooms}
        />

        {/* ⑰ Sheet border — rendered last, on top */}
        <SheetBorder svgW={svgW} svgH={svgH} />
      </svg>
    );
  }
);

export default FloorPlanSVG;
