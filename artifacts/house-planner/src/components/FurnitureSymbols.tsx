/**
 * FurnitureSymbols.tsx
 * Architectural plan-view furniture & exterior symbols.
 * Matches BASE_SCALE = 45 px/m from FloorPlanSVG.tsx.
 */

import React from "react";
import type { Room } from "@/lib/layoutEngine";

const S  = 45;
const m  = (v: number) => v * S;          // metres → px
const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Palette — richer, more opaque, premium architectural quality ──────────────
const F = {
  fur:   "rgba(195,162,108,0.58)",   // warm tan furniture fill
  furS:  "rgba(50,35,18,0.80)",      // dark stroke
  ward:  "rgba(155,122,78,0.62)",    // wardrobe — medium brown
  sofa:  "rgba(182,150,100,0.58)",   // sofa — warm tan
  tbl:   "rgba(185,158,110,0.52)",   // tables — warm wood
  bath:  "rgba(195,225,245,0.75)",   // bathroom fixtures — clear sky blue
  bathS: "rgba(15,65,110,0.80)",     // bathroom stroke — deep blue
  kit:   "rgba(185,168,130,0.58)",   // kitchen counter — warm
  plant: "rgba(88,158,48,0.72)",     // plants — vivid green
  plantS:"rgba(32,90,18,0.85)",      // plant stroke
  shrub: "rgba(72,138,35,0.65)",     // boundary shrubs
  shrubS:"rgba(28,78,15,0.80)",
  car:   "rgba(242,244,248,0.96)",   // car body — near-white (sedan)
  carW:  "rgba(30,38,50,0.78)",      // car window glass — dark
  carS:  "rgba(38,48,60,0.88)",      // car outline
  path:  "rgba(195,182,158,0.72)",   // paving slab fill
  pathS: "rgba(140,125,100,0.82)",   // paving stroke
  gate:  "rgba(68,55,38,0.85)",      // gate bars
  step:  "rgba(180,168,148,0.80)",   // stepping stones
  sw:    0.75,
  hw:    0.55,
  mw:    1.0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cushion divisions for sofa seats */
function CushionLines({ x, y, w, h, horiz }: { x:number; y:number; w:number; h:number; horiz:boolean }) {
  const n = Math.max(1, Math.round(horiz ? w / m(0.65) : h / m(0.65)));
  return (
    <>
      {Array.from({ length: n - 1 }).map((_, i) =>
        horiz
          ? <line key={i} x1={x + (i+1)*w/n} y1={y+2} x2={x + (i+1)*w/n} y2={y+h-2}
              stroke={F.furS} strokeWidth={F.hw} />
          : <line key={i} x1={x+2} y1={y + (i+1)*h/n} x2={x+w-2} y2={y + (i+1)*h/n}
              stroke={F.furS} strokeWidth={F.hw} />
      )}
    </>
  );
}

/** A single tree in plan view */
function Tree({ cx, cy, r }: { cx:number; cy:number; r:number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={F.plant} stroke={F.plantS} strokeWidth={F.hw} />
      <circle cx={cx} cy={cy} r={r*0.45} fill={F.plantS} opacity={0.25} />
      {/* shadow arc */}
      <path d={`M ${cx-r*0.5},${cy+r*0.4} A ${r*0.5},${r*0.35} 0 0,1 ${cx+r*0.5},${cy+r*0.4}`}
        fill="rgba(0,0,0,0.08)" />
    </g>
  );
}

/** Hatched paving slab pattern */
function PavingSlabs({ x, y, w, h }: { x:number; y:number; w:number; h:number }) {
  const sw = Math.max(m(0.45), m(0.5));
  const sh = Math.max(m(0.45), m(0.45));
  const cols = Math.ceil(w / sw);
  const rows = Math.ceil(h / sh);
  const cw = w / cols, ch = h / rows;
  return (
    <g fill={F.path} stroke={F.pathS} strokeWidth={0.4}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <rect key={`${r}-${c}`} x={x + c*cw} y={y + r*ch} width={cw} height={ch} />
        ))
      )}
    </g>
  );
}

// ─── BEDROOM ─────────────────────────────────────────────────────────────────

function BedroomFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(2.2) || rh < m(2.4)) return null;

  const isMaster = room.type === "master_bedroom";
  const bedW  = m(isMaster ? 1.75 : 1.4);
  const bedD  = m(1.95);
  const hdH   = m(0.16);      // headboard height
  const stW   = m(0.45);      // side table
  const wdW   = cl(m(isMaster ? 1.9 : 1.55), m(1.0), rw - m(0.3));
  const wdD   = m(0.52);

  // Bed: centre horizontally, placed at top with small margin
  const edge  = m(0.15);
  const bedX  = rx + (rw - bedW) / 2;
  const bedY  = ry + edge;

  // Wardrobe: bottom of room
  const wdX   = rx + (rw - wdW) / 2;
  const wdY   = ry + rh - wdD - edge;
  const panels = Math.max(2, Math.round(wdW / m(0.55)));

  // Side tables: only if room is wide enough
  const hasST = rw >= bedW + stW * 2 + m(0.1);
  const stY   = bedY + hdH + m(0.08);
  const hasWD = rh >= bedD + wdD + m(0.95);

  return (
    <g fill="none">
      {/* Bed frame */}
      <rect x={bedX} y={bedY} width={bedW} height={bedD}
        fill={F.fur} stroke={F.furS} strokeWidth={F.sw} rx="2" />
      {/* Headboard */}
      <rect x={bedX} y={bedY} width={bedW} height={hdH}
        fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="2" />
      {/* Mattress fold line */}
      <line x1={bedX + m(0.1)} y1={bedY + hdH + m(0.7)}
            x2={bedX + bedW - m(0.1)} y2={bedY + hdH + m(0.7)}
        stroke={F.furS} strokeWidth={F.hw} strokeDasharray="4 3" />
      {/* Pillows */}
      {isMaster ? <>
        <rect x={bedX + m(0.14)} y={bedY + hdH + m(0.06)}
              width={m(0.65)} height={m(0.40)} fill={F.fur} stroke={F.furS} strokeWidth={F.hw} rx="4" />
        <rect x={bedX + bedW - m(0.79)} y={bedY + hdH + m(0.06)}
              width={m(0.65)} height={m(0.40)} fill={F.fur} stroke={F.furS} strokeWidth={F.hw} rx="4" />
      </> : (
        <rect x={bedX + m(0.14)} y={bedY + hdH + m(0.06)}
              width={bedW - m(0.28)} height={m(0.38)} fill={F.fur} stroke={F.furS} strokeWidth={F.hw} rx="4" />
      )}

      {/* Side tables */}
      {hasST && <>
        <rect x={bedX - stW - m(0.04)} y={stY} width={stW} height={stW}
          fill={F.tbl} stroke={F.furS} strokeWidth={F.hw} rx="1" />
        <circle cx={bedX - stW/2 - m(0.04) + stW/2} cy={stY + stW/2} r={m(0.10)}
          fill="rgba(255,238,160,0.6)" stroke={F.furS} strokeWidth={F.hw} />
        <rect x={bedX + bedW + m(0.04)} y={stY} width={stW} height={stW}
          fill={F.tbl} stroke={F.furS} strokeWidth={F.hw} rx="1" />
        <circle cx={bedX + bedW + m(0.04) + stW/2} cy={stY + stW/2} r={m(0.10)}
          fill="rgba(255,238,160,0.6)" stroke={F.furS} strokeWidth={F.hw} />
      </>}

      {/* Wardrobe */}
      {hasWD && <>
        <rect x={wdX} y={wdY} width={wdW} height={wdD}
          fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="1" />
        {Array.from({ length: panels - 1 }).map((_, i) => (
          <line key={i}
            x1={wdX + (i+1) * wdW / panels} y1={wdY}
            x2={wdX + (i+1) * wdW / panels} y2={wdY + wdD}
            stroke={F.furS} strokeWidth={F.hw} />
        ))}
        {/* Handle dots */}
        {Array.from({ length: panels }).map((_, i) => (
          <circle key={i}
            cx={wdX + (i + 0.5) * wdW / panels} cy={wdY + wdD / 2}
            r={2} fill={F.furS} />
        ))}
      </>}
    </g>
  );
}

// ─── LIVING ROOM ─────────────────────────────────────────────────────────────

function LivingFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(2.8) || rh < m(2.8)) return null;

  const isWide = rw >= rh;
  const pad    = m(0.18);

  if (isWide) {
    // Landscape: sofa at top, TV unit at bottom, center table in middle
    const sofaW = cl(m(2.4), m(1.8), rw - m(0.8));
    const sofaD = m(0.82);
    const armD  = m(0.62);
    const armW  = m(0.22);
    const tvW   = cl(m(1.8), m(1.2), rw - m(1.0));
    const tvD   = m(0.40);
    const ctW   = cl(m(1.2), m(0.8), sofaW - m(0.4));
    const ctD   = m(0.55);

    const sofaX = rx + (rw - sofaW) / 2;
    const sofaY = ry + pad;
    const tvX   = rx + (rw - tvW) / 2;
    const tvY   = ry + rh - tvD - pad;
    const ctX   = rx + (rw - ctW) / 2;
    const ctY   = sofaY + sofaD + m(0.45);

    return (
      <g fill="none">
        {/* TV unit */}
        <rect x={tvX} y={tvY} width={tvW} height={tvD}
          fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="2" />
        {/* TV screen */}
        <rect x={tvX + m(0.25)} y={tvY + m(0.06)} width={tvW - m(0.5)} height={tvD - m(0.12)}
          fill="rgba(40,50,65,0.30)" stroke={F.furS} strokeWidth={F.hw} rx="1" />

        {/* Main sofa back */}
        <rect x={sofaX} y={sofaY} width={sofaW} height={m(0.18)}
          fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="1" />
        {/* Sofa seat */}
        <rect x={sofaX} y={sofaY + m(0.18)} width={sofaW} height={sofaD - m(0.18)}
          fill={F.sofa} stroke={F.furS} strokeWidth={F.sw} />
        <CushionLines x={sofaX} y={sofaY + m(0.18)} w={sofaW} h={sofaD - m(0.18)} horiz />
        {/* Arm rests */}
        <rect x={sofaX - armW} y={sofaY} width={armW} height={armD}
          fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="1" />
        <rect x={sofaX + sofaW} y={sofaY} width={armW} height={armD}
          fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="1" />

        {/* Center table */}
        {ctY + ctD < tvY - m(0.2) && (
          <rect x={ctX} y={ctY} width={ctW} height={ctD}
            fill={F.tbl} stroke={F.furS} strokeWidth={F.sw} rx="2" />
        )}

        {/* Side sofa (1-seater / accent chair) on right if room is wide enough */}
        {rw > m(4.0) && (() => {
          const acW = m(0.78), acD = m(0.78);
          const acX = rx + rw - acW - pad;
          const acY = sofaY;
          return (
            <>
              <rect x={acX} y={acY} width={acW} height={m(0.16)}
                fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="1" />
              <rect x={acX} y={acY + m(0.16)} width={acW} height={acD - m(0.16)}
                fill={F.sofa} stroke={F.furS} strokeWidth={F.sw} rx="1" />
            </>
          );
        })()}
      </g>
    );
  } else {
    // Portrait: sofa on left wall, TV on right wall
    const sofaD = cl(m(2.2), m(1.6), rh - m(1.2));
    const sofaW = m(0.82);
    const tvH   = cl(m(1.6), m(1.0), rh - m(1.0));
    const tvW   = m(0.40);
    const ctW   = m(0.55);
    const ctH   = cl(m(1.0), m(0.7), sofaD - m(0.4));

    const sofaX = rx + pad;
    const sofaY = ry + (rh - sofaD) / 2;
    const tvX   = rx + rw - tvW - pad;
    const tvY   = ry + (rh - tvH) / 2;
    const ctX   = sofaX + sofaW + m(0.45);
    const ctY   = ry + (rh - ctH) / 2;

    return (
      <g fill="none">
        {/* TV unit */}
        <rect x={tvX} y={tvY} width={tvW} height={tvH}
          fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="2" />
        <rect x={tvX + m(0.06)} y={tvY + m(0.25)} width={tvW - m(0.12)} height={tvH - m(0.5)}
          fill="rgba(40,50,65,0.30)" stroke={F.furS} strokeWidth={F.hw} rx="1" />

        {/* Sofa back */}
        <rect x={sofaX} y={sofaY} width={m(0.18)} height={sofaD}
          fill={F.ward} stroke={F.furS} strokeWidth={F.sw} rx="1" />
        <rect x={sofaX + m(0.18)} y={sofaY} width={sofaW - m(0.18)} height={sofaD}
          fill={F.sofa} stroke={F.furS} strokeWidth={F.sw} />
        <CushionLines x={sofaX + m(0.18)} y={sofaY} w={sofaW - m(0.18)} h={sofaD} horiz={false} />

        {/* Center table */}
        {ctX + ctW < tvX - m(0.2) && (
          <rect x={ctX} y={ctY} width={ctW} height={ctH}
            fill={F.tbl} stroke={F.furS} strokeWidth={F.sw} rx="2" />
        )}
      </g>
    );
  }
}

// ─── DINING ROOM ─────────────────────────────────────────────────────────────

function DiningFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(2.0) || rh < m(2.0)) return null;

  // Table size based on room
  const seats  = rw >= m(3.2) && rh >= m(3.2) ? 6 : 4;
  const tblW   = cl(m(seats === 6 ? 1.8 : 1.2), m(1.0), rw - m(1.2));
  const tblH   = cl(m(seats === 6 ? 0.9 : 0.8), m(0.7), rh - m(1.4));
  const tblX   = rx + (rw - tblW) / 2;
  const tblY   = ry + (rh - tblH) / 2;
  const chW    = m(0.44), chH = m(0.38);
  const gap    = m(0.08);

  // How many chairs per long side
  const nLong  = Math.max(1, Math.floor(tblW / m(0.55)));
  const nShort = Math.max(1, Math.floor(tblH / m(0.55)));

  const chairFill   = "rgba(195,180,145,0.35)";
  const chairStroke = F.furS;

  return (
    <g fill="none">
      {/* Table */}
      <rect x={tblX} y={tblY} width={tblW} height={tblH}
        fill={F.tbl} stroke={F.furS} strokeWidth={F.mw} rx="3" />
      {/* Table centre grain line */}
      <line x1={tblX + m(0.1)} y1={tblY + tblH/2} x2={tblX + tblW - m(0.1)} y2={tblY + tblH/2}
        stroke={F.furS} strokeWidth={F.hw} strokeDasharray="5 3" />

      {/* Chairs – top row */}
      {Array.from({ length: nLong }).map((_, i) => {
        const cx = tblX + (i + 0.5) * tblW / nLong - chW/2;
        return (
          <rect key={`ct${i}`} x={cx} y={tblY - gap - chH} width={chW} height={chH}
            fill={chairFill} stroke={chairStroke} strokeWidth={F.hw} rx="2" />
        );
      })}
      {/* Chairs – bottom row */}
      {Array.from({ length: nLong }).map((_, i) => {
        const cx = tblX + (i + 0.5) * tblW / nLong - chW/2;
        return (
          <rect key={`cb${i}`} x={cx} y={tblY + tblH + gap} width={chW} height={chH}
            fill={chairFill} stroke={chairStroke} strokeWidth={F.hw} rx="2" />
        );
      })}
      {/* Chairs – left */}
      {Array.from({ length: nShort }).map((_, i) => {
        const cy = tblY + (i + 0.5) * tblH / nShort - chH/2;
        return (
          <rect key={`cl${i}`} x={tblX - gap - chH} y={cy} width={chH} height={chW}
            fill={chairFill} stroke={chairStroke} strokeWidth={F.hw} rx="2" />
        );
      })}
      {/* Chairs – right */}
      {Array.from({ length: nShort }).map((_, i) => {
        const cy = tblY + (i + 0.5) * tblH / nShort - chH/2;
        return (
          <rect key={`cr${i}`} x={tblX + tblW + gap} y={cy} width={chH} height={chW}
            fill={chairFill} stroke={chairStroke} strokeWidth={F.hw} rx="2" />
        );
      })}
    </g>
  );
}

// ─── KITCHEN ─────────────────────────────────────────────────────────────────

function KitchenFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(1.8) || rh < m(1.8)) return null;

  const cd  = m(0.6); // counter depth
  const isWide = rw >= rh;
  const hasIsland = rw >= m(3.5) && rh >= m(3.5);

  // Sink symbol (in counter)
  const Sink = ({ x, y, w, horiz }: { x:number; y:number; w:number; horiz:boolean }) => (
    <g stroke={F.bathS} fill={F.bath} strokeWidth={F.hw}>
      {horiz
        ? <rect x={x + w*0.1} y={y + cd*0.15} width={w*0.8} height={cd*0.7} rx="3" />
        : <rect x={y + cd*0.15} y={x + w*0.1} width={cd*0.7} height={w*0.8} rx="3" />}
      {horiz
        ? <circle cx={x + w/2} cy={y + cd/2} r={cd*0.12} fill={F.bathS} stroke="none" />
        : <circle cx={y + cd/2} cy={x + w/2} r={cd*0.12} fill={F.bathS} stroke="none" />}
    </g>
  );

  // Stove with 4 burner circles
  const Stove = ({ x, y, w, horiz }: { x:number; y:number; w:number; horiz:boolean }) => {
    const bR = m(0.115);
    const positions = horiz
      ? [ [x+w*0.25, y+cd*0.35], [x+w*0.75, y+cd*0.35], [x+w*0.25, y+cd*0.68], [x+w*0.75, y+cd*0.68] ]
      : [ [y+cd*0.35, x+w*0.25], [y+cd*0.35, x+w*0.75], [y+cd*0.68, x+w*0.25], [y+cd*0.68, x+w*0.75] ];
    return (
      <g stroke={F.furS} strokeWidth={F.hw} fill={F.kit}>
        {horiz
          ? <rect x={x} y={y} width={w} height={cd} fill="rgba(195,185,165,0.30)" />
          : <rect x={y} y={x} width={cd} height={w} fill="rgba(195,185,165,0.30)" />}
        {positions.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={bR}
            fill="rgba(60,55,50,0.22)" stroke={F.furS} strokeWidth={F.hw} />
        ))}
      </g>
    );
  };

  if (isWide) {
    // L-shape counter: back wall + left wall
    const backW  = rw;
    const sideH  = cl(m(1.5), m(0.9), rh - cd - m(0.6));
    const stoveW = m(0.6);
    const sinkW  = m(0.55);

    return (
      <g fill="none">
        {/* Back counter */}
        <rect x={rx} y={ry} width={backW} height={cd}
          fill={F.kit} stroke={F.furS} strokeWidth={F.sw} />
        <line x1={rx} y1={ry + cd} x2={rx + backW} y2={ry + cd}
          stroke={F.furS} strokeWidth={F.hw} />

        {/* Left side counter */}
        <rect x={rx} y={ry + cd} width={cd} height={sideH}
          fill={F.kit} stroke={F.furS} strokeWidth={F.sw} />

        {/* Sink in back counter (right portion) */}
        <Sink x={rx + backW - sinkW - m(0.2)} y={ry} w={sinkW} horiz />

        {/* Stove in back counter (left-centre) */}
        <Stove x={rx + m(0.5)} y={ry} w={stoveW} horiz />

        {/* Island if wide */}
        {hasIsland && (() => {
          const iW = m(1.2), iH = m(0.7);
          const iX = rx + (rw - iW) / 2 + m(0.2);
          const iY = ry + cd + m(0.7);
          return (
            iX + iW < rx + rw - m(0.2) && iY + iH < ry + rh - m(0.2) ? (
              <g>
                <rect x={iX} y={iY} width={iW} height={iH}
                  fill={F.kit} stroke={F.furS} strokeWidth={F.sw} rx="2" />
                <line x1={iX + m(0.1)} y1={iY + iH/2} x2={iX + iW - m(0.1)} y2={iY + iH/2}
                  stroke={F.furS} strokeWidth={F.hw} strokeDasharray="3 2" />
              </g>
            ) : null
          );
        })()}
      </g>
    );
  } else {
    // Single wall / galley: counter along back (top) wall
    const backH  = rh;
    const sinkW  = m(0.55);
    const stoveW = m(0.6);

    return (
      <g fill="none">
        <rect x={rx} y={ry} width={cd} height={backH}
          fill={F.kit} stroke={F.furS} strokeWidth={F.sw} />
        <Sink x={ry + m(0.4)} y={rx} w={sinkW} horiz={false} />
        <Stove x={ry + sinkW + m(0.55)} y={rx} w={stoveW} horiz={false} />
      </g>
    );
  }
}

