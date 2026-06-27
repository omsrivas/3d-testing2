/**
 * FurnitureSymbols.tsx — Realistic architectural plan-view furniture.
 * All dimensions calibrated to BASE_SCALE = 45 px/m.
 */

import React from "react";
import type { Room } from "@/lib/layoutEngine";

const S = 45;
const m = (v: number) => v * S;
const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Palette ──────────────────────────────────────────────────────────────────
const F = {
  // Wood surfaces
  woodLight:  "#D6BC8E",
  woodMid:    "#C4A86E",
  woodDark:   "#A8854C",
  woodGrain:  "rgba(80,52,18,0.13)",
  woodEdge:   "rgba(60,38,12,0.75)",

  // Upholstery
  upholLight: "#DACED0",
  upholMid:   "#C8BEB8",
  upholBack:  "#B0A49A",
  upholStroke:"rgba(55,42,32,0.80)",

  // Bathroom
  bathFill:   "#D8EEF6",
  bathRim:    "#A8CCE0",
  bathStroke: "rgba(18,62,100,0.82)",
  bathDrain:  "rgba(18,62,100,0.60)",

  // Kitchen
  counterFill:"#D0C8BC",
  counterEdge:"rgba(65,55,40,0.80)",
  sinkFill:   "#BDD8E8",
  sinkStroke: "rgba(18,62,100,0.80)",
  burnerRing: "rgba(48,42,36,0.50)",
  burnerCentr:"rgba(48,42,36,0.30)",

  // Car
  carBody:    "#E8EAEE",
  carGlass:   "rgba(18,28,52,0.78)",
  carCabin:   "rgba(165,170,178,0.55)",
  carDoor:    "rgba(40,50,65,0.30)",
  carStroke:  "rgba(32,42,58,0.88)",
  carTyre:    "rgba(22,26,32,0.92)",
  carWheel:   "rgba(120,128,140,0.70)",
  carMirror:  "rgba(180,185,192,0.85)",

  // Landscape
  shrubFill:  "#6BA84E",
  shrubDark:  "#4A8030",
  treeFill:   "#78B858",
  treeShadow: "rgba(32,78,18,0.22)",
  stoneFill:  "#C8BEA8",
  stoneStroke:"rgba(110,98,78,0.70)",
  pathFill:   "#C0B498",
  gateFill:   "rgba(60,48,32,0.88)",
  matFill:    "rgba(148,108,72,0.28)",
  matStroke:  "rgba(110,78,48,0.55)",

  lw: 0.6,    // light line weight
  mw: 0.9,    // medium line weight
  hw: 1.2,    // heavy line weight
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Grain lines across a rectangle — horizontal or 45° diagonal */
function GrainLines({ x, y, w, h, angle = 0, spacing = 10, color = F.woodGrain }:
  { x:number; y:number; w:number; h:number; angle?:number; spacing?:number; color?:string }) {
  if (angle === 0) {
    const n = Math.floor(h / spacing);
    return (
      <g stroke={color} strokeWidth="0.5">
        {Array.from({ length: n }).map((_, i) => (
          <line key={i} x1={x} y1={y + (i + 0.5) * h / n} x2={x + w} y2={y + (i + 0.5) * h / n} />
        ))}
      </g>
    );
  }
  // 45° diagonal grain
  const lines = [];
  for (let d = -h; d < w + h; d += spacing) {
    lines.push(
      <line key={d}
        x1={x + Math.max(0, d)} y1={y + Math.max(0, -d)}
        x2={x + Math.min(w, d + h)} y2={y + Math.min(h, h + d - (d > 0 ? 0 : 0))}
        stroke={color} strokeWidth="0.5" />
    );
  }
  return <g clipPath={`url(#gc-${Math.round(x)}-${Math.round(y)})`}>{lines}</g>;
}

/** Dining chair in plan view — seat + back rail */
function DiningChair({ cx, cy, facingDown, size = m(0.44) }:
  { cx:number; cy:number; facingDown:boolean; size?:number }) {
  const sw = size, sd = size * 0.88;
  const backH = size * 0.20;
  const legOff = size * 0.06;

  return facingDown ? (
    // Chair faces down: back rail at top
    <g>
      {/* Legs (4 small squares) */}
      <rect x={cx - sw/2 + legOff} y={cy - sd/2 + legOff}     width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx + sw/2 - legOff - 4} y={cy - sd/2 + legOff} width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx - sw/2 + legOff} y={cy + sd/2 - legOff - 4} width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx + sw/2 - legOff - 4} y={cy + sd/2 - legOff - 4} width={4} height={4} fill={F.woodDark} rx="0.5" />
      {/* Seat pad */}
      <rect x={cx - sw/2} y={cy - sd/2 + backH} width={sw} height={sd - backH}
        fill={F.upholMid} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
      {/* Seat pad inner border */}
      <rect x={cx - sw/2 + 3} y={cy - sd/2 + backH + 3} width={sw - 6} height={sd - backH - 6}
        fill="none" stroke={F.upholStroke} strokeWidth="0.4" rx="1.5" />
      {/* Back rail */}
      <rect x={cx - sw/2} y={cy - sd/2} width={sw} height={backH}
        fill={F.woodMid} stroke={F.woodEdge} strokeWidth={F.lw} rx="1.5" />
    </g>
  ) : (
    // Chair faces up: back rail at bottom
    <g>
      <rect x={cx - sw/2 + legOff} y={cy - sd/2 + legOff}     width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx + sw/2 - legOff - 4} y={cy - sd/2 + legOff} width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx - sw/2 + legOff} y={cy + sd/2 - legOff - 4} width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx + sw/2 - legOff - 4} y={cy + sd/2 - legOff - 4} width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx - sw/2} y={cy - sd/2} width={sw} height={sd - backH}
        fill={F.upholMid} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
      <rect x={cx - sw/2 + 3} y={cy - sd/2 + 3} width={sw - 6} height={sd - backH - 6}
        fill="none" stroke={F.upholStroke} strokeWidth="0.4" rx="1.5" />
      <rect x={cx - sw/2} y={cy + sd/2 - backH} width={sw} height={backH}
        fill={F.woodMid} stroke={F.woodEdge} strokeWidth={F.lw} rx="1.5" />
    </g>
  );
}

/** Side chair — rotated 90° for left/right of dining table */
function SideChair({ cx, cy, facingRight, size = m(0.44) }:
  { cx:number; cy:number; facingRight:boolean; size?:number }) {
  const sw = size, sd = size * 0.88;
  const backH = size * 0.20;
  const legOff = size * 0.06;

  return facingRight ? (
    <g>
      <rect x={cx - sw/2 + legOff} y={cy - sd/2 + legOff}       width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx + sw/2 - legOff - 4} y={cy - sd/2 + legOff}   width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx - sw/2 + legOff} y={cy + sd/2 - legOff - 4}   width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx + sw/2 - legOff - 4} y={cy + sd/2 - legOff-4} width={4} height={4} fill={F.woodDark} rx="0.5" />
      {/* Seat */}
      <rect x={cx - sw/2} y={cy - sd/2} width={sw - backH} height={sd}
        fill={F.upholMid} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
      <rect x={cx - sw/2 + 3} y={cy - sd/2 + 3} width={sw - backH - 6} height={sd - 6}
        fill="none" stroke={F.upholStroke} strokeWidth="0.4" rx="1.5" />
      {/* Back rail right */}
      <rect x={cx + sw/2 - backH} y={cy - sd/2} width={backH} height={sd}
        fill={F.woodMid} stroke={F.woodEdge} strokeWidth={F.lw} rx="1.5" />
    </g>
  ) : (
    <g>
      <rect x={cx - sw/2 + legOff} y={cy - sd/2 + legOff}       width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx + sw/2 - legOff - 4} y={cy - sd/2 + legOff}   width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx - sw/2 + legOff} y={cy + sd/2 - legOff - 4}   width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx + sw/2 - legOff - 4} y={cy + sd/2 - legOff-4} width={4} height={4} fill={F.woodDark} rx="0.5" />
      <rect x={cx - sw/2 + backH} y={cy - sd/2} width={sw - backH} height={sd}
        fill={F.upholMid} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
      <rect x={cx - sw/2 + backH + 3} y={cy - sd/2 + 3} width={sw - backH - 6} height={sd - 6}
        fill="none" stroke={F.upholStroke} strokeWidth="0.4" rx="1.5" />
      <rect x={cx - sw/2} y={cy - sd/2} width={backH} height={sd}
        fill={F.woodMid} stroke={F.woodEdge} strokeWidth={F.lw} rx="1.5" />
    </g>
  );
}

