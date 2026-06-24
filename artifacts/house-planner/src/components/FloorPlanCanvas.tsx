import { useRef, useCallback, useMemo } from "react";
import {
  Stage, Layer, Rect, Line, Arc, Text, Group, Circle, Shape,
} from "react-konva";
import type Konva from "konva";
import type {
  LayoutOutput, Room, Wall, Door,
  Window as WinType, Stair, FacingDirection,
} from "@/lib/layoutEngine";

// ─── Scale & padding ─────────────────────────────────────────────────────────
const S  = 40;   // px per metre
const PD = 80;   // canvas padding for dimension lines

// ─── Unit conversion (internal = metres, display = feet) ─────────────────────
const M_TO_FT   = 3.28084;
const M2_TO_SQFT = 10.7639;
const fmtFt  = (m: number)  => `${Math.round(m * M_TO_FT)} ft`;
const fmtSqft = (m2: number) => `${Math.round(m2 * M2_TO_SQFT)} sq ft`;
const DIM_OFFSET  = 32; // px outside plot edge for dim lines
const DIM_TICK    = 8;

// ─── Colour palette — premium Indian architectural drawing ────────────────────
// White background, dark walls, warm accents — matches MakeMyHouse style.
const C = {
  canvasBg:     "#F5F2EC",               // warm tracing-paper white
  plotBg:       "#EDE9E2",               // plot fill — slightly warmer
  garden:       "#D8E8CC",               // green setback / lawn
  gardenBdr:    "#A8C898",               // lawn edge
  extWall:      "#2C2622",               // near-black structural wall
  intWall:      "#5A504A",               // dark-gray partition wall
  dimLine:      "#9A8870",               // warm taupe dimension lines
  dimText:      "#7A6A58",               // dimension text
  compassBody:  "#5A5050",               // compass body
  compassN:     "#C03020",               // compass north (muted red)
  labelText:    "#1E1810",               // room label (near-black)
  labelBg:      "rgba(255,253,248,0.96)",// label background — near-white
  areaText:     "#6A5A48",               // area sqft text
  doorArc:      "#8B5A2C",               // door swing — teak brown
  doorLeaf:     "#8B5A2C",               // door leaf — teak brown
  winFrame:     "#6090B0",               // window frame — steel blue
  winGlass:     "rgba(160,220,248,0.50)",// window glass tint
  furniture:    "#9A8268",               // 2D furniture lines
  stairLine:    "#7A6858",               // stair tread lines
  parkingChev:  "#888878",               // parking chevrons
  gridLine:     "rgba(120,110,90,0.06)", // very subtle warm grid
  setbackLine:  "rgba(100,160,80,0.30)", // green setback guideline
};

const ROOM_FILLS: Record<string, string> = {
  living:         "rgba(252,240,208,0.90)",
  dining:         "rgba(238,250,215,0.90)",
  kitchen:        "rgba(255,244,172,0.90)",
  master_bedroom: "rgba(228,214,250,0.90)",
  bedroom:        "rgba(214,226,250,0.90)",
  bathroom:       "rgba(192,238,250,0.90)",
  toilet:         "rgba(192,238,250,0.90)",
  balcony:        "rgba(188,228,198,0.85)",
  parking:        "rgba(185,188,172,0.82)",
  staircase:      "rgba(238,222,194,0.88)",
  foyer:          "rgba(255,248,222,0.90)",
  pooja:          "rgba(255,232,192,0.92)",
  utility:        "rgba(218,214,200,0.82)",
  passage:        "rgba(248,242,224,0.85)",
  terrace:        "rgba(194,218,190,0.80)",
};