// ─── BATHROOM ────────────────────────────────────────────────────────────────

function BathroomFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(1.1) || rh < m(1.3)) return null;

  const isWC   = room.type === "toilet";
  const isWide = rw >= rh;
  const pad    = m(0.05);

  // WC
  const wcW  = m(0.38), wcD = m(0.62);
  // Basin
  const bsW  = m(0.48), bsD = m(0.36);
  // Shower
  const shS  = cl(m(0.9), m(0.7), Math.min(rw, rh) - m(0.2));

  if (isWide) {
    // Horizontal layout: WC left, basin centre/right, shower right (if large)
    const wcX = rx + pad, wcY = ry + (rh - wcD) / 2;
    const bsX = rx + wcW + m(0.15), bsY = ry + pad;
    const shX = rx + rw - shS - pad, shY = ry + (rh - shS) / 2;
    const hasShower = !isWC && rw >= m(2.4);

    return (
      <g>
        {/* WC */}
        <rect x={wcX} y={wcY} width={wcW} height={m(0.20)}
          fill={F.bath} stroke={F.bathS} strokeWidth={F.sw} rx="1" />
        <ellipse cx={wcX + wcW/2} cy={wcY + wcD*0.6} rx={wcW/2 - 1} ry={wcD*0.38}
          fill={F.bath} stroke={F.bathS} strokeWidth={F.sw} />

        {/* Basin */}
        {bsX + bsW < (hasShower ? shX - m(0.1) : rx + rw - pad) && (
          <>
            <rect x={bsX} y={bsY} width={bsW} height={bsD}
              fill={F.bath} stroke={F.bathS} strokeWidth={F.sw} rx="4" />
            <circle cx={bsX + bsW/2} cy={bsY + bsD/2} r={m(0.05)}
              fill={F.bathS} />
          </>
        )}

        {/* Shower */}
        {hasShower && (
          <>
            <rect x={shX} y={shY} width={shS} height={shS}
              fill="rgba(185,215,232,0.22)" stroke={F.bathS} strokeWidth={F.sw} />
            <line x1={shX} y1={shY} x2={shX + shS} y2={shY + shS}
              stroke={F.bathS} strokeWidth={F.hw} opacity={0.4} />
            <line x1={shX + shS} y1={shY} x2={shX} y2={shY + shS}
              stroke={F.bathS} strokeWidth={F.hw} opacity={0.4} />
            <circle cx={shX + shS/2} cy={shY + shS/2} r={m(0.12)}
              fill={F.bathS} opacity={0.35} />
          </>
        )}
      </g>
    );
  } else {
    // Vertical layout: WC top, basin below, shower at bottom
    const wcX = rx + (rw - wcD) / 2, wcY = ry + pad;
    const bsX = rx + pad, bsY = ry + wcD + m(0.18);
    const shX = rx + (rw - shS) / 2, shY = ry + rh - shS - pad;
    const hasShower = !isWC && rh >= m(2.4);

    return (
      <g>
        {/* WC */}
        <rect x={wcX} y={wcY} width={wcD} height={m(0.20)}
          fill={F.bath} stroke={F.bathS} strokeWidth={F.sw} rx="1" />
        <ellipse cx={wcX + wcD/2} cy={wcY + wcW*0.75} rx={wcD*0.38} ry={wcW/2 - 1}
          fill={F.bath} stroke={F.bathS} strokeWidth={F.sw} />

        {/* Basin */}
        {bsY + bsD < (hasShower ? shY - m(0.1) : ry + rh - pad) && (
          <>
            <rect x={bsX} y={bsY} width={bsD} height={bsW}
              fill={F.bath} stroke={F.bathS} strokeWidth={F.sw} rx="4" />
            <circle cx={bsX + bsD/2} cy={bsY + bsW/2} r={m(0.05)}
              fill={F.bathS} />
          </>
        )}

        {/* Shower */}
        {hasShower && (
          <>
            <rect x={shX} y={shY} width={shS} height={shS}
              fill="rgba(185,215,232,0.22)" stroke={F.bathS} strokeWidth={F.sw} />
            <line x1={shX} y1={shY} x2={shX + shS} y2={shY + shS}
              stroke={F.bathS} strokeWidth={F.hw} opacity={0.4} />
            <line x1={shX + shS} y1={shY} x2={shX} y2={shY + shS}
              stroke={F.bathS} strokeWidth={F.hw} opacity={0.4} />
            <circle cx={shX + shS/2} cy={shY + shS/2} r={m(0.12)}
              fill={F.bathS} opacity={0.35} />
          </>
        )}
      </g>
    );
  }
}