// ─── BEDROOM ─────────────────────────────────────────────────────────────────

function BedroomFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(2.0) || rh < m(2.2)) return null;

  const isMaster = room.type === "master_bedroom";
  // Bed frame dimensions
  const bedW  = m(isMaster ? 1.60 : 1.40);
  const bedD  = m(isMaster ? 2.00 : 1.92);
  const hdH   = m(0.14);    // headboard depth
  const hdThk = m(0.10);    // headboard thickness visual
  const stW   = m(0.48), stD = m(0.48);
  const wdW   = cl(m(isMaster ? 2.00 : 1.65), m(1.2), rw - m(0.2));
  const wdD   = m(0.58);

  const edge  = m(0.12);
  const bedX  = rx + (rw - bedW) / 2;
  const bedY  = ry + edge;
  const hasST = rw >= bedW + stW * 2 + m(0.12);
  const hasWD = rh >= bedD + wdD + m(0.85);
  const wdX   = rx + (rw - wdW) / 2;
  const wdY   = ry + rh - wdD - edge;
  const panels = Math.max(2, Math.round(wdW / m(0.58)));
  const stY   = bedY + hdH + m(0.10);

  return (
    <g fill="none">
      {/* ── BED FRAME ── */}
      {/* Drop shadow */}
      <rect x={bedX + 2} y={bedY + 2} width={bedW} height={bedD}
        fill="rgba(0,0,0,0.09)" rx="2" />
      {/* Mattress base */}
      <rect x={bedX} y={bedY} width={bedW} height={bedD}
        fill="#EDE8E0" stroke={F.woodEdge} strokeWidth={F.mw} rx="2" />

      {/* ── HEADBOARD ── solid walnut panel */}
      <rect x={bedX - hdThk} y={bedY - hdH} width={bedW + hdThk * 2} height={hdH + 6}
        fill={F.woodMid} stroke={F.woodEdge} strokeWidth={F.hw} rx="2" />
      {/* Headboard panel groove lines */}
      {isMaster
        ? [bedX + bedW * 0.35, bedX + bedW * 0.65].map((lx, i) => (
          <line key={i} x1={lx} y1={bedY - hdH + 2} x2={lx} y2={bedY + 4}
            stroke={F.woodDark} strokeWidth="0.6" />
        ))
        : <line x1={bedX + bedW / 2} y1={bedY - hdH + 2} x2={bedX + bedW / 2} y2={bedY + 4}
            stroke={F.woodDark} strokeWidth="0.6" />
      }

      {/* ── PILLOWS ── */}
      {isMaster ? (<>
        <rect x={bedX + m(0.12)} y={bedY + m(0.06)}
          width={m(0.62)} height={m(0.42)} fill="#F5F0E8" stroke={F.upholStroke} strokeWidth={F.lw} rx="6" />
        <rect x={bedX + bedW - m(0.74)} y={bedY + m(0.06)}
          width={m(0.62)} height={m(0.42)} fill="#F5F0E8" stroke={F.upholStroke} strokeWidth={F.lw} rx="6" />
      </>) : (
        <rect x={bedX + m(0.12)} y={bedY + m(0.06)}
          width={bedW - m(0.24)} height={m(0.42)} fill="#F5F0E8" stroke={F.upholStroke} strokeWidth={F.lw} rx="6" />
      )}

      {/* ── SHEET FOLD LINE ── */}
      <line x1={bedX + m(0.08)} y1={bedY + m(0.62)}
            x2={bedX + bedW - m(0.08)} y2={bedY + m(0.62)}
        stroke={F.upholStroke} strokeWidth="0.5" strokeDasharray="5 3" />

      {/* ── DUVET STITCHING / QUILT LINE ── */}
      <rect x={bedX + m(0.08)} y={bedY + m(0.64)} width={bedW - m(0.16)} height={bedD - m(0.70)}
        fill="none" stroke="rgba(160,145,128,0.35)" strokeWidth="0.5" rx="3"
        strokeDasharray="8 4" />

      {/* ── SIDE TABLES ── */}
      {hasST && (<>
        {/* Left side table */}
        <rect x={bedX - stW - m(0.06)} y={stY} width={stW} height={stD}
          fill={F.woodLight} stroke={F.woodEdge} strokeWidth={F.lw} rx="2" />
        {/* Table top grain */}
        <line x1={bedX - stW - m(0.06) + 4} y1={stY + stD * 0.5}
              x2={bedX - m(0.06) - 4}         y2={stY + stD * 0.5}
          stroke={F.woodGrain} strokeWidth="0.5" />
        {/* Lamp base */}
        <circle cx={bedX - stW/2 - m(0.06)} cy={stY + stD * 0.38} r={m(0.10)}
          fill="rgba(248,232,168,0.55)" stroke={F.woodEdge} strokeWidth="0.5" />
        <circle cx={bedX - stW/2 - m(0.06)} cy={stY + stD * 0.38} r={m(0.04)}
          fill={F.woodDark} />

        {/* Right side table */}
        <rect x={bedX + bedW + m(0.06)} y={stY} width={stW} height={stD}
          fill={F.woodLight} stroke={F.woodEdge} strokeWidth={F.lw} rx="2" />
        <line x1={bedX + bedW + m(0.06) + 4} y1={stY + stD * 0.5}
              x2={bedX + bedW + stW + m(0.06) - 4} y2={stY + stD * 0.5}
          stroke={F.woodGrain} strokeWidth="0.5" />
        <circle cx={bedX + bedW + stW/2 + m(0.06)} cy={stY + stD * 0.38} r={m(0.10)}
          fill="rgba(248,232,168,0.55)" stroke={F.woodEdge} strokeWidth="0.5" />
        <circle cx={bedX + bedW + stW/2 + m(0.06)} cy={stY + stD * 0.38} r={m(0.04)}
          fill={F.woodDark} />
      </>)}

      {/* ── WARDROBE ── sliding door style */}
      {hasWD && (<>
        {/* Shadow */}
        <rect x={wdX + 2} y={wdY + 2} width={wdW} height={wdD}
          fill="rgba(0,0,0,0.08)" />
        {/* Carcass */}
        <rect x={wdX} y={wdY} width={wdW} height={wdD}
          fill={F.woodMid} stroke={F.woodEdge} strokeWidth={F.hw} />
        {/* Sliding door tracks (top + bottom horizontal lines) */}
        <line x1={wdX + 3} y1={wdY + 5} x2={wdX + wdW - 3} y2={wdY + 5}
          stroke={F.woodDark} strokeWidth="0.5" />
        <line x1={wdX + 3} y1={wdY + wdD - 5} x2={wdX + wdW - 3} y2={wdY + wdD - 5}
          stroke={F.woodDark} strokeWidth="0.5" />
        {/* Panel dividers */}
        {Array.from({ length: panels - 1 }).map((_, i) => (
          <line key={i}
            x1={wdX + (i + 1) * wdW / panels} y1={wdY + 5}
            x2={wdX + (i + 1) * wdW / panels} y2={wdY + wdD - 5}
            stroke={F.woodDark} strokeWidth="0.7" />
        ))}
        {/* Door pull handles */}
        {Array.from({ length: panels }).map((_, i) => {
          const hx = wdX + (i + 0.5) * wdW / panels;
          return (
            <rect key={i} x={hx - 6} y={wdY + wdD / 2 - 2} width={12} height={4}
              fill="rgba(80,65,45,0.50)" rx="1" />
          );
        })}
      </>)}
    </g>
  );
}

