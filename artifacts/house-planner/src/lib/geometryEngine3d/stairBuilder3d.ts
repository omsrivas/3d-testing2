import type { Stair } from "@/lib/layoutEngine";
import type { BoxSpec } from "./types";
import {
  RISER_H, TREAD_T, LANDING_T,
  FLOOR_TO_FLOOR, PLINTH_H,
} from "./constants";

// ─── Stair geometry ────────────────────────────────────────────────────────────
// Each flight is represented as individual tread slabs.
//
// Key improvement: tread depth is FITTED to the available stair room run
// so treads never overflow the room boundary.
//
// Dog-leg stair: two parallel flights separated by an intermediate landing.
//   • Both flights ascend in the SAME horizontal direction.
//   • Flight 1 covers the first half of the room run.
//   • Landing slab spans the room width at mid-run / mid-height.
//   • Flight 2 covers the second half of the room run.
//
// Straight stair: single flight across the full room run.

export function buildStairs3d(stairs: Stair[]): BoxSpec[] {
  const specs: BoxSpec[] = [];
  let ctr = 0;

  for (const stair of stairs) {
    const baseY    = PLINTH_H + stair.fromFloor * FLOOR_TO_FLOOR;
    const totalH   = FLOOR_TO_FLOOR;
    const nRisers  = Math.round(totalH / RISER_H);  // ≈ 18
    const rH       = totalH / nRisers;               // exact riser height

    const goingS  = stair.direction === "S" || stair.direction === "N";
    const stepDir = (stair.direction === "N" || stair.direction === "W") ? -1 : 1;

    const ox = stair.x;
    const oz = stair.y;

    // Available run in the direction of ascent; tread width perpendicular to it
    const availableRun = goingS ? stair.depth : stair.width;
    const treadW       = goingS ? stair.width : stair.depth;
    const isDogLeg     = stair.type !== "straight";

    if (isDogLeg) {
      // ── Dog-leg: two equal-length flights with landing ───────────────────────
      const half1   = Math.ceil(nRisers / 2);
      const half2   = nRisers - half1;
      const run1    = availableRun * 0.45;   // first flight uses 45 % of run
      const run2    = availableRun * 0.45;   // second flight uses 45 %
      const tD1     = run1 / half1;
      const tD2     = run2 / half2;

      // Start offset from stair origin along ascent direction
      const startRun = availableRun * 0.05;  // 5 % buffer at entry

      // ── Flight 1 ─────────────────────────────────────────────────────────────
      for (let i = 0; i < half1; i++) {
        const cy   = baseY + i * rH + TREAD_T / 2;
        const dist = startRun + (i + 0.5) * tD1;
        pushTread(specs, `${stair.id}-f1-t${ctr++}`, goingS, stepDir,
          ox, oz, stair.width, stair.depth, treadW, tD1, dist, cy, stair.fromFloor);
      }

      // ── Landing slab at mid-height ────────────────────────────────────────────
      const landY     = baseY + half1 * rH;
      const landDist  = startRun + run1 + (availableRun - run1 - run2 - startRun * 2) / 2;

      if (goingS) {
        const cz = stair.direction === "S"
          ? oz + startRun + run1 + (availableRun * 0.10) / 2
          : oz + stair.depth - startRun - run1 - (availableRun * 0.10) / 2;
        specs.push({
          id: `stair-${stair.id}-landing`, role: "floor-slab",
          w: treadW, h: LANDING_T,
          d: availableRun * 0.10,       // 10 % of run for the landing
          cx: ox + stair.width / 2, cy: landY + LANDING_T / 2, cz,
          ry: 0, floor: stair.fromFloor,
        });
      } else {
        const cx = stair.direction === "E"
          ? ox + startRun + run1 + (availableRun * 0.10) / 2
          : ox + stair.width - startRun - run1 - (availableRun * 0.10) / 2;
        specs.push({
          id: `stair-${stair.id}-landing`, role: "floor-slab",
          w: availableRun * 0.10, h: LANDING_T, d: treadW,
          cx, cy: landY + LANDING_T / 2, cz: oz + stair.depth / 2,
          ry: 0, floor: stair.fromFloor,
        });
      }

      // ── Flight 2 ─────────────────────────────────────────────────────────────
      const flight2Start = startRun + run1 + availableRun * 0.10;
      for (let i = 0; i < half2; i++) {
        const cy   = baseY + (half1 + i) * rH + TREAD_T / 2;
        const dist = flight2Start + (i + 0.5) * tD2;
        pushTread(specs, `${stair.id}-f2-t${ctr++}`, goingS, stepDir,
          ox, oz, stair.width, stair.depth, treadW, tD2, dist, cy, stair.fromFloor);
      }

    } else {
      // ── Straight single-flight stair ──────────────────────────────────────────
      const tD = availableRun / nRisers;
      for (let i = 0; i < nRisers; i++) {
        const cy   = baseY + i * rH + TREAD_T / 2;
        const dist = (i + 0.5) * tD;
        pushTread(specs, `${stair.id}-t${ctr++}`, goingS, stepDir,
          ox, oz, stair.width, stair.depth, treadW, tD, dist, cy, stair.fromFloor);
      }
    }

    // ── Top landing (platform at arrival floor) ───────────────────────────────
    // A solid concrete slab bridging the last tread to the floor slab above.
    const arrivalY = baseY + FLOOR_TO_FLOOR;
    const padDepth = Math.max(0.9, availableRun * 0.15);  // ≥ 900 mm
    if (goingS) {
      const cz = stair.direction === "S"
        ? oz + availableRun - padDepth / 2
        : oz + padDepth / 2;
      specs.push({
        id: `stair-${stair.id}-toplanding`, role: "floor-slab",
        w: treadW, h: LANDING_T, d: padDepth,
        cx: ox + stair.width / 2, cy: arrivalY + LANDING_T / 2, cz,
        ry: 0, floor: stair.fromFloor + 1,
      });
    } else {
      const cx = stair.direction === "E"
        ? ox + availableRun - padDepth / 2
        : ox + padDepth / 2;
      specs.push({
        id: `stair-${stair.id}-toplanding`, role: "floor-slab",
        w: padDepth, h: LANDING_T, d: treadW,
        cx, cy: arrivalY + LANDING_T / 2, cz: oz + stair.depth / 2,
        ry: 0, floor: stair.fromFloor + 1,
      });
    }
  }

  return specs;
}

// ─── Emit one tread box ───────────────────────────────────────────────────────
function pushTread(
  specs:   BoxSpec[],
  id:      string,
  goingS:  boolean,
  dir:     number,     // +1 = S or E, -1 = N or W
  ox:      number,
  oz:      number,
  roomW:   number,
  roomD:   number,
  treadW:  number,
  tD:      number,     // tread depth (horizontal)
  dist:    number,     // distance from origin along ascent axis
  cy:      number,
  floor:   number,
): void {
  if (goingS) {
    const czBase = dir > 0
      ? oz + dist
      : oz + roomD - dist;
    specs.push({
      id, role: "stair-tread",
      w: treadW, h: TREAD_T, d: tD,
      cx: ox + roomW / 2, cy, cz: czBase,
      ry: 0, floor,
    });
  } else {
    const cxBase = dir > 0
      ? ox + dist
      : ox + roomW - dist;
    specs.push({
      id, role: "stair-tread",
      w: tD, h: TREAD_T, d: treadW,
      cx: cxBase, cy, cz: oz + roomD / 2,
      ry: 0, floor,
    });
  }
}