// ─── PARKING / CAR PORCH ─────────────────────────────────────────────────────

function ParkingFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(1.6) && rh < m(1.6)) return null;

  // Orient car along the longer room axis
  const landscape = rw >= rh;
  // Compact sedan: ~3.8m long × 1.7m wide — leave margin of ~0.5m around
  const margin = m(0.45);
  const carL = landscape
    ? cl(m(3.8), m(2.2), rw - margin * 2)
    : cl(m(3.8), m(2.2), rh - margin * 2);
  const carW = landscape
    ? cl(m(1.7), m(1.1), rh - margin)
    : cl(m(1.7), m(1.1), rw - margin);

  const carX = rx + (rw - (landscape ? carL : carW)) / 2;
  const carY = ry + (rh - (landscape ? carW : carL)) / 2;
  const cw   = landscape ? carL : carW;   // svg width
  const ch   = landscape ? carW : carL;   // svg height

  return (
    <g>
      {/* Drop shadow */}
      <rect x={carX + 3} y={carY + 3} width={cw} height={ch} rx="6"
        fill="rgba(0,0,0,0.10)" />
      {/* Car body — near-white sedan */}
      <rect x={carX} y={carY} width={cw} height={ch} rx="6"
        fill={F.car} stroke={F.carS} strokeWidth={F.sw} />
      {/* Windscreen — dark tinted glass */}
      <rect x={carX + cw*0.12} y={carY + ch*0.07} width={cw*0.76} height={ch*0.19}
        fill={F.carW} stroke={F.carS} strokeWidth={F.hw} rx="3" />
      {/* Rear window — dark tinted glass */}
      <rect x={carX + cw*0.14} y={carY + ch*0.74} width={cw*0.72} height={ch*0.17}
        fill={F.carW} stroke={F.carS} strokeWidth={F.hw} rx="3" />
      {/* Side windows */}
      <rect x={carX + cw*0.10} y={carY + ch*0.30} width={cw*0.22} height={ch*0.13}
        fill={F.carW} stroke={F.carS} strokeWidth={F.hw} rx="1" />
      <rect x={carX + cw*0.68} y={carY + ch*0.30} width={cw*0.22} height={ch*0.13}
        fill={F.carW} stroke={F.carS} strokeWidth={F.hw} rx="1" />
      <rect x={carX + cw*0.10} y={carY + ch*0.44} width={cw*0.22} height={ch*0.13}
        fill={F.carW} stroke={F.carS} strokeWidth={F.hw} rx="1" />
      <rect x={carX + cw*0.68} y={carY + ch*0.44} width={cw*0.22} height={ch*0.13}
        fill={F.carW} stroke={F.carS} strokeWidth={F.hw} rx="1" />
      {/* Roof panel centre */}
      <rect x={carX + cw*0.15} y={carY + ch*0.30} width={cw*0.70} height={ch*0.38}
        fill="rgba(220,222,228,0.50)" stroke="none" rx="1" />
      {/* Wheels — 4 corners, dark with rim */}
      {([
        [carX - cw*0.05, carY + ch*0.08],
        [carX + cw*0.88, carY + ch*0.08],
        [carX - cw*0.05, carY + ch*0.78],
        [carX + cw*0.88, carY + ch*0.78],
      ] as [number,number][]).map(([wx, wy], i) => (
        <g key={i}>
          <ellipse cx={wx + cw*0.085} cy={wy + ch*0.065}
            rx={cw*0.085} ry={ch*0.065}
            fill="rgba(30,35,42,0.90)" />
          <ellipse cx={wx + cw*0.085} cy={wy + ch*0.065}
            rx={cw*0.048} ry={ch*0.038}
            fill="rgba(140,145,155,0.70)" />
        </g>
      ))}
    </g>
  );
}