// ─── LIVING ROOM ─────────────────────────────────────────────────────────────

function LivingFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(2.6) || rh < m(2.6)) return null;

  const isWide = rw >= rh;
  const pad    = m(0.16);

  if (isWide) {
    // Sofa along top wall, TV unit along bottom
    const sofaW = cl(m(2.20), m(1.80), rw - m(1.0));
    const sofaD = m(0.90);   // total depth incl back
    const backD = m(0.16);   // sofa back thickness
    const armW  = m(0.20);   // armrest width
    const seats = Math.max(2, Math.round((sofaW - armW * 2) / m(0.68)));
    const seatW = (sofaW - armW * 2) / seats;

    const tvW   = cl(m(1.80), m(1.20), rw - m(0.8));
    const tvD   = m(0.42);
    const ctW   = cl(m(1.10), m(0.75), sofaW - m(0.5));
    const ctD   = m(0.50);

    const sofaX = rx + (rw - sofaW) / 2;
    const sofaY = ry + pad;
    const tvX   = rx + (rw - tvW) / 2;
    const tvY   = ry + rh - tvD - pad;
    const ctX   = rx + (rw - ctW) / 2;
    const ctY   = sofaY + sofaD + m(0.42);

    // Accent chairs (if wide enough)
    const hasChairs = rw > m(4.2);
    const acW = m(0.80), acD = m(0.80);
    const acBackD = m(0.15);

    return (
      <g fill="none">
        {/* ── TV UNIT / CREDENZA ── */}
        <rect x={tvX + 1.5} y={tvY + 1.5} width={tvW} height={tvD}
          fill="rgba(0,0,0,0.09)" rx="2" />
        <rect x={tvX} y={tvY} width={tvW} height={tvD}
          fill={F.woodMid} stroke={F.woodEdge} strokeWidth={F.hw} rx="2" />
        {/* Cabinet doors (3 panels) */}
        {[tvX + tvW * 0.05, tvX + tvW * 0.38, tvX + tvW * 0.71].map((px, i) => {
          const pw = tvW * 0.26;
          return (
            <g key={i}>
              <rect x={px} y={tvY + 4} width={pw} height={tvD - 8}
                fill={F.woodLight} stroke={F.woodEdge} strokeWidth="0.5" rx="1" />
              <circle cx={px + pw / 2} cy={tvY + tvD / 2} r={2.5} fill={F.woodDark} />
            </g>
          );
        })}
        {/* TV screen above unit (flat on wall, shown as thin dark rect) */}
        <rect x={tvX + m(0.18)} y={tvY - m(0.08)}
          width={tvW - m(0.36)} height={m(0.06)}
          fill="rgba(22,30,50,0.55)" stroke={F.woodEdge} strokeWidth="0.4" rx="1" />

        {/* ── SOFA ── */}
        {/* Shadow */}
        <rect x={sofaX - armW + 2} y={sofaY + 2} width={sofaW + armW * 2} height={sofaD}
          fill="rgba(0,0,0,0.09)" rx="3" />
        {/* Sofa back (top) */}
        <rect x={sofaX} y={sofaY} width={sofaW} height={backD}
          fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.mw} rx="2" />
        {/* Armrests */}
        <rect x={sofaX - armW} y={sofaY} width={armW} height={sofaD - m(0.06)}
          fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.mw} rx="2" />
        <rect x={sofaX + sofaW} y={sofaY} width={armW} height={sofaD - m(0.06)}
          fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.mw} rx="2" />
        {/* Seat cushions */}
        {Array.from({ length: seats }).map((_, i) => {
          const cx = sofaX + i * seatW;
          return (
            <g key={i}>
              <rect x={cx + 1} y={sofaY + backD + 1} width={seatW - 2} height={sofaD - backD - 1}
                fill={F.upholLight} stroke={F.upholStroke} strokeWidth={F.lw} rx="1" />
              {/* Cushion inner stitching */}
              <rect x={cx + 4} y={sofaY + backD + 4} width={seatW - 8} height={sofaD - backD - 7}
                fill="none" stroke="rgba(100,88,78,0.22)" strokeWidth="0.5" rx="1" />
            </g>
          );
        })}
        {/* Sofa base front line */}
        <line x1={sofaX - armW} y1={sofaY + sofaD} x2={sofaX + sofaW + armW} y2={sofaY + sofaD}
          stroke={F.upholStroke} strokeWidth={F.lw} />

        {/* ── COFFEE TABLE ── */}
        {ctY + ctD < tvY - m(0.15) && (<>
          <rect x={ctX + 2} y={ctY + 2} width={ctW} height={ctD}
            fill="rgba(0,0,0,0.08)" rx="3" />
          <rect x={ctX} y={ctY} width={ctW} height={ctD}
            fill={F.woodLight} stroke={F.woodEdge} strokeWidth={F.mw} rx="3" />
          {/* Top panel inset */}
          <rect x={ctX + 5} y={ctY + 5} width={ctW - 10} height={ctD - 10}
            fill="none" stroke={F.woodGrain} strokeWidth="0.6" rx="2" />
          {/* Leg dots at corners */}
          {[[ctX + 8, ctY + 8], [ctX + ctW - 8, ctY + 8],
            [ctX + 8, ctY + ctD - 8], [ctX + ctW - 8, ctY + ctD - 8]].map(([lx, ly], i) => (
            <circle key={i} cx={lx} cy={ly} r={3} fill={F.woodMid} stroke={F.woodEdge} strokeWidth="0.4" />
          ))}
        </>)}

        {/* ── ACCENT CHAIRS ── (if room is wide) */}
        {hasChairs && (<>
          {/* Left accent chair */}
          <g>
            <rect x={rx + pad - armW} y={sofaY} width={acW + armW} height={acD}
              fill="rgba(0,0,0,0.07)" rx="2" />
            <rect x={rx + pad} y={sofaY} width={acW} height={acBackD}
              fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
            <rect x={rx + pad - armW} y={sofaY} width={armW} height={acD - m(0.05)}
              fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
            <rect x={rx + pad + acW} y={sofaY} width={armW} height={acD - m(0.05)}
              fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
            <rect x={rx + pad + 1} y={sofaY + acBackD + 1} width={acW - 2} height={acD - acBackD - 1}
              fill={F.upholLight} stroke={F.upholStroke} strokeWidth={F.lw} rx="1" />
          </g>
          {/* Right accent chair */}
          <g>
            <rect x={rx + rw - pad - acW - armW * 2} y={sofaY} width={acW + armW} height={acD}
              fill="rgba(0,0,0,0.07)" rx="2" />
            <rect x={rx + rw - pad - acW - armW} y={sofaY} width={acW} height={acBackD}
              fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
            <rect x={rx + rw - pad - acW - armW * 2} y={sofaY} width={armW} height={acD - m(0.05)}
              fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
            <rect x={rx + rw - pad - armW} y={sofaY} width={armW} height={acD - m(0.05)}
              fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.lw} rx="2" />
            <rect x={rx + rw - pad - acW - armW + 1} y={sofaY + acBackD + 1} width={acW - 2} height={acD - acBackD - 1}
              fill={F.upholLight} stroke={F.upholStroke} strokeWidth={F.lw} rx="1" />
          </g>
        </>)}
      </g>
    );
  } else {
    // Portrait: sofa on left wall, TV on right
    const sofaH = cl(m(2.10), m(1.60), rh - m(1.0));
    const sofaW = m(0.90);
    const backW = m(0.16);
    const armH  = m(0.20);
    const seats = Math.max(2, Math.round((sofaH - armH * 2) / m(0.68)));
    const seatH = (sofaH - armH * 2) / seats;

    const tvH   = cl(m(1.60), m(1.0), rh - m(0.8));
    const tvW   = m(0.42);
    const ctW   = m(0.50), ctH = cl(m(1.0), m(0.65), sofaH - m(0.4));

    const sofaX = rx + pad;
    const sofaY = ry + (rh - sofaH) / 2;
    const tvX   = rx + rw - tvW - pad;
    const tvY   = ry + (rh - tvH) / 2;
    const ctX   = sofaX + sofaW + m(0.42);
    const ctY   = ry + (rh - ctH) / 2;

    return (
      <g fill="none">
        {/* TV unit */}
        <rect x={tvX + 1.5} y={tvY + 1.5} width={tvW} height={tvH}
          fill="rgba(0,0,0,0.09)" rx="2" />
        <rect x={tvX} y={tvY} width={tvW} height={tvH}
          fill={F.woodMid} stroke={F.woodEdge} strokeWidth={F.hw} rx="2" />
        <rect x={tvX + m(0.05)} y={tvY + m(0.18)} width={tvW - m(0.10)} height={tvH - m(0.36)}
          fill={F.woodLight} stroke={F.woodEdge} strokeWidth="0.5" rx="1" />
        <circle cx={tvX + tvW / 2} cy={tvY + tvH / 2} r={2.5} fill={F.woodDark} />

        {/* Sofa */}
        <rect x={sofaX + 2} y={sofaY - armH + 2} width={sofaW} height={sofaH + armH * 2}
          fill="rgba(0,0,0,0.09)" rx="3" />
        <rect x={sofaX} y={sofaY} width={backW} height={sofaH}
          fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.mw} rx="2" />
        <rect x={sofaX} y={sofaY - armH} width={sofaW - m(0.05)} height={armH}
          fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.mw} rx="2" />
        <rect x={sofaX} y={sofaY + sofaH} width={sofaW - m(0.05)} height={armH}
          fill={F.upholBack} stroke={F.upholStroke} strokeWidth={F.mw} rx="2" />
        {Array.from({ length: seats }).map((_, i) => (
          <g key={i}>
            <rect x={sofaX + backW + 1} y={sofaY + i * seatH + 1} width={sofaW - backW - 1} height={seatH - 2}
              fill={F.upholLight} stroke={F.upholStroke} strokeWidth={F.lw} rx="1" />
            <rect x={sofaX + backW + 4} y={sofaY + i * seatH + 4} width={sofaW - backW - 7} height={seatH - 8}
              fill="none" stroke="rgba(100,88,78,0.22)" strokeWidth="0.5" rx="1" />
          </g>
        ))}

        {/* Coffee table */}
        {ctX + ctW < tvX - m(0.15) && (<>
          <rect x={ctX + 2} y={ctY + 2} width={ctW} height={ctH}
            fill="rgba(0,0,0,0.08)" rx="3" />
          <rect x={ctX} y={ctY} width={ctW} height={ctH}
            fill={F.woodLight} stroke={F.woodEdge} strokeWidth={F.mw} rx="3" />
          <rect x={ctX + 5} y={ctY + 5} width={ctW - 10} height={ctH - 10}
            fill="none" stroke={F.woodGrain} strokeWidth="0.6" rx="2" />
        </>)}
      </g>
    );
  }
}