const ROOM_LABELS: Record<string, string> = {
  living: "Living", dining: "Dining", kitchen: "Kitchen",
  master_bedroom: "Master Bed", bedroom: "Bedroom",
  bathroom: "Bath", toilet: "WC", balcony: "Balcony",
  parking: "Parking", staircase: "Stair", foyer: "Foyer",
  pooja: "Pooja", utility: "Utility", passage: "Passage", terrace: "Terrace",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const px = (m: number) => m * S;

function isHorizontalWall(wall: Wall) {
  return Math.abs(wall.y2 - wall.y1) < 0.01;
}

/** Break a wall into sub-segments around door/window openings */
function wallSegments(
  wall: Wall,
  doors: Door[],
  windows: WinType[]
): Array<[number, number, number, number]> {
  const isH = isHorizontalWall(wall);
  const len  = wall.length;

  // Collect openings on this wall
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

  // Build segments
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

// ─── Furniture shapes per room ────────────────────────────────────────────────
function FurnitureShapes({ room }: { room: Room }) {
  const rx = PD + px(room.x);
  const ry = PD + px(room.y);
  const rw = px(room.width);
  const rh = px(room.depth);
  const m  = 6; // margin from wall in px

  const common = { stroke: C.furniture, strokeWidth: 1, fill: "rgba(200,185,158,0.30)", listening: false };

  switch (room.type) {
    case "living": {
      const sw = Math.min(px(2.2), rw - m * 2);
      const sh = Math.min(px(0.85), rh * 0.28);
      const tw = Math.min(px(1.1), rw * 0.45);
      const th = Math.min(px(0.5), rh * 0.18);
      return (
        <Group>
          {/* sofa */}
          <Rect x={rx + m} y={ry + rh - m - sh} width={sw} height={sh} cornerRadius={3} {...common} />
          <Line points={[rx + m, ry + rh - m - sh + sh * 0.4, rx + m + sw, ry + rh - m - sh + sh * 0.4]} stroke={C.furniture} strokeWidth={0.5} listening={false} />
          {/* coffee table */}
          <Rect x={rx + m + (sw - tw) / 2} y={ry + rh - m - sh - 6 - th} width={tw} height={th} cornerRadius={2} {...common} />
          {/* tv unit */}
          <Rect x={rx + m} y={ry + m} width={Math.min(px(1.5), rw - m * 2)} height={Math.min(px(0.35), rh * 0.12)} {...common} />
        </Group>
      );
    }
    case "dining": {
      const tw = Math.min(px(1.2), rw * 0.55);
      const th = Math.min(px(0.8), rh * 0.45);
      const tx = rx + (rw - tw) / 2;
      const ty = ry + (rh - th) / 2;
      const cr = Math.min(px(0.22), Math.min(tw, th) * 0.22);
      return (
        <Group>
          <Rect x={tx} y={ty} width={tw} height={th} cornerRadius={3} {...common} />
          {/* chairs */}
          {[[tx + tw / 2, ty - cr - 3], [tx + tw / 2, ty + th + cr + 3],
            [tx - cr - 3, ty + th / 2], [tx + tw + cr + 3, ty + th / 2]].map(([cx, cy], i) => (
            <Circle key={i} x={cx} y={cy} radius={cr} {...common} />
          ))}
        </Group>
      );
    }
    case "kitchen": {
      const cw = Math.min(px(0.6), rw * 0.35);
      const ch = Math.min(px(0.6), rh * 0.35);
      return (
        <Group>
          <Rect x={rx + m} y={ry + m} width={rw - m * 2} height={cw} {...common} />
          <Rect x={rx + m} y={ry + m + cw} width={ch} height={rh - m * 2 - cw} {...common} />
          <Circle x={rx + rw - m - px(0.3)} y={ry + m + cw / 2} radius={px(0.15)} stroke={C.furniture} strokeWidth={1} fill="none" listening={false} />
          <Circle x={rx + rw - m - px(0.65)} y={ry + m + cw / 2} radius={px(0.15)} stroke={C.furniture} strokeWidth={1} fill="none" listening={false} />
        </Group>
      );
    }
    case "master_bedroom": {
      const bw = Math.min(px(1.6), rw * 0.65);
      const bh = Math.min(px(2.0), rh * 0.62);
      const bx = rx + (rw - bw) / 2;
      const by = ry + rh - m - bh;
      const nsw = Math.min(px(0.45), (rw - bw) / 2 - 4);
      const nsh = Math.min(px(0.45), bh * 0.28);
      return (
        <Group>
          <Rect x={bx} y={by} width={bw} height={bh} cornerRadius={3} {...common} />
          <Line points={[bx, by + px(0.3), bx + bw, by + px(0.3)]} stroke={C.furniture} strokeWidth={1} listening={false} />
          <Rect x={bx - nsw - 3} y={by} width={nsw} height={nsh} cornerRadius={2} {...common} />
          <Rect x={bx + bw + 3} y={by} width={nsw} height={nsh} cornerRadius={2} {...common} />
          <Rect x={rx + m} y={ry + m} width={rw - m * 2} height={Math.min(px(0.55), rh * 0.18)} {...common} />
        </Group>
      );
    }
    case "bedroom": {
      const bw = Math.min(px(1.2), rw * 0.65);
      const bh = Math.min(px(1.9), rh * 0.62);
      const bx = rx + (rw - bw) / 2;
      const by = ry + rh - m - bh;
      return (
        <Group>
          <Rect x={bx} y={by} width={bw} height={bh} cornerRadius={3} {...common} />
          <Line points={[bx, by + px(0.25), bx + bw, by + px(0.25)]} stroke={C.furniture} strokeWidth={1} listening={false} />
          <Rect x={rx + m} y={ry + m} width={rw - m * 2} height={Math.min(px(0.55), rh * 0.18)} {...common} />
        </Group>
      );
    }
    case "bathroom": {
      const sinW = Math.min(px(0.5), rw * 0.42);
      const sinH = Math.min(px(0.4), rh * 0.22);
      const tolW = Math.min(px(0.4), rw * 0.42);
      const tolH = Math.min(px(0.6), rh * 0.34);
      return (
        <Group>
          <Rect x={rx + m} y={ry + m} width={sinW} height={sinH} cornerRadius={sinW * 0.3} {...common} />
          <Rect x={rx + m} y={ry + rh - m - tolH} width={tolW} height={tolH} cornerRadius={tolW * 0.25} {...common} />
          <Rect x={rx + m + tolW * 0.1} y={ry + rh - m - tolH - px(0.12)} width={tolW * 0.8} height={px(0.12)} {...common} />
        </Group>
      );
    }
    case "toilet": {
      const w = Math.min(px(0.38), rw * 0.60);
      const h = Math.min(px(0.60), rh * 0.55);
      return (
        <Group>
          <Rect x={rx + (rw - w) / 2} y={ry + rh - m - h} width={w} height={h} cornerRadius={w * 0.25} {...common} />
          <Rect x={rx + (rw - w * 0.85) / 2} y={ry + rh - m - h - px(0.12)} width={w * 0.85} height={px(0.12)} {...common} />
        </Group>
      );
    }
    case "parking": {
      const cw = Math.min(px(1.8), rw - m * 2);
      const ch = Math.min(px(4.2), rh - m * 2);
      const cx2 = rx + m + cw;
      const cy2 = ry + m + ch;
      return (
        <Group>
          <Rect x={rx + m} y={ry + m} width={cw} height={ch} cornerRadius={4} stroke={C.parkingChev} strokeWidth={1} fill="rgba(160,165,148,0.20)" listening={false} />
          <Line points={[rx + m + px(0.2), ry + m + px(0.3), rx + m + cw - px(0.2), ry + m + px(0.3)]} stroke={C.parkingChev} strokeWidth={0.8} listening={false} />
          <Line points={[rx + m + px(0.2), cy2 - px(0.3), rx + m + cw - px(0.2), cy2 - px(0.3)]} stroke={C.parkingChev} strokeWidth={0.8} listening={false} />
          {[0.2, 0.45, 0.55, 0.8].map((t, i) => (
            <Line key={i} points={[rx + m + cw * t, ry + m + px(0.28), rx + m + cw * t, cy2 - px(0.28)]} stroke={C.parkingChev} strokeWidth={0.5} dash={[3, 3]} listening={false} />
          ))}
        </Group>
      );
    }
    case "staircase": {
      const nTreads = 10;
      const isW = room.width > room.depth;
      const tw = isW ? px(room.width - 0.3) / nTreads : px(room.width - 0.3);
      const th = isW ? px(room.depth - 0.3) : px(room.depth - 0.3) / nTreads;
      return (
        <Group>
          {Array.from({ length: nTreads }, (_, i) => (
            <Rect
              key={i}
              x={isW ? rx + m + i * tw : rx + m}
              y={isW ? ry + m : ry + m + i * th}
              width={tw}
              height={th}
              stroke={C.stairLine}
              strokeWidth={0.8}
              fill={i % 2 === 0 ? "rgba(200,185,158,0.12)" : "rgba(200,185,158,0.06)"}
              listening={false}
            />
          ))}
          <Text
            x={isW ? rx + rw - m - 18 : rx + rw / 2 - 6}
            y={isW ? ry + rh / 2 - 6 : ry + m}
            text="↑UP"
            fontSize={9}
            fill={C.stairLine}
            listening={false}
          />
        </Group>
      );
    }
    default:
      return null;
  }
}

// ─── Door swing ────────────────────────────────────────────────────────────────
function DoorSymbol({ door, wall }: { door: Door; wall: Wall | undefined }) {
  if (!wall) return null;

  const isH = wall ? isHorizontalWall(wall) : Math.abs(door.facingWall === "N" || door.facingWall === "S" ? 0 : 1) === 0;
  const cx  = PD + px(door.x);
  const cy  = PD + px(door.y);
  const dw  = px(door.width);

  // Hinge point: left/top end of opening; swing quarter-circle
  if (isH) {
    // Wall runs horizontally. Hinge at (cx - dw/2, cy). Arc swings south (into plot).
    return (
      <Group listening={false}>
        <Line points={[cx - dw / 2, cy, cx + dw / 2, cy]} stroke={C.doorLeaf} strokeWidth={2} />
        <Arc x={cx - dw / 2} y={cy} innerRadius={0} outerRadius={dw} angle={90} rotation={0} stroke={C.doorArc} strokeWidth={1} fill="rgba(193,103,42,0.08)" />
        <Line points={[cx - dw / 2, cy, cx - dw / 2 + dw, cy]} stroke={C.doorLeaf} strokeWidth={1.5} />
      </Group>
    );
  } else {
    // Wall runs vertically. Hinge at (cx, cy - dw/2). Arc swings east.
    return (
      <Group listening={false}>
        <Line points={[cx, cy - dw / 2, cx, cy + dw / 2]} stroke={C.doorLeaf} strokeWidth={2} />
        <Arc x={cx} y={cy - dw / 2} innerRadius={0} outerRadius={dw} angle={90} rotation={90} stroke={C.doorArc} strokeWidth={1} fill="rgba(193,103,42,0.08)" />
        <Line points={[cx, cy - dw / 2, cx, cy - dw / 2 + dw]} stroke={C.doorLeaf} strokeWidth={1.5} />
      </Group>
    );
  }
}

// ─── Window symbol ─────────────────────────────────────────────────────────────
function WindowSymbol({ win, wall }: { win: WinType; wall: Wall | undefined }) {
  if (!wall) return null;
  const isH = isHorizontalWall(wall);
  const cx  = PD + px(win.x);
  const cy  = PD + px(win.y);
  const ww  = px(win.width);
  const depth = win.type === "ventilator" ? 4 : 7;

  if (isH) {
    return (
      <Group listening={false}>
        <Rect x={cx - ww / 2} y={cy - depth / 2} width={ww} height={depth} fill={C.winGlass} stroke={C.winFrame} strokeWidth={0.8} />
        <Line points={[cx - ww / 2, cy, cx + ww / 2, cy]} stroke={C.winFrame} strokeWidth={1} />
        <Line points={[cx - ww / 6, cy - depth / 2, cx - ww / 6, cy + depth / 2]} stroke={C.winFrame} strokeWidth={0.6} />
        <Line points={[cx + ww / 6, cy - depth / 2, cx + ww / 6, cy + depth / 2]} stroke={C.winFrame} strokeWidth={0.6} />
      </Group>
    );
  } else {
    return (
      <Group listening={false}>
        <Rect x={cx - depth / 2} y={cy - ww / 2} width={depth} height={ww} fill={C.winGlass} stroke={C.winFrame} strokeWidth={0.8} />
        <Line points={[cx, cy - ww / 2, cx, cy + ww / 2]} stroke={C.winFrame} strokeWidth={1} />
        <Line points={[cx - depth / 2, cy - ww / 6, cx + depth / 2, cy - ww / 6]} stroke={C.winFrame} strokeWidth={0.6} />
        <Line points={[cx - depth / 2, cy + ww / 6, cx + depth / 2, cy + ww / 6]} stroke={C.winFrame} strokeWidth={0.6} />
      </Group>
    );
  }
}

// ─── North compass ─────────────────────────────────────────────────────────────
function NorthCompass({ x, y }: { x: number; y: number }) {
  const r = 22;
  return (
    <Group x={x} y={y} listening={false}>
      <Circle radius={r + 5} fill="rgba(20,26,12,0.80)" stroke={C.compassBody} strokeWidth={0.8} />
      {/* N arrow */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(5, 0);
          ctx.lineTo(0, -6);
          ctx.lineTo(-5, 0);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fill={C.compassN} stroke={C.compassN} strokeWidth={0.5}
      />
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(0, r);
          ctx.lineTo(5, 0);
          ctx.lineTo(0, 6);
          ctx.lineTo(-5, 0);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fill={C.compassBody} stroke={C.compassBody} strokeWidth={0.5}
      />
      <Line points={[-r + 4, 0, r - 4, 0]} stroke={C.compassBody} strokeWidth={0.6} />
      <Text text="N" x={-5} y={-r - 16} fontSize={11} fontStyle="bold" fill={C.compassN} />
      <Text text="S" x={-4} y={r + 5} fontSize={9} fill={C.compassBody} />
      <Text text="E" x={r + 4} y={-5} fontSize={9} fill={C.compassBody} />
      <Text text="W" x={-r - 14} y={-5} fontSize={9} fill={C.compassBody} />
    </Group>
  );
}

// ─── Dimension lines ───────────────────────────────────────────────────────────
function DimensionLines({ plotWidth, plotDepth }: { plotWidth: number; plotDepth: number }) {
  const pw = px(plotWidth);
  const pd = px(plotDepth);
  const ox = PD; // plot origin x
  const oy = PD; // plot origin y

  const tickH = DIM_TICK;
  const off   = DIM_OFFSET;

  return (
    <Group listening={false}>
      {/* Width dimension (top) */}
      <Line points={[ox, oy - off, ox + pw, oy - off]} stroke={C.dimLine} strokeWidth={1} />
      <Line points={[ox, oy - off - tickH, ox, oy - off + tickH]} stroke={C.dimLine} strokeWidth={1} />
      <Line points={[ox + pw, oy - off - tickH, ox + pw, oy - off + tickH]} stroke={C.dimLine} strokeWidth={1} />
      <Text text={fmtFt(plotWidth)} x={ox + pw / 2 - 20} y={oy - off - 14} fontSize={10} fill={C.dimText} fontStyle="bold" />

      {/* Depth dimension (right) */}
      <Line points={[ox + pw + off, oy, ox + pw + off, oy + pd]} stroke={C.dimLine} strokeWidth={1} />
      <Line points={[ox + pw + off - tickH, oy, ox + pw + off + tickH, oy]} stroke={C.dimLine} strokeWidth={1} />
      <Line points={[ox + pw + off - tickH, oy + pd, ox + pw + off + tickH, oy + pd]} stroke={C.dimLine} strokeWidth={1} />
      <Text
        text={fmtFt(plotDepth)}
        x={ox + pw + off + 6}
        y={oy + pd / 2}
        fontSize={10}
        fill={C.dimText}
        fontStyle="bold"
        rotation={90}
      />
    </Group>
  );
}

// ─── Garden / setback strips ───────────────────────────────────────────────────
function GardenLayer({
  plotWidth, plotDepth, facing,
}: {
  plotWidth: number; plotDepth: number; facing: FacingDirection;
}) {
  const pw = px(plotWidth);
  const pd = px(plotDepth);
  const front = px(1.5); // 1.5m setback
  const side  = px(0.9);

  const strips: Array<[number, number, number, number]> = [
    // top
    [PD, PD, pw, front],
    // bottom
    [PD, PD + pd - front, pw, front],
    // left
    [PD, PD, side, pd],
    // right
    [PD + pw - side, PD, side, pd],
  ];

  const labels: Record<FacingDirection, string> = {
    N: "Road →", S: "← Road", E: "↑ Road", W: "Road ↓",
  };

  return (
    <Group listening={false}>
      {strips.map(([x, y, w, h], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h}
          fill={C.garden} stroke={C.gardenBdr} strokeWidth={0.6} />
      ))}
      {/* setback dash */}
      <Rect x={PD + side} y={PD + front} width={pw - side * 2} height={pd - front * 2}
        fill="transparent" stroke={C.setbackLine} strokeWidth={0.8} dash={[4, 4]} />
    </Group>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface FloorPlanCanvasProps {
  output: LayoutOutput;
  floor: number;
  plotWidth: number;
  plotDepth: number;
  facing: FacingDirection;
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function FloorPlanCanvas({
  output, floor, plotWidth, plotDepth, facing, selectedRoomId, onSelectRoom,
}: FloorPlanCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);

  const pw = px(plotWidth);
  const pd = px(plotDepth);
  const stageW = pw + PD * 2 + 20;
  const stageH = pd + PD * 2 + 20;

  const rooms   = output.rooms.filter(r => r.floor === floor);
  const walls   = output.walls.filter(w => w.floor === floor);
  const doors   = output.doors.filter(d => d.floor === floor);
  const windows = output.windows.filter(w => w.floor === floor);
  const stairs  = output.stairs.filter(s => s.fromFloor === floor);

  const wallMap = useMemo(() => {
    const m = new Map<string, Wall>();
    output.walls.forEach(w => m.set(w.id, w));
    return m;
  }, [output.walls]);

  // ─── Export PNG ────────────────────────────────────────────────────────────
  const exportPng = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const uri = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    const a = document.createElement("a");
    a.href = uri;
    a.download = `floor-plan-floor-${floor}.png`;
    a.click();
  }, [floor]);

  // ─── Export SVG ────────────────────────────────────────────────────────────
  const exportSvg = useCallback(() => {
    const svgStr = buildSvgString({ rooms, walls, doors, windows, plotWidth, plotDepth, floor });
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `floor-plan-floor-${floor}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rooms, walls, doors, windows, plotWidth, plotDepth, floor]);

  return (
    <div className="flex flex-col gap-2">
      {/* Export toolbar */}
      <div className="flex items-center gap-2 justify-end px-1">
        <button
          onClick={exportPng}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-amber-700/40 text-amber-200 hover:bg-amber-900/30 transition-colors bg-transparent"
        >
          <span className="text-base leading-none">🖼</span> Export PNG
        </button>
        <button
          onClick={exportSvg}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-amber-700/40 text-amber-200 hover:bg-amber-900/30 transition-colors bg-transparent"
        >
          <span className="text-base leading-none">📐</span> Export SVG
        </button>
      </div>

      {/* Konva stage */}
      <div style={{ background: C.canvasBg, borderRadius: 8, overflow: "hidden", display: "inline-block" }}>
        <Stage ref={stageRef} width={stageW} height={stageH}>

          {/* ── Background ── */}
          <Layer>
            <Rect width={stageW} height={stageH} fill={C.canvasBg} />
            {/* grid */}
            {Array.from({ length: Math.ceil(plotWidth) + 1 }, (_, i) => (
              <Line key={`vg${i}`} points={[PD + i * S, PD, PD + i * S, PD + pd]}
                stroke={C.gridLine} strokeWidth={0.5} listening={false} />
            ))}
            {Array.from({ length: Math.ceil(plotDepth) + 1 }, (_, i) => (
              <Line key={`hg${i}`} points={[PD, PD + i * S, PD + pw, PD + i * S]}
                stroke={C.gridLine} strokeWidth={0.5} listening={false} />
            ))}
          </Layer>

          {/* ── Garden / setbacks ── */}
          <Layer>
            <GardenLayer plotWidth={plotWidth} plotDepth={plotDepth} facing={facing} />
          </Layer>

          {/* ── Room fills ── */}
          <Layer>
            {rooms.map(room => (
              <Rect
                key={room.id}
                x={PD + px(room.x)}
                y={PD + px(room.y)}
                width={px(room.width)}
                height={px(room.depth)}
                fill={selectedRoomId === room.id
                  ? "rgba(255,220,100,0.75)"
                  : (ROOM_FILLS[room.type] ?? "rgba(240,235,220,0.85)")}
                stroke={selectedRoomId === room.id ? "#f0a020" : "transparent"}
                strokeWidth={2}
                onClick={() => onSelectRoom(selectedRoomId === room.id ? null : room.id)}
                onTap={() => onSelectRoom(selectedRoomId === room.id ? null : room.id)}
                style={{ cursor: "pointer" } as React.CSSProperties}
              />
            ))}
          </Layer>

          {/* ── Furniture ── */}
          <Layer>
            {rooms.map(room => <FurnitureShapes key={room.id} room={room} />)}
          </Layer>

          {/* ── Walls (with opening gaps) ── */}
          <Layer>
            {walls.map(wall => {
              const segs = wallSegments(wall, doors, windows);
              const isExt = wall.type === "external";
              const sw = isExt ? px(wall.thickness) * 1.2 : px(wall.thickness) * 1.1;
              return (
                <Group key={wall.id} listening={false}>
                  {segs.map(([x1, y1, x2, y2], si) => (
                    <Line
                      key={si}
                      points={[PD + px(x1), PD + px(y1), PD + px(x2), PD + px(y2)]}
                      stroke={isExt ? C.extWall : C.intWall}
                      strokeWidth={Math.max(sw, isExt ? 7 : 3.5)}
                      lineCap="square"
                    />
                  ))}
                </Group>
              );
            })}
          </Layer>

          {/* ── Doors ── */}
          <Layer>
            {doors.map(door => (
              <DoorSymbol key={door.id} door={door} wall={wallMap.get(door.wallId)} />
            ))}
          </Layer>

          {/* ── Windows ── */}
          <Layer>
            {windows.map(win => (
              <WindowSymbol key={win.id} win={win} wall={wallMap.get(win.wallId)} />
            ))}
          </Layer>

          {/* ── Room labels ── */}
          <Layer>
            {rooms.map(room => {
              const rx = PD + px(room.x);
              const ry = PD + px(room.y);
              const rw = px(room.width);
              const rh = px(room.depth);
              const label = ROOM_LABELS[room.type] ?? room.type;
              const area  = `${room.area.toFixed(1)} m²`;
              const fs    = Math.min(11, rw / 6.5, rh / 4);
              if (rw < 28 || rh < 22) return null;
              return (
                <Group key={`lbl-${room.id}`} listening={false}>
                  <Rect
                    x={rx + rw / 2 - (label.length * fs * 0.32) - 4}
                    y={ry + rh / 2 - fs - 6}
                    width={label.length * fs * 0.62 + 8}
                    height={fs * 2.4 + 4}
                    fill={C.labelBg}
                    cornerRadius={3}
                  />
                  <Text
                    x={rx + rw / 2}
                    y={ry + rh / 2 - fs - 2}
                    text={label}
                    fontSize={fs}
                    fontStyle="bold"
                    fill={C.labelText}
                    align="center"
                    offsetX={label.length * fs * 0.31}
                  />
                  <Text
                    x={rx + rw / 2}
                    y={ry + rh / 2 + 3}
                    text={area}
                    fontSize={Math.max(7, fs - 2)}
                    fill={C.areaText}
                    align="center"
                    offsetX={area.length * (fs - 2) * 0.28}
                  />
                </Group>
              );
            })}
          </Layer>

          {/* ── Plot border ── */}
          <Layer>
            <Rect x={PD} y={PD} width={pw} height={pd}
              fill="transparent" stroke={C.extWall} strokeWidth={2.5} listening={false} />
          </Layer>

          {/* ── Dimensions + Compass ── */}
          <Layer>
            <DimensionLines plotWidth={plotWidth} plotDepth={plotDepth} />
            <NorthCompass x={stageW - 44} y={stageH - 44} />
          </Layer>

        </Stage>
      </div>
    </div>
  );
}

// ─── SVG string builder ────────────────────────────────────────────────────────
function buildSvgString({
  rooms, walls, doors, windows, plotWidth, plotDepth, floor,
}: {
  rooms: Room[]; walls: Wall[]; doors: Door[]; windows: WinType[];
  plotWidth: number; plotDepth: number; floor: number;
}): string {
  const pw = plotWidth * S;
  const pd = plotDepth * S;
  const W  = pw + PD * 2 + 20;
  const H  = pd + PD * 2 + 20;

  const wallMap = new Map<string, Wall>();
  walls.forEach(w => wallMap.set(w.id, w));

  function p(m: number) { return (PD + m * S).toFixed(2); }
  function s(m: number) { return (m * S).toFixed(2); }

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  lines.push(`<rect width="${W}" height="${H}" fill="${C.canvasBg}"/>`);
  lines.push(`<rect x="${PD}" y="${PD}" width="${pw}" height="${pd}" fill="${C.plotBg}"/>`);

  // grid
  for (let i = 0; i <= Math.ceil(plotWidth); i++) {
    lines.push(`<line x1="${PD + i * S}" y1="${PD}" x2="${PD + i * S}" y2="${PD + pd}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>`);
  }
  for (let i = 0; i <= Math.ceil(plotDepth); i++) {
    lines.push(`<line x1="${PD}" y1="${PD + i * S}" x2="${PD + pw}" y2="${PD + i * S}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>`);
  }

  // rooms
  for (const room of rooms) {
    const fill = ROOM_FILLS[room.type] ?? "rgba(240,235,220,0.85)";
    lines.push(`<rect x="${p(room.x)}" y="${p(room.y)}" width="${s(room.width)}" height="${s(room.depth)}" fill="${fill}" stroke="none"/>`);
  }

  // walls (with gaps)
  for (const wall of walls) {
    const segs = wallSegments(wall, doors, windows);
    const isExt = wall.type === "external";
    const sw = Math.max(isExt ? 7 : 3.5, isExt ? wall.thickness * S * 1.2 : wall.thickness * S * 1.1);
    const color = isExt ? C.extWall : C.intWall;
    for (const [x1, y1, x2, y2] of segs) {
      lines.push(`<line x1="${p(x1)}" y1="${p(y1)}" x2="${p(x2)}" y2="${p(y2)}" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="square"/>`);
    }
  }

  // plot border
  lines.push(`<rect x="${PD}" y="${PD}" width="${pw}" height="${pd}" fill="none" stroke="${C.extWall}" stroke-width="2.5"/>`);

  // room labels
  for (const room of rooms) {
    const rx = PD + room.x * S;
    const ry = PD + room.y * S;
    const rw = room.width * S;
    const rh = room.depth * S;
    if (rw < 28 || rh < 22) continue;
    const label = ROOM_LABELS[room.type] ?? room.type;
    const area  = `${room.area.toFixed(1)} m²`;
    const fs = Math.min(11, rw / 6.5, rh / 4);
    lines.push(`<text x="${(rx + rw / 2).toFixed(1)}" y="${(ry + rh / 2 - 1).toFixed(1)}" font-size="${fs.toFixed(1)}" font-family="sans-serif" font-weight="bold" fill="${C.labelText}" text-anchor="middle">${label}</text>`);
    lines.push(`<text x="${(rx + rw / 2).toFixed(1)}" y="${(ry + rh / 2 + fs + 1).toFixed(1)}" font-size="${Math.max(7, fs - 2).toFixed(1)}" font-family="sans-serif" fill="${C.areaText}" text-anchor="middle">${area}</text>`);
  }

  // dimension lines
  const off = DIM_OFFSET;
  const tk  = DIM_TICK;
  lines.push(`<line x1="${PD}" y1="${PD - off}" x2="${PD + pw}" y2="${PD - off}" stroke="${C.dimLine}" stroke-width="1"/>`);
  lines.push(`<line x1="${PD}" y1="${PD - off - tk}" x2="${PD}" y2="${PD - off + tk}" stroke="${C.dimLine}" stroke-width="1"/>`);
  lines.push(`<line x1="${PD + pw}" y1="${PD - off - tk}" x2="${PD + pw}" y2="${PD - off + tk}" stroke="${C.dimLine}" stroke-width="1"/>`);
  lines.push(`<text x="${PD + pw / 2}" y="${PD - off - 4}" font-size="10" font-family="sans-serif" font-weight="bold" fill="${C.dimText}" text-anchor="middle">${plotWidth} m</text>`);

  lines.push(`<line x1="${PD + pw + off}" y1="${PD}" x2="${PD + pw + off}" y2="${PD + pd}" stroke="${C.dimLine}" stroke-width="1"/>`);
  lines.push(`<line x1="${PD + pw + off - tk}" y1="${PD}" x2="${PD + pw + off + tk}" y2="${PD}" stroke="${C.dimLine}" stroke-width="1"/>`);
  lines.push(`<line x1="${PD + pw + off - tk}" y1="${PD + pd}" x2="${PD + pw + off + tk}" y2="${PD + pd}" stroke="${C.dimLine}" stroke-width="1"/>`);
  lines.push(`<text x="${PD + pw + off + 6}" y="${PD + pd / 2}" font-size="10" font-family="sans-serif" font-weight="bold" fill="${C.dimText}" text-anchor="middle" transform="rotate(90,${PD + pw + off + 6},${PD + pd / 2})">${plotDepth} m</text>`);

  // compass
  const cx = W - 44;
  const cy = H - 44;
  lines.push(`<circle cx="${cx}" cy="${cy}" r="27" fill="rgba(20,26,12,0.80)" stroke="${C.compassBody}" stroke-width="0.8"/>`);
  lines.push(`<polygon points="${cx},${cy - 22} ${cx + 5},${cy} ${cx},${cy - 6} ${cx - 5},${cy}" fill="${C.compassN}"/>`);
  lines.push(`<polygon points="${cx},${cy + 22} ${cx + 5},${cy} ${cx},${cy + 6} ${cx - 5},${cy}" fill="${C.compassBody}"/>`);
  lines.push(`<text x="${cx}" y="${cy - 26}" font-size="11" font-family="sans-serif" font-weight="bold" fill="${C.compassN}" text-anchor="middle">N</text>`);

  // title
  lines.push(`<text x="${PD}" y="${H - 8}" font-size="9" font-family="sans-serif" fill="rgba(200,185,140,0.60)">Floor ${floor} — ${plotWidth}×${plotDepth} m plot</text>`);

  lines.push(`</svg>`);
  return lines.join("\n");
}