// ─── FRONT GARDEN / EXTERIOR LANDSCAPING ────────────────────────────────────

/** Dense shrub cluster — multiple overlapping circles for a bushy appearance */
function ShrubCluster({ cx, cy, r }: { cx:number; cy:number; r:number }) {
  const offsets: [number,number,number][] = [
    [0, 0, r], [-r*0.55, -r*0.25, r*0.72], [r*0.55, -r*0.25, r*0.72],
    [-r*0.4, r*0.45, r*0.65], [r*0.4, r*0.45, r*0.65],
  ];
  return (
    <g>
      {offsets.map(([dx, dy, cr], i) => (
        <circle key={i} cx={cx+dx} cy={cy+dy} r={cr}
          fill={F.shrub} stroke={F.shrubS} strokeWidth={0.4} opacity={0.85} />
      ))}
      <circle cx={cx} cy={cy} r={r*0.35} fill={F.shrubS} opacity={0.18} />
    </g>
  );
}

function FrontGardenElements({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);

  // Stepping stone pathway — centre of room, running vertically
  const pathW  = m(0.9);
  const stoneW = m(0.5), stoneH = m(0.35);
  const nStones = Math.max(2, Math.floor((rh - m(0.4)) / (stoneH + m(0.25))));
  const pathX  = rx + (rw - pathW) / 2;
  const pathStartY = ry + m(0.3);

  // Boundary shrubs — dense clusters along left and bottom edges
  const shrubR = cl(m(0.42), m(0.28), Math.min(rw, rh) * 0.18);
  const shrubs: [number, number][] = [];

  // Left column of shrubs
  if (rh >= m(1.2)) {
    const nLeft = Math.max(1, Math.floor(rh / (shrubR * 2.2)));
    for (let i = 0; i < nLeft; i++) {
      shrubs.push([rx + shrubR * 0.7, ry + shrubR * 0.7 + i * (rh / nLeft)]);
    }
  }
  // Bottom row of shrubs
  if (rw >= m(2.0)) {
    const nBottom = Math.max(1, Math.floor(rw / (shrubR * 2.2)));
    for (let i = 0; i < nBottom; i++) {
      shrubs.push([rx + shrubR * 0.7 + i * (rw / nBottom), ry + rh - shrubR * 0.7]);
    }
  }
  // Corner trees (larger)
  const treeR = cl(m(0.55), m(0.32), Math.min(rw, rh) * 0.22);
  const trees: [number, number][] = [];
  if (rw >= m(3.5) && rh >= m(2.0)) {
    trees.push([rx + rw - treeR - m(0.12), ry + treeR + m(0.12)]);
  }
  if (rh >= m(3.0) && rw >= m(2.5)) {
    trees.push([rx + treeR + m(0.12), ry + rh - treeR - m(0.12)]);
  }

  return (
    <g>
      {/* Shrub clusters along boundaries */}
      {shrubs.map(([cx, cy], i) => (
        <ShrubCluster key={`sh${i}`} cx={cx} cy={cy} r={shrubR} />
      ))}
      {/* Corner trees */}
      {trees.map(([cx, cy], i) => (
        <Tree key={`tr${i}`} cx={cx} cy={cy} r={treeR} />
      ))}
      {/* Stepping stone pathway — deterministic slight size variation */}
      {nStones > 0 && Array.from({ length: nStones }).map((_, i) => {
        const sy = pathStartY + i * ((rh - m(0.4) - stoneH) / Math.max(1, nStones - 1));
        const vary = [1.0, 0.92, 0.97, 0.94, 0.99][i % 5];
        const w  = stoneW * vary;
        const h  = stoneH * (0.92 + (i % 3) * 0.04);
        return (
          <rect key={i} x={pathX + (pathW - w)/2} y={sy} width={w} height={h} rx="3"
            fill={F.step} stroke={F.pathS} strokeWidth={0.5} />
        );
      })}
    </g>
  );
}

// ─── ENTRANCE GATE ───────────────────────────────────────────────────────────