// ─── DINING ROOM ─────────────────────────────────────────────────────────────

function DiningFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(1.9) || rh < m(1.9)) return null;

  const seats  = rw >= m(3.0) && rh >= m(3.0) ? 6 : 4;
  const tblW   = cl(m(seats === 6 ? 1.80 : 1.20), m(1.0), rw - m(1.2));
  const tblH   = cl(m(seats === 6 ? 0.88 : 0.80), m(0.68), rh - m(1.4));
  const tblX   = rx + (rw - tblW) / 2;
  const tblY   = ry + (rh - tblH) / 2;
  const gap    = m(0.10);
  const chSize = m(0.44);
  const nLong  = Math.max(1, Math.floor(tblW / m(0.56)));
  const nShort = seats === 6 ? 1 : 0;

  return (
    <g fill="none">
      {/* Table shadow */}
      <rect x={tblX + 2} y={tblY + 2} width={tblW} height={tblH}
        fill="rgba(0,0,0,0.09)" rx="3" />
      {/* Table top */}
      <rect x={tblX} y={tblY} width={tblW} height={tblH}
        fill={F.woodLight} stroke={F.woodEdge} strokeWidth={F.hw} rx="3" />
      {/* Table top edge band */}
      <rect x={tblX + 4} y={tblY + 4} width={tblW - 8} height={tblH - 8}
        fill="none" stroke={F.woodGrain} strokeWidth="0.6" rx="2" />
      {/* Wood grain lines */}
      {Array.from({ length: 4 }).map((_, i) => (
        <line key={i}
          x1={tblX + 8} y1={tblY + (i + 1) * tblH / 5}
          x2={tblX + tblW - 8} y2={tblY + (i + 1) * tblH / 5}
          stroke={F.woodGrain} strokeWidth="0.5" />
      ))}
      {/* Centre extension leaf line */}
      <line x1={tblX + tblW / 2} y1={tblY + 6} x2={tblX + tblW / 2} y2={tblY + tblH - 6}
        stroke={F.woodDark} strokeWidth="0.5" strokeDasharray="4 3" />

      {/* Chairs — top row */}
      {Array.from({ length: nLong }).map((_, i) => (
        <DiningChair key={`ct${i}`}
          cx={tblX + (i + 0.5) * tblW / nLong}
          cy={tblY - gap - chSize * 0.44}
          facingDown={false}
          size={chSize} />
      ))}
      {/* Chairs — bottom row */}
      {Array.from({ length: nLong }).map((_, i) => (
        <DiningChair key={`cb${i}`}
          cx={tblX + (i + 0.5) * tblW / nLong}
          cy={tblY + tblH + gap + chSize * 0.44}
          facingDown
          size={chSize} />
      ))}
      {/* Chairs — left side */}
      {nShort > 0 && Array.from({ length: nShort }).map((_, i) => (
        <SideChair key={`cl${i}`}
          cx={tblX - gap - chSize * 0.44}
          cy={tblY + (i + 0.5) * tblH / nShort}
          facingRight={false}
          size={chSize} />
      ))}
      {/* Chairs — right side */}
      {nShort > 0 && Array.from({ length: nShort }).map((_, i) => (
        <SideChair key={`cr${i}`}
          cx={tblX + tblW + gap + chSize * 0.44}
          cy={tblY + (i + 0.5) * tblH / nShort}
          facingRight
          size={chSize} />
      ))}
    </g>
  );
}

// ─── KITCHEN ─────────────────────────────────────────────────────────────────

function KitchenFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(1.6) || rh < m(1.6)) return null;

  const cd = m(0.60);   // counter depth
  const isWide = rw >= rh;

  /** Double-bowl sink */
  const DoubleSink = ({ x, y, along }: { x:number; y:number; along:"h"|"v" }) => {
    const sw = m(0.80), sh = m(0.46);
    const bw = (sw - 10) / 2;
    return along === "h" ? (
      <g>
        <rect x={x} y={y} width={sw} height={sh}
          fill={F.counterFill} stroke={F.counterEdge} strokeWidth={F.lw} />
        {/* Basin 1 */}
        <rect x={x + 3} y={y + 4} width={bw} height={sh - 8}
          fill={F.sinkFill} stroke={F.sinkStroke} strokeWidth={F.lw} rx="3" />
        <circle cx={x + 3 + bw / 2} cy={y + sh / 2} r={m(0.05)} fill={F.sinkStroke} />
        {/* Basin 2 */}
        <rect x={x + bw + 7} y={y + 4} width={bw} height={sh - 8}
          fill={F.sinkFill} stroke={F.sinkStroke} strokeWidth={F.lw} rx="3" />
        <circle cx={x + bw + 7 + bw / 2} cy={y + sh / 2} r={m(0.05)} fill={F.sinkStroke} />
        {/* Tap */}
        <circle cx={x + sw / 2} cy={y + 6} r={m(0.05)} fill={F.sinkStroke} />
        <line x1={x + sw / 2} y1={y + 6} x2={x + sw / 2} y2={y + 16}
          stroke={F.sinkStroke} strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ) : (
      <g>
        <rect x={y} y={x} width={sh} height={sw}
          fill={F.counterFill} stroke={F.counterEdge} strokeWidth={F.lw} />
        <rect x={y + 4} y={x + 3} width={sh - 8} height={bw}
          fill={F.sinkFill} stroke={F.sinkStroke} strokeWidth={F.lw} rx="3" />
        <circle cx={y + sh / 2} cy={x + 3 + bw / 2} r={m(0.05)} fill={F.sinkStroke} />
        <rect x={y + 4} y={x + bw + 7} width={sh - 8} height={bw}
          fill={F.sinkFill} stroke={F.sinkStroke} strokeWidth={F.lw} rx="3" />
        <circle cx={y + sh / 2} cy={x + bw + 7 + bw / 2} r={m(0.05)} fill={F.sinkStroke} />
        <circle cx={y + 6} cy={x + sw / 2} r={m(0.05)} fill={F.sinkStroke} />
        <line x1={y + 6} y1={x + sw / 2} x2={y + 16} y2={x + sw / 2}
          stroke={F.sinkStroke} strokeWidth="1.4" strokeLinecap="round" />
      </g>
    );
  };

  /** 4-burner gas cooktop */
  const Cooktop = ({ x, y, along }: { x:number; y:number; along:"h"|"v" }) => {
    const cw = m(0.60), ch = cd;
    const burners = along === "h"
      ? [[x + cw*0.26, y + ch*0.30], [x + cw*0.74, y + ch*0.30],
         [x + cw*0.26, y + ch*0.72], [x + cw*0.74, y + ch*0.72]] as [number,number][]
      : [[y + ch*0.30, x + cw*0.26], [y + ch*0.72, x + cw*0.26],
         [y + ch*0.30, x + cw*0.74], [y + ch*0.72, x + cw*0.74]] as [number,number][];
    const big = m(0.14), small = m(0.08);
    return along === "h" ? (
      <g>
        <rect x={x} y={y} width={cw} height={ch}
          fill="rgba(188,178,162,0.28)" stroke={F.counterEdge} strokeWidth={F.lw} />
        {burners.map(([bx, by], i) => (
          <g key={i}>
            <circle cx={bx} cy={by} r={big} fill="none" stroke={F.burnerRing} strokeWidth="1.5" />
            <circle cx={bx} cy={by} r={small} fill="none" stroke={F.burnerRing} strokeWidth="1.0" />
            <circle cx={bx} cy={by} r={m(0.025)} fill={F.burnerCentr} />
          </g>
        ))}
        {/* Control knobs */}
        <line x1={x + cw*0.1} y1={y + ch*0.92} x2={x + cw*0.9} y2={y + ch*0.92}
          stroke={F.counterEdge} strokeWidth="0.4" />
      </g>
    ) : (
      <g>
        <rect x={y} y={x} width={ch} height={cw}
          fill="rgba(188,178,162,0.28)" stroke={F.counterEdge} strokeWidth={F.lw} />
        {burners.map(([bx, by], i) => (
          <g key={i}>
            <circle cx={bx} cy={by} r={big} fill="none" stroke={F.burnerRing} strokeWidth="1.5" />
            <circle cx={bx} cy={by} r={small} fill="none" stroke={F.burnerRing} strokeWidth="1.0" />
            <circle cx={bx} cy={by} r={m(0.025)} fill={F.burnerCentr} />
          </g>
        ))}
      </g>
    );
  };

  if (isWide) {
    // L-shape: back counter + left counter
    const sideH = cl(m(1.50), m(0.85), rh - cd - m(0.5));
    return (
      <g fill="none">
        {/* Back counter strip */}
        <rect x={rx} y={ry} width={rw} height={cd}
          fill={F.counterFill} stroke={F.counterEdge} strokeWidth={F.mw} />
        {/* Counter edge line */}
        <line x1={rx} y1={ry + cd - 2} x2={rx + rw} y2={ry + cd - 2}
          stroke={F.counterEdge} strokeWidth="0.5" />
        {/* Left side counter */}
        <rect x={rx} y={ry + cd} width={cd} height={sideH}
          fill={F.counterFill} stroke={F.counterEdge} strokeWidth={F.mw} />
        <line x1={rx + cd - 2} y1={ry + cd} x2={rx + cd - 2} y2={ry + cd + sideH}
          stroke={F.counterEdge} strokeWidth="0.5" />
        {/* Cooktop — back counter, left section */}
        <Cooktop x={rx + m(0.25)} y={ry} along="h" />
        {/* Sink — back counter, right section */}
        <DoubleSink x={rx + rw - m(0.90)} y={ry} along="h" />
        {/* Upper cabinet dashed outline */}
        <rect x={rx + m(0.02)} y={ry + m(0.02)} width={rw - m(0.04)} height={cd - m(0.04)}
          fill="none" stroke="rgba(80,65,45,0.20)" strokeWidth="0.5"
          strokeDasharray="6 4" />
        {/* Fridge (lower left of left counter or room corner) */}
        {sideH >= m(0.75) && (() => {
          const fW = m(0.65), fH = m(0.68);
          return sideH >= fH + m(0.2) ? (
            <g>
              <rect x={rx} y={ry + cd + sideH - fH} width={fW} height={fH}
                fill={F.counterFill} stroke={F.counterEdge} strokeWidth={F.mw} rx="2" />
              <line x1={rx + fW / 2} y1={ry + cd + sideH - fH + 4}
                    x2={rx + fW / 2} y2={ry + cd + sideH - 4}
                stroke={F.counterEdge} strokeWidth="0.6" />
              {/* Handle */}
              <rect x={rx + fW * 0.20} y={ry + cd + sideH - fH / 2 - 3} width={6} height={14}
                fill="rgba(80,65,45,0.40)" rx="1" />
              <rect x={rx + fW * 0.64} y={ry + cd + sideH - fH / 2 - 3} width={6} height={14}
                fill="rgba(80,65,45,0.40)" rx="1" />
            </g>
          ) : null;
        })()}
      </g>
    );
  } else {
    // Single wall along left
    return (
      <g fill="none">
        <rect x={rx} y={ry} width={cd} height={rh}
          fill={F.counterFill} stroke={F.counterEdge} strokeWidth={F.mw} />
        <line x1={rx + cd - 2} y1={ry} x2={rx + cd - 2} y2={ry + rh}
          stroke={F.counterEdge} strokeWidth="0.5" />
        <DoubleSink x={ry + m(0.30)} y={rx} along="v" />
        <Cooktop x={ry + m(1.20)} y={rx} along="v" />
      </g>
    );
  }
}

// ─── BATHROOM ────────────────────────────────────────────────────────────────

function BathroomFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(1.0) || rh < m(1.2)) return null;

  const isWC   = room.type === "toilet";
  const isWide = rw >= rh;
  const pad    = m(0.06);

  // WC cistern + bowl dimensions
  const cisW = m(0.38), cisD = m(0.16);
  const bowlW = m(0.38), bowlD = m(0.50);

  // Basin pedestal
  const basW = m(0.50), basD = m(0.38);

  // Shower enclosure
  const shS = cl(m(0.92), m(0.70), Math.min(rw, rh) - m(0.18));

  if (isWide) {
    // WC left, basin centre, shower right
    const wcX  = rx + pad;
    const wcY  = ry + (rh - cisD - bowlD) / 2;
    const basX = rx + wcX - rx + cisW + m(0.18);
    const basY = ry + pad;
    const shX  = rx + rw - shS - pad;
    const shY  = ry + (rh - shS) / 2;
    const hasShower = !isWC && rw >= m(2.4);

    return (
      <g>
        {/* ── WC ── */}
        {/* Cistern (flat box against wall) */}
        <rect x={wcX} y={wcY} width={cisW} height={cisD}
          fill={F.bathFill} stroke={F.bathStroke} strokeWidth={F.mw} rx="2" />
        {/* Flush button */}
        <circle cx={wcX + cisW / 2} cy={wcY + cisD / 2} r={m(0.06)}
          fill={F.bathRim} stroke={F.bathStroke} strokeWidth="0.5" />
        {/* Pan / bowl */}
        <rect x={wcX + (cisW - bowlW) / 2} y={wcY + cisD} width={bowlW} height={bowlD}
          fill={F.bathFill} stroke={F.bathStroke} strokeWidth={F.mw} rx="8" />
        {/* Toilet seat (oval ring — slightly smaller) */}
        <rect x={wcX + (cisW - bowlW) / 2 + 3} y={wcY + cisD + 3} width={bowlW - 6} height={bowlD - 6}
          fill="none" stroke={F.bathRim} strokeWidth="1.5" rx="6" />
        {/* Bowl hole */}
        <ellipse cx={wcX + cisW / 2} cy={wcY + cisD + bowlD * 0.62}
          rx={bowlW * 0.32} ry={bowlD * 0.25}
          fill={F.bathRim} stroke={F.bathStroke} strokeWidth="0.5" />

        {/* ── BASIN ── */}
        {basX + basW < (hasShower ? shX - m(0.08) : rx + rw - pad) && (<>
          {/* Vanity shelf */}
          <rect x={basX} y={basY} width={basW} height={basD}
            fill={F.bathFill} stroke={F.bathStroke} strokeWidth={F.mw} rx="5" />
          {/* Inner basin bowl */}
          <rect x={basX + 5} y={basY + 5} width={basW - 10} height={basD - 10}
            fill={F.sinkFill} stroke={F.bathStroke} strokeWidth="0.8" rx="4" />
          {/* Drain */}
          <circle cx={basX + basW / 2} cy={basY + basD / 2} r={m(0.05)}
            fill={F.bathDrain} />
          {/* Tap */}
          <circle cx={basX + basW / 2} cy={basY + 6} r={m(0.05)} fill={F.bathStroke} />
          <line x1={basX + basW / 2} y1={basY + 6} x2={basX + basW / 2} y2={basY + 14}
            stroke={F.bathStroke} strokeWidth="1.2" strokeLinecap="round" />
        </>)}

        {/* ── SHOWER ── */}
        {hasShower && (<>
          {/* Glass screen line */}
          <rect x={shX} y={shY} width={shS} height={shS}
            fill="rgba(185,220,238,0.18)" stroke={F.bathStroke} strokeWidth={F.mw} />
          {/* Shower tray edge */}
          <rect x={shX + 3} y={shY + 3} width={shS - 6} height={shS - 6}
            fill="none" stroke={F.bathRim} strokeWidth="0.6" />
          {/* Showerhead position */}
          <circle cx={shX + shS * 0.75} cy={shY + shS * 0.25} r={m(0.12)}
            fill="none" stroke={F.bathStroke} strokeWidth="0.8" />
          <circle cx={shX + shS * 0.75} cy={shY + shS * 0.25} r={m(0.05)}
            fill={F.bathStroke} opacity="0.5" />
          {/* Drain */}
          <circle cx={shX + shS * 0.5} cy={shY + shS * 0.75} r={m(0.06)}
            fill="none" stroke={F.bathDrain} strokeWidth="1.2" />
          {/* Diagonal water direction marks */}
          <line x1={shX + 8} y1={shY + shS - 8} x2={shX + shS - 8} y2={shY + 8}
            stroke={F.bathRim} strokeWidth="0.4" opacity="0.5" />
        </>)}
      </g>
    );
  } else {
    // Vertical: WC top, basin below, shower at bottom
    const wcX  = rx + (rw - cisW) / 2;
    const wcY  = ry + pad;
    const basX = rx + pad;
    const basY = ry + cisD + bowlD + m(0.18);
    const shX  = rx + (rw - shS) / 2;
    const shY  = ry + rh - shS - pad;
    const hasShower = !isWC && rh >= m(2.4);

    return (
      <g>
        {/* Cistern */}
        <rect x={wcX} y={wcY} width={cisW} height={cisD}
          fill={F.bathFill} stroke={F.bathStroke} strokeWidth={F.mw} rx="2" />
        <circle cx={wcX + cisW / 2} cy={wcY + cisD / 2} r={m(0.06)}
          fill={F.bathRim} stroke={F.bathStroke} strokeWidth="0.5" />
        {/* Bowl */}
        <rect x={wcX + (cisW - bowlW) / 2} y={wcY + cisD} width={bowlW} height={bowlD}
          fill={F.bathFill} stroke={F.bathStroke} strokeWidth={F.mw} rx="8" />
        <rect x={wcX + (cisW - bowlW) / 2 + 3} y={wcY + cisD + 3} width={bowlW - 6} height={bowlD - 6}
          fill="none" stroke={F.bathRim} strokeWidth="1.5" rx="6" />
        <ellipse cx={wcX + cisW / 2} cy={wcY + cisD + bowlD * 0.62}
          rx={bowlW * 0.32} ry={bowlD * 0.25}
          fill={F.bathRim} stroke={F.bathStroke} strokeWidth="0.5" />

        {/* Basin */}
        {basY + basD < (hasShower ? shY - m(0.08) : ry + rh - pad) && (<>
          <rect x={basX} y={basY} width={basW} height={basD}
            fill={F.bathFill} stroke={F.bathStroke} strokeWidth={F.mw} rx="5" />
          <rect x={basX + 5} y={basY + 5} width={basW - 10} height={basD - 10}
            fill={F.sinkFill} stroke={F.bathStroke} strokeWidth="0.8" rx="4" />
          <circle cx={basX + basW / 2} cy={basY + basD / 2} r={m(0.05)} fill={F.bathDrain} />
          <circle cx={basX + basW / 2} cy={basY + 6} r={m(0.05)} fill={F.bathStroke} />
          <line x1={basX + basW / 2} y1={basY + 6} x2={basX + basW / 2} y2={basY + 14}
            stroke={F.bathStroke} strokeWidth="1.2" strokeLinecap="round" />
        </>)}

        {/* Shower */}
        {hasShower && (<>
          <rect x={shX} y={shY} width={shS} height={shS}
            fill="rgba(185,220,238,0.18)" stroke={F.bathStroke} strokeWidth={F.mw} />
          <rect x={shX + 3} y={shY + 3} width={shS - 6} height={shS - 6}
            fill="none" stroke={F.bathRim} strokeWidth="0.6" />
          <circle cx={shX + shS * 0.75} cy={shY + shS * 0.25} r={m(0.12)}
            fill="none" stroke={F.bathStroke} strokeWidth="0.8" />
          <circle cx={shX + shS * 0.75} cy={shY + shS * 0.25} r={m(0.05)}
            fill={F.bathStroke} opacity="0.5" />
          <circle cx={shX + shS * 0.5} cy={shY + shS * 0.75} r={m(0.06)}
            fill="none" stroke={F.bathDrain} strokeWidth="1.2" />
          <line x1={shX + 8} y1={shY + shS - 8} x2={shX + shS - 8} y2={shY + 8}
            stroke={F.bathRim} strokeWidth="0.4" opacity="0.5" />
        </>)}
      </g>
    );
  }
}

// ─── CAR PORCH — realistic compact sedan top view ────────────────────────────

function ParkingFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  if (rw < m(1.5) && rh < m(1.5)) return null;

  const landscape = rw >= rh;
  const margin    = m(0.40);
  const carL = landscape ? cl(m(3.80), m(2.5), rw - margin * 2) : cl(m(3.80), m(2.5), rh - margin * 2);
  const carW = landscape ? cl(m(1.72), m(1.2), rh - margin)     : cl(m(1.72), m(1.2), rw - margin);

  const carX = rx + (rw - (landscape ? carL : carW)) / 2;
  const carY = ry + (rh - (landscape ? carW : carL)) / 2;

  // In SVG space: cw = visual width, ch = visual height
  const cw = landscape ? carL : carW;
  const ch = landscape ? carW : carL;

  const wR  = Math.max(4, Math.min(cw * 0.075, ch * 0.095, 8.5));
  const rx2 = Math.min(10, cw * 0.08);

  return (
    <g>
      {/* ── Drop shadow ── */}
      <rect x={carX + 3} y={carY + 3} width={cw} height={ch}
        fill="rgba(0,0,0,0.14)" rx={rx2} />

      {/* ── Car body outline ── */}
      <rect x={carX} y={carY} width={cw} height={ch}
        fill={F.carBody} stroke={F.carStroke} strokeWidth="1.4" rx={rx2} />

      {/* ── Hood (front, 20% of length) ── */}
      <rect x={carX + cw * 0.02} y={carY + ch * 0.03}
        width={cw * 0.19} height={ch * 0.94}
        fill="rgba(220,224,230,0.60)" stroke="none" rx="4" />

      {/* ── Front windscreen ── */}
      <path d={`M ${carX + cw*0.18},${carY + ch*0.10}
                L ${carX + cw*0.30},${carY + ch*0.06}
                L ${carX + cw*0.30},${carY + ch*0.94}
                L ${carX + cw*0.18},${carY + ch*0.90} Z`}
        fill={F.carGlass} stroke={F.carStroke} strokeWidth="0.6" />

      {/* ── A-pillars (thin lines between windscreen and doors) ── */}
      <line x1={carX + cw*0.30} y1={carY + ch*0.06} x2={carX + cw*0.34} y2={carY + ch*0.03}
        stroke={F.carStroke} strokeWidth="1.2" />
      <line x1={carX + cw*0.30} y1={carY + ch*0.94} x2={carX + cw*0.34} y2={carY + ch*0.97}
        stroke={F.carStroke} strokeWidth="1.2" />

      {/* ── Cabin roof (central panel) ── */}
      <rect x={carX + cw*0.34} y={carY + ch*0.05}
        width={cw * 0.32} height={ch * 0.90}
        fill={F.carCabin} stroke="none" />

      {/* ── C-pillars ── */}
      <line x1={carX + cw*0.66} y1={carY + ch*0.05} x2={carX + cw*0.70} y2={carY + ch*0.08}
        stroke={F.carStroke} strokeWidth="1.2" />
      <line x1={carX + cw*0.66} y1={carY + ch*0.95} x2={carX + cw*0.70} y2={carY + ch*0.92}
        stroke={F.carStroke} strokeWidth="1.2" />

      {/* ── Rear windscreen ── */}
      <path d={`M ${carX + cw*0.70},${carY + ch*0.08}
                L ${carX + cw*0.82},${carY + ch*0.10}
                L ${carX + cw*0.82},${carY + ch*0.90}
                L ${carX + cw*0.70},${carY + ch*0.92} Z`}
        fill={F.carGlass} stroke={F.carStroke} strokeWidth="0.6" />

      {/* ── Boot/trunk ── */}
      <rect x={carX + cw*0.82} y={carY + ch*0.04}
        width={cw * 0.16} height={ch * 0.92}
        fill="rgba(210,214,220,0.50)" stroke="none" rx="3" />

      {/* ── Door seam lines ── */}
      {/* Front door / rear door split */}
      <line x1={carX + cw*0.50} y1={carY + ch*0.03} x2={carX + cw*0.50} y2={carY + ch*0.97}
        stroke="rgba(40,50,65,0.35)" strokeWidth="0.8" />

      {/* ── Door handles ── */}
      <rect x={carX + cw*0.41} y={carY + ch*0.10} width={cw*0.06} height={ch*0.06}
        fill={F.carDoor} rx="1" />
      <rect x={carX + cw*0.41} y={carY + ch*0.84} width={cw*0.06} height={ch*0.06}
        fill={F.carDoor} rx="1" />
      <rect x={carX + cw*0.56} y={carY + ch*0.10} width={cw*0.06} height={ch*0.06}
        fill={F.carDoor} rx="1" />
      <rect x={carX + cw*0.56} y={carY + ch*0.84} width={cw*0.06} height={ch*0.06}
        fill={F.carDoor} rx="1" />

      {/* ── Side mirrors ── */}
      <ellipse cx={carX + cw*0.18} cy={carY + ch*0.04} rx={cw*0.04} ry={ch*0.025}
        fill={F.carMirror} stroke={F.carStroke} strokeWidth="0.6" />
      <ellipse cx={carX + cw*0.18} cy={carY + ch*0.96} rx={cw*0.04} ry={ch*0.025}
        fill={F.carMirror} stroke={F.carStroke} strokeWidth="0.6" />

      {/* ── Front grille ── */}
      <rect x={carX + cw*0.02} y={carY + ch*0.30} width={cw*0.05} height={ch*0.40}
        fill="rgba(40,50,65,0.30)" stroke={F.carStroke} strokeWidth="0.5" rx="1" />

      {/* ── Wheels (4) with tyre and rim detail ── */}
      {([
        [carX + cw*0.18, carY + ch*0.10],
        [carX + cw*0.18, carY + ch*0.90],
        [carX + cw*0.78, carY + ch*0.10],
        [carX + cw*0.78, carY + ch*0.90],
      ] as [number,number][]).map(([wx, wy], i) => (
        <g key={i}>
          {/* Tyre */}
          <circle cx={wx} cy={wy} r={wR + 2}     fill={F.carTyre} />
          {/* Rim */}
          <circle cx={wx} cy={wy} r={wR}          fill="rgba(192,198,208,0.80)" stroke={F.carTyre} strokeWidth="0.6" />
          {/* Hub */}
          <circle cx={wx} cy={wy} r={wR * 0.38}   fill="rgba(140,148,160,0.70)" />
          {/* 4 spoke lines */}
          {[0, 1, 2, 3].map(s => {
            const a = (s * Math.PI) / 2;
            return (
              <line key={s}
                x1={wx + Math.cos(a) * wR * 0.38} y1={wy + Math.sin(a) * wR * 0.38}
                x2={wx + Math.cos(a) * wR * 0.85} y2={wy + Math.sin(a) * wR * 0.85}
                stroke={F.carTyre} strokeWidth="0.6" />
            );
          })}
        </g>
      ))}
    </g>
  );
}

// ─── FRONT GARDEN ─────────────────────────────────────────────────────────────

function Tree({ cx, cy, r }: { cx:number; cy:number; r:number }) {
  return (
    <g>
      <circle cx={cx + r * 0.12} cy={cy + r * 0.12} r={r}
        fill="rgba(0,0,0,0.10)" />
      <circle cx={cx} cy={cy} r={r}
        fill={F.treeFill} stroke={F.shrubDark} strokeWidth="0.6" />
      {/* Inner shadow arc */}
      <path d={`M ${cx - r*0.55},${cy + r*0.3} A ${r*0.55},${r*0.4} 0 0,1 ${cx + r*0.55},${cy + r*0.3}`}
        fill={F.treeShadow} />
      <circle cx={cx - r*0.2} cy={cy - r*0.2} r={r * 0.28}
        fill="rgba(120,175,85,0.35)" />
    </g>
  );
}

function ShrubCluster({ cx, cy, r }: { cx:number; cy:number; r:number }) {
  const pts: [number,number,number][] = [
    [0, 0, r], [-r*0.52, -r*0.22, r*0.70], [r*0.52, -r*0.22, r*0.70],
    [-r*0.36, r*0.42, r*0.62], [r*0.38, r*0.44, r*0.64],
  ];
  return (
    <g>
      {pts.map(([dx, dy, cr], i) => (
        <circle key={i} cx={cx + dx} cy={cy + dy} r={cr}
          fill={F.shrubFill} stroke={F.shrubDark} strokeWidth="0.35" opacity="0.82" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.30} fill={F.shrubDark} opacity="0.16" />
    </g>
  );
}

function FrontGardenElements({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  const shrubR = cl(m(0.40), m(0.24), Math.min(rw, rh) * 0.17);
  const treeR  = cl(m(0.52), m(0.30), Math.min(rw, rh) * 0.21);
  const shrubs: [number,number][] = [];

  const nLeft   = Math.max(1, Math.floor(rh / (shrubR * 2.3)));
  for (let i = 0; i < nLeft; i++)
    shrubs.push([rx + shrubR * 0.7, ry + shrubR * 0.8 + i * (rh / nLeft)]);

  const nBottom = Math.max(1, Math.floor(rw / (shrubR * 2.3)));
  if (rw >= m(1.8)) for (let i = 0; i < nBottom; i++)
    shrubs.push([rx + shrubR * 0.8 + i * (rw / nBottom), ry + rh - shrubR * 0.7]);

  const trees: [number,number][] = [];
  if (rw >= m(3.2) && rh >= m(1.8)) trees.push([rx + rw - treeR - m(0.12), ry + treeR + m(0.12)]);
  if (rh >= m(2.8) && rw >= m(2.2)) trees.push([rx + treeR + m(0.12), ry + rh - treeR - m(0.12)]);

  // Stepping stone path
  const pathW = m(0.85), stoneW = m(0.48), stoneH = m(0.32);
  const nSt   = Math.max(2, Math.floor((rh - m(0.4)) / (stoneH + m(0.22))));
  const pathX = rx + (rw - pathW) / 2;

  return (
    <g>
      {shrubs.map(([cx, cy], i) => <ShrubCluster key={`sh${i}`} cx={cx} cy={cy} r={shrubR} />)}
      {trees.map(([cx, cy], i)  => <Tree key={`tr${i}`} cx={cx} cy={cy} r={treeR} />)}
      {Array.from({ length: nSt }).map((_, i) => {
        const sy = ry + m(0.28) + i * ((rh - m(0.4) - stoneH) / Math.max(1, nSt - 1));
        const vary = [1.0, 0.93, 0.97, 0.95, 0.99][i % 5];
        return (
          <rect key={i}
            x={pathX + (pathW - stoneW * vary) / 2} y={sy}
            width={stoneW * vary} height={stoneH}
            fill={F.stoneFill} stroke={F.stoneStroke} strokeWidth="0.5" rx="3" />
        );
      })}
    </g>
  );
}

// ─── ENTRANCE GATE ────────────────────────────────────────────────────────────

function EntranceGateElements({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  const gateW = cl(m(2.8), m(1.8), rw * 0.50);
  const gateX = rx + (rw - gateW) / 2;
  const wallL = gateX - rx;
  const wallR = rx + rw - gateX - gateW;
  const postS = Math.max(m(0.22), 7);
  const nBars = Math.max(5, Math.round(gateW / m(0.20)));
  const midX  = gateX + gateW / 2;

  return (
    <g>
      <rect x={rx} y={ry} width={wallL} height={rh}
        fill="rgba(168,155,132,0.62)" stroke="rgba(70,58,42,0.72)" strokeWidth="0.8" />
      <rect x={gateX + gateW} y={ry} width={wallR} height={rh}
        fill="rgba(168,155,132,0.62)" stroke="rgba(70,58,42,0.72)" strokeWidth="0.8" />
      <rect x={gateX} y={ry} width={gateW} height={rh}
        fill="rgba(200,190,170,0.40)" />
      <rect x={gateX - postS} y={ry - rh * 0.08} width={postS} height={rh * 1.16}
        fill="rgba(88,74,52,0.90)" stroke="rgba(48,38,24,0.90)" strokeWidth="0.8" rx="1" />
      <rect x={gateX + gateW}   y={ry - rh * 0.08} width={postS} height={rh * 1.16}
        fill="rgba(88,74,52,0.90)" stroke="rgba(48,38,24,0.90)" strokeWidth="0.8" rx="1" />
      {Array.from({ length: nBars }).map((_, i) => (
        <line key={i}
          x1={gateX + (i + 0.5) * gateW / nBars} y1={ry + 1}
          x2={gateX + (i + 0.5) * gateW / nBars} y2={ry + rh - 1}
          stroke={F.gateFill} strokeWidth="2.0" strokeLinecap="round" />
      ))}
      {[0.30, 0.70].map((t, i) => (
        <g key={`rail${i}`}>
          <line x1={gateX} y1={ry + rh * t} x2={midX - 1} y2={ry + rh * t}
            stroke={F.gateFill} strokeWidth="1.8" />
          <line x1={midX + 1} y1={ry + rh * t} x2={gateX + gateW} y2={ry + rh * t}
            stroke={F.gateFill} strokeWidth="1.8" />
        </g>
      ))}
      <circle cx={gateX - postS - m(0.18)} cy={ry + rh * 0.5} r={m(0.13)}
        fill={F.shrubFill} stroke={F.shrubDark} strokeWidth="0.6" />
      <circle cx={gateX + gateW + postS + m(0.18)} cy={ry + rh * 0.5} r={m(0.13)}
        fill={F.shrubFill} stroke={F.shrubDark} strokeWidth="0.6" />
    </g>
  );
}

// ─── FOYER ────────────────────────────────────────────────────────────────────

function FoyerElements({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  const rx = ox + m(room.x), ry = oy + m(room.y);
  const rw = m(room.width),  rh = m(room.depth);
  const matW = cl(m(1.0), m(0.65), rw - m(0.3));
  const matD = m(0.50);
  const matX = rx + (rw - matW) / 2;
  const matY = ry + m(0.14);
  return (
    <g>
      <rect x={matX} y={matY} width={matW} height={matD}
        fill={F.matFill} stroke={F.matStroke} strokeWidth="0.8" rx="2" />
      <rect x={matX + m(0.06)} y={matY + m(0.06)} width={matW - m(0.12)} height={matD - m(0.12)}
        fill="none" stroke={F.matStroke} strokeWidth="0.45" rx="1" />
      {Array.from({ length: 3 }).map((_, i) => (
        <line key={i}
          x1={matX + m(0.08) + i * (matW - m(0.16)) / 4} y1={matY + m(0.08)}
          x2={matX + m(0.08) + i * (matW - m(0.16)) / 4} y2={matY + matD - m(0.08)}
          stroke={F.matStroke} strokeWidth="0.35" />
      ))}
    </g>
  );
}

// ─── DISPATCHER ──────────────────────────────────────────────────────────────

export function RoomFurniture({ room, ox, oy }: { room: Room; ox:number; oy:number }) {
  switch (room.type) {
    case "master_bedroom":
    case "bedroom":        return <BedroomFurniture   room={room} ox={ox} oy={oy} />;
    case "living":
    case "family_lounge":  return <LivingFurniture     room={room} ox={ox} oy={oy} />;
    case "dining":         return <DiningFurniture     room={room} ox={ox} oy={oy} />;
    case "kitchen":        return <KitchenFurniture    room={room} ox={ox} oy={oy} />;
    case "bathroom":
    case "toilet":         return <BathroomFurniture   room={room} ox={ox} oy={oy} />;
    case "parking":        return <ParkingFurniture    room={room} ox={ox} oy={oy} />;
    case "front_garden":   return <FrontGardenElements room={room} ox={ox} oy={oy} />;
    case "entrance_gate":  return <EntranceGateElements room={room} ox={ox} oy={oy} />;
    case "foyer":          return <FoyerElements       room={room} ox={ox} oy={oy} />;
    default:               return null;
  }
}