function EntranceGateElements({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);

  // Boundary wall posts at corners
  const postS = Math.max(m(0.18), 6);
  // Gate opening (centred or left-aligned)
  const gateW = cl(m(3.0), m(2.5), rw * 0.60);
  const gateX = rx + (rw - gateW) / 2;

  // Gate bars — thicker for visibility
  const nBars = Math.max(4, Math.round(gateW / m(0.22)));
  const barW  = 2.5;

  // Paving in gate area
  const pathH = rh;

  return (
    <g>
      {/* Paving path through gate */}
      <PavingSlabs x={gateX} y={ry} w={gateW} h={pathH} />

      {/* Boundary wall segments (left and right of gate) */}
      <rect x={rx} y={ry + rh * 0.2} width={gateX - rx} height={m(0.23)}
        fill="rgba(180,168,148,0.70)" stroke="rgba(90,80,65,0.80)" strokeWidth={0.8} />
      <rect x={gateX + gateW} y={ry + rh * 0.2} width={rx + rw - gateX - gateW} height={m(0.23)}
        fill="rgba(180,168,148,0.70)" stroke="rgba(90,80,65,0.80)" strokeWidth={0.8} />

      {/* Gate posts */}
      <rect x={gateX - postS} y={ry} width={postS} height={rh}
        fill="rgba(150,135,110,0.65)" stroke={F.gate} strokeWidth={0.8} />
      <rect x={gateX + gateW} y={ry} width={postS} height={rh}
        fill="rgba(150,135,110,0.65)" stroke={F.gate} strokeWidth={0.8} />

      {/* Gate bars (left leaf) */}
      {Array.from({ length: Math.ceil(nBars / 2) }).map((_, i) => (
        <line key={`l${i}`}
          x1={gateX + (i + 0.5) * (gateW/2) / Math.ceil(nBars/2)} y1={ry + rh * 0.05}
          x2={gateX + (i + 0.5) * (gateW/2) / Math.ceil(nBars/2)} y2={ry + rh * 0.95}
          stroke={F.gate} strokeWidth={barW} />
      ))}
      {/* Gate bars (right leaf) */}
      {Array.from({ length: Math.ceil(nBars / 2) }).map((_, i) => (
        <line key={`r${i}`}
          x1={gateX + gateW/2 + (i + 0.5) * (gateW/2) / Math.ceil(nBars/2)} y1={ry + rh * 0.05}
          x2={gateX + gateW/2 + (i + 0.5) * (gateW/2) / Math.ceil(nBars/2)} y2={ry + rh * 0.95}
          stroke={F.gate} strokeWidth={barW} />
      ))}
      {/* Gate horizontal rails */}
      <line x1={gateX} y1={ry + rh * 0.25} x2={gateX + gateW/2} y2={ry + rh * 0.25}
        stroke={F.gate} strokeWidth={2} />
      <line x1={gateX + gateW/2} y1={ry + rh * 0.25} x2={gateX + gateW} y2={ry + rh * 0.25}
        stroke={F.gate} strokeWidth={2} />
      <line x1={gateX} y1={ry + rh * 0.75} x2={gateX + gateW/2} y2={ry + rh * 0.75}
        stroke={F.gate} strokeWidth={2} />
      <line x1={gateX + gateW/2} y1={ry + rh * 0.75} x2={gateX + gateW} y2={ry + rh * 0.75}
        stroke={F.gate} strokeWidth={2} />
    </g>
  );
}

// ─── FOYER / ENTRY STEPS ─────────────────────────────────────────────────────

function FoyerElements({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);

  // Entry mat
  const matW = cl(m(1.0), m(0.7), rw - m(0.4));
  const matD = m(0.5);
  const matX = rx + (rw - matW) / 2;
  const matY = ry + m(0.15);

  return (
    <g>
      {/* Entry mat */}
      <rect x={matX} y={matY} width={matW} height={matD}
        fill="rgba(165,120,80,0.25)" stroke="rgba(120,85,55,0.55)" strokeWidth={0.8} rx="2" />
      <rect x={matX + m(0.06)} y={matY + m(0.06)} width={matW - m(0.12)} height={matD - m(0.12)}
        fill="none" stroke="rgba(120,85,55,0.35)" strokeWidth={0.5} rx="1" />
    </g>
  );
}

// ─── DISPATCHER ──────────────────────────────────────────────────────────────

export function RoomFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  switch (room.type) {
    case "master_bedroom":
    case "bedroom":
      return <BedroomFurniture room={room} ox={ox} oy={oy} />;
    case "living":
    case "family_lounge":
      return <LivingFurniture room={room} ox={ox} oy={oy} />;
    case "dining":
      return <DiningFurniture room={room} ox={ox} oy={oy} />;
    case "kitchen":
      return <KitchenFurniture room={room} ox={ox} oy={oy} />;
    case "bathroom":
    case "toilet":
      return <BathroomFurniture room={room} ox={ox} oy={oy} />;
    case "parking":
      return <ParkingFurniture room={room} ox={ox} oy={oy} />;
    case "front_garden":
      return <FrontGardenElements room={room} ox={ox} oy={oy} />;
    case "entrance_gate":
      return <EntranceGateElements room={room} ox={ox} oy={oy} />;
    case "foyer":
      return <FoyerElements room={room} ox={ox} oy={oy} />;
    default:
      return null;
  }
}
