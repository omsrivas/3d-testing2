/**
 * floorPlanner.ts – Realistic Indian Residential Layout Engine
 *
 * Generates authentic Indian house floor plans using a zone-based approach
 * modelled on actual residential architecture conventions in India.
 *
 * CANONICAL COORDINATE SYSTEM
 * ────────────────────────────
 *   p  : primary axis   — 0 = road-facing edge → grows toward back of plot
 *   s  : secondary axis — 0 = left edge (standing at road, facing house) → right
 *
 * GROUND FLOOR ZONE LAYOUT  (p = front → back)
 * ──────────────────────────────────────────────
 *   [p=0 .. gateEndP]                  ENTRANCE GATE     (full width)
 *   [p=gateEndP .. gardenEndP, s=cpW..S] FRONT GARDEN
 *   [p=gateEndP .. frontP,     s=0..cpW] CAR PORCH
 *   [p=gardenEndP .. frontP,   s=cpW..S] FOYER · LIVING · POOJA
 *   [p=frontP .. svcEndP, s=0..stairW]   STAIRCASE COLUMN (full service depth)
 *   [p=frontP .. transEndP, s=stairW..S] FAMILY LOUNGE · DINING
 *   [p=transEndP .. svcEndP, s=stairW..S] KITCHEN · UTILITY
 *   [p=svcEndP .. P]                   REAR ZONE (passage + toilet or beds+baths)
 *
 * UPPER FLOOR ZONE LAYOUT
 * ────────────────────────
 *   [p=0 .. balconyEnd, s=stairW..S]   BALCONY
 *   [p=balconyEnd .. stairP0]          PASSAGE / LOBBY (full width)
 *   [p=stairP0 .. stairP0+upperPl, s=0..stairW]  STAIRCASE (dog-leg footprint only)
 *   [p=stairP0+upperPl .. bedEndP]     BEDROOMS (full width, subdivided by s)
 *   [p=bedEndP .. P]                   BATHROOMS attached + COMMON W.C.
 */

import type {
  LayoutInput,
  PlacedRoom,
  RoomSpec,
  RoomType,
  VastuZone,
  FloorPlan,
} from "./types";

// ─── Snap & clamp helpers ─────────────────────────────────────────────────────

const SNAP = 0.3; // 300 mm planning grid
function sn(v: number): number { return Math.round(v / SNAP) * SNAP; }
function cl(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

// ─── ID counter ───────────────────────────────────────────────────────────────

let _ctr = 0;
export function resetCounter(): void { _ctr = 0; }
function uid(f: number) { return `room-f${f}-${++_ctr}`; }

// ─── Facing direction type ────────────────────────────────────────────────────

type Dir = "N" | "S" | "E" | "W";

// ─── Canonical axis sizes ─────────────────────────────────────────────────────
// P = depth from road; S = width perpendicular to road.

function axisSize(facing: Dir, W: number, D: number): { P: number; S: number } {
  const isEW = facing === "E" || facing === "W";
  return { P: isEW ? W : D, S: isEW ? D : W };
}

// ─── Canonical → plot coordinate transform ────────────────────────────────────

interface PR { x: number; y: number; width: number; depth: number }

function toPlot(
  p0: number, pl: number, s0: number, sl: number,
  facing: Dir, W: number, D: number,
): PR {
  switch (facing) {
    case "N": return { x: sn(s0),       y: sn(p0),       width: sn(sl), depth: sn(pl) };
    case "S": return { x: sn(W-s0-sl),  y: sn(D-p0-pl),  width: sn(sl), depth: sn(pl) };
    case "E": return { x: sn(W-p0-pl),  y: sn(s0),       width: sn(pl), depth: sn(sl) };
    case "W": return { x: sn(p0),       y: sn(D-s0-sl),  width: sn(pl), depth: sn(sl) };
  }
}

// ─── Room factory ─────────────────────────────────────────────────────────────

function mkRoom(
  type: RoomType, name: string, floor: number,
  p0: number, pl: number, s0: number, sl: number,
  facing: Dir, W: number, D: number,
): PlacedRoom {
  const r = toPlot(p0, pl, s0, sl, facing, W, D);
  return {
    id: uid(floor), name, type, floor,
    x: r.x, y: r.y, width: r.width, depth: r.depth,
    area: parseFloat((r.width * r.depth).toFixed(2)),
    vastuZone: "center" as VastuZone,
    spec: {
      type, name, widthRange: [0, 999], depthRange: [0, 999],
      preferredZones: ["center"], targetFloor: floor, priority: 50,
    } as RoomSpec,
  };
}

// ─── Stair reference shared across floors ─────────────────────────────────────

interface StairRef {
  p0: number;       // canonical p where stair starts (= frontP)
  pl: number;       // GROUND floor stair depth (covers full service column)
  upperPl: number;  // UPPER floor stair depth (dog-leg footprint only)
  s0: number;
  sl: number;       // stair width
}

// ─── Dog-leg stair depth (upper floors only) ──────────────────────────────────
// A dog-leg fits two parallel flights side-by-side → depth = half the total run.

const RISERS    = 18;
const TREAD     = 0.270;
const TOTAL_RUN = RISERS * TREAD; // ≈ 4.86 m

function dogLegDepth(stairW: number): number {
  if (stairW >= 1.5) return sn(cl(TOTAL_RUN / 2 + 0.3, 2.7, 3.6)); // dog-leg
  return sn(cl(TOTAL_RUN, 4.5, 5.4));                               // straight
}

// ─── Ground floor band calculator ────────────────────────────────────────────

interface GroundBands {
  hasGate:         boolean;
  hasFrontGarden:  boolean;
  gateEndP:        number;
  gardenEndP:      number;
  cpW:             number;
  frontP:          number;
  stairW:          number;
  groundStairPl:   number; // full left-column depth (frontP → svcEndP)
  upperStairPl:    number; // dog-leg footprint depth
  hasFamilyLounge: boolean;
  hasPoojaRoom:    boolean;
  transEndP:       number;
  svcEndP:         number;
  bedsHere:        number;
  bathsHere:       number;
  bedEndP:         number;
}

function computeGroundBands(
  P: number, S: number,
  hasParking: boolean,
  hasStair: boolean,
  bedsHere: number,
  bathsHere: number,
): GroundBands {

  // Minimum depth needed for all non-outdoor mandatory rooms
  const mandatoryMins = 2.1 + 2.1 + 1.8
    + (bedsHere > 0 ? 2.7 + 1.8 : 0);

  const hasGate       = P >= 7.5 && (P - 0.6) >= mandatoryMins;
  const gateEndP      = hasGate ? sn(cl(0.5, 0.3, 0.6)) : 0;
  const hasFrontGarden = hasGate && P >= 9.0 && (P - gateEndP - 1.2) >= mandatoryMins;
  const gardenLocalD  = hasFrontGarden ? sn(cl(P * 0.11, 0.9, 1.8)) : 0;
  const gardenEndP    = sn(gateEndP + gardenLocalD);

  // Car porch width
  let cpW = 0;
  if (hasParking) {
    const raw = sn(cl(S * 0.37, 2.7, 3.9));
    cpW = S - raw >= 3.3 ? raw : S >= 6.6 ? sn(S - 3.3) : 0;
  }
  const intS = S - cpW;

  // Foyer + Living zone
  const foyerLivD = sn(cl(P * 0.21, 2.1, 3.0));
  const frontP    = sn(gardenEndP + foyerLivD);
  const hasPoojaRoom = intS >= 4.5;

  // Stair sizing
  const stairW      = hasStair ? sn(cl(S * 0.19, 1.5, 1.8)) : 0;
  const upperStairPl = hasStair ? dogLegDepth(stairW) : 0;

  // Transition zone
  const transD    = sn(cl(P * 0.20, 2.1, 3.0));
  const transEndP = sn(frontP + transD);
  const hasFamilyLounge = intS - stairW >= 5.1;

  // Service zone
  const svcD      = sn(cl(P * 0.17, 1.8, 2.4));
  const svcEndP   = sn(transEndP + svcD);

  // Ground stair covers the FULL left column: frontP → svcEndP
  // (includes dog-leg flight + under-stair storage area)
  const groundStairPl = sn(svcEndP - frontP);

  // Rear zone: p = svcEndP → P (passage + toilet for multi-floor; beds+baths for single)
  const rearAvail = P - svcEndP;
  const canFitBeds = bedsHere > 0 && rearAvail >= (2.7 + 1.8);

  const actualBedsHere  = canFitBeds ? bedsHere  : 0;
  const actualBathsHere = canFitBeds ? bathsHere : 0;

  let bedEndP = svcEndP;
  if (actualBedsHere > 0) {
    const bedD = sn(cl(rearAvail * 0.62, 2.7, rearAvail - 1.5));
    bedEndP    = sn(svcEndP + bedD);
  }

  return {
    hasGate, hasFrontGarden, gateEndP, gardenEndP, cpW, frontP,
    stairW, groundStairPl, upperStairPl,
    hasFamilyLounge, hasPoojaRoom, transEndP, svcEndP,
    bedsHere: actualBedsHere, bathsHere: actualBathsHere, bedEndP,
  };
}

// ─── Ground floor planner ─────────────────────────────────────────────────────

function planGround(
  input: LayoutInput,
): { rooms: PlacedRoom[]; stairRef?: StairRef } {
  const { plotWidth: W, plotDepth: D, facingDirection: facing } = input;
  const { P, S } = axisSize(facing, W, D);
  const multi = input.floors > 1 || input.hasStaircase;
  const f     = 0;

  const bedsGround  = input.floors === 1
    ? input.bedrooms
    : (input.bedrooms > 2 ? 1 : 0);
  const bathsGround = bedsGround > 0 ? Math.min(bedsGround, input.bathrooms) : 0;

  const b = computeGroundBands(P, S, input.hasParking, multi, bedsGround, bathsGround);

  const rooms: PlacedRoom[] = [];
  let stairRef: StairRef | undefined;

  const add = (type: RoomType, name: string, p0: number, pl: number, s0: number, sl: number) => {
    if (pl < 0.28 || sl < 0.28) return;
    rooms.push(mkRoom(type, name, f, p0, pl, s0, sl, facing, W, D));
  };

  // ── ENTRANCE GATE ─────────────────────────────────────────────────────────
  if (b.hasGate) {
    add("entrance_gate", "Entrance Gate", 0, b.gateEndP, 0, S);
  }

  // ── CAR PORCH (left column, gateEndP → frontP) ───────────────────────────
  if (b.cpW > 0) {
    add("parking", "Car Porch", b.gateEndP, b.frontP - b.gateEndP, 0, b.cpW);
  }

  // ── FRONT GARDEN (right of car porch, thin strip) ────────────────────────
  if (b.hasFrontGarden) {
    const gD = b.gardenEndP - b.gateEndP;
    if (gD > 0.2) add("front_garden", "Front Garden", b.gateEndP, gD, b.cpW, S - b.cpW);
  }

  // ── FOYER · LIVING · POOJA (gardenEndP → frontP, right of car porch) ─────
  {
    const p0  = b.gardenEndP;
    const pl  = b.frontP - b.gardenEndP;
    const s0  = b.cpW;
    const avS = S - b.cpW;

    if (pl >= 1.8 && avS >= 3.0) {
      const poojaW = b.hasPoojaRoom ? sn(cl(avS * 0.20, 1.2, 1.8)) : 0;
      const foyerW = sn(cl(avS * 0.22, 1.5, 2.1));
      const livW   = avS - foyerW - poojaW;

      if (foyerW >= 1.5) add("foyer",  "Foyer",       p0, pl, s0,                  foyerW);
      if (livW   >= 2.7) add("living", "Living Room",  p0, pl, s0 + foyerW,         livW);
      if (poojaW >= 1.2) add("pooja",  "Pooja Room",   p0, pl, s0 + foyerW + livW,  poojaW);
    }
  }

  // ── STAIRCASE (left column, frontP → svcEndP, full service column height) ─
  if (b.stairW > 0) {
    add("staircase", "Staircase", b.frontP, b.groundStairPl, 0, b.stairW);
    stairRef = {
      p0: b.frontP,
      pl: b.groundStairPl,
      upperPl: b.upperStairPl,
      s0: 0,
      sl: b.stairW,
    };
  }

  // ── TRANSITION ZONE: FAMILY LOUNGE · DINING (frontP → transEndP, right of stair) ─
  {
    const p0  = b.frontP;
    const pl  = b.transEndP - b.frontP;
    const s0  = b.stairW;
    const avS = S - b.stairW;

    if (pl >= 1.8 && avS >= 2.4) {
      if (b.hasFamilyLounge && avS >= 5.1) {
        const famW = sn(cl(avS * 0.45, 2.4, 4.2));
        const dinW = avS - famW;
        if (famW >= 2.4) add("family_lounge", "Family Lounge", p0, pl, s0,          famW);
        if (dinW >= 2.4) add("dining",        "Dining Room",   p0, pl, s0 + famW,   dinW);
      } else {
        add("dining", "Dining Room", p0, pl, s0, avS);
      }
    }
  }

  // ── SERVICE ZONE: KITCHEN · UTILITY (transEndP → svcEndP, right of stair) ─
  {
    const p0  = b.transEndP;
    const pl  = b.svcEndP - b.transEndP;
    const s0  = b.stairW;
    const avS = S - b.stairW;

    if (pl >= 1.5 && avS >= 2.1) {
      const utilW = sn(cl(avS * 0.36, 1.5, 2.7));
      const kitW  = avS - utilW;
      if (kitW  >= 2.1) add("kitchen", "Kitchen",         p0, pl, s0,          kitW);
      if (utilW >= 1.5) add("utility", "Utility / Wash",   p0, pl, s0 + kitW,  utilW);
    }
  }

  // ── REAR ZONE: p = svcEndP → P ───────────────────────────────────────────
  const rearD = P - b.svcEndP;

  if (b.bedsHere > 0) {
    // ── BEDROOMS + BATHROOMS (single-floor house or small multi-floor) ───
    const bedEndP = b.bedEndP;
    const bedPl   = bedEndP - b.svcEndP;
    const bathPl  = P - bedEndP;
    const bedW    = sn(S / b.bedsHere);

    for (let i = 0; i < b.bedsHere; i++) {
      const s0 = sn(i * bedW);
      const sl = (i === b.bedsHere - 1) ? (S - s0) : bedW;
      const isMaster = (input.floors === 1 && i === 0) || b.bedsHere === 1;
      const bType: RoomType = isMaster ? "master_bedroom" : "bedroom";
      const bName = isMaster ? "Master Bedroom" : `Bedroom ${i + 1}`;

      if (bedPl >= 2.7 && sl >= 2.7) add(bType, bName, b.svcEndP, bedPl, s0, sl);

      if (i < b.bathsHere && bathPl >= 1.5) {
        const bathW  = sn(cl(sl * 0.55, 1.5, 2.1));
        const batName = isMaster ? "Bathroom" : `Bathroom ${i + 1}`;
        add("bathroom", batName, bedEndP, bathPl, s0, bathW);

        if (i === b.bedsHere - 1 && b.bathsHere > b.bedsHere) {
          const wcS = s0 + bathW;
          if (S - wcS >= 1.2) add("toilet", "Common W.C.", bedEndP, bathPl, wcS, S - wcS);
        }
      }
    }
  } else if (rearD >= 1.2) {
    // ── Multi-floor: rear zone becomes service passage + rear utility ────
    const passD = sn(cl(rearD * 0.35, 0.9, 1.5));
    const utilD = rearD - passD;
    if (passD >= 0.9) add("passage", "Rear Passage", b.svcEndP, passD, 0, S);
    if (utilD >= 1.2) {
      const rearP0 = sn(b.svcEndP + passD);
      // Split rear utility: WC on one side, utility yard on other
      const wcW  = sn(cl(S * 0.28, 1.5, 2.4));
      const uW   = S - wcW;
      if (utilD >= 1.8 && wcW  >= 1.5) add("toilet",  "Common W.C.",    rearP0, utilD, 0,    wcW);
      if (utilD >= 1.5 && uW   >= 1.5) add("utility", "Rear Utility",   rearP0, utilD, wcW, uW);
    }
  }

  return { rooms, stairRef };
}

// ─── Upper floor planner ─────────────────────────────────────────────────────

function planUpper(
  floor: number,
  input: LayoutInput,
  stairRef: StairRef | undefined,
  bedsHere: number,
  bathsHere: number,
  withBalcony: boolean,
): PlacedRoom[] {
  const { plotWidth: W, plotDepth: D, facingDirection: facing } = input;
  const { P, S } = axisSize(facing, W, D);
  const rooms: PlacedRoom[] = [];

  const add = (type: RoomType, name: string, p0: number, pl: number, s0: number, sl: number) => {
    if (pl < 0.28 || sl < 0.28) return;
    rooms.push(mkRoom(type, name, floor, p0, pl, s0, sl, facing, W, D));
  };

  // Key dimensions
  const stairW  = stairRef ? stairRef.sl   : 0;
  const stairP0 = stairRef ? stairRef.p0   : sn(P * 0.35);
  // Use the dog-leg depth on upper floors (not the full ground-floor column depth)
  const stairPl = stairRef ? stairRef.upperPl : 0;

  // ── BALCONY (road-facing, right of stair column) ──────────────────────────
  let balconyEnd = 0;
  if (withBalcony) {
    const balD = sn(cl(P * 0.12, 1.2, 1.8));
    const balW = sn(S - stairW);
    if (balW >= 1.8 && balD >= 1.2) {
      add("balcony", "Balcony", 0, balD, stairW, balW);
    }
    balconyEnd = balD;
  }

  // ── PASSAGE / LOBBY (full-width, balconyEnd → stairP0) ───────────────────
  // The left-front corner (s=0..stairW, p=0..balconyEnd) is a structural return
  // wall — intentional gap; no room required there.
  const passD = stairP0 - balconyEnd;
  if (passD >= 0.9) {
    add("passage", "Passage", balconyEnd, passD, 0, S);
  }

  // ── STAIRCASE (dog-leg footprint only on upper floors) ───────────────────
  if (stairRef && stairPl > 0) {
    add("staircase", "Staircase", stairP0, stairPl, stairRef.s0, stairRef.sl);
  }

  // ── BEDROOMS + BATHROOMS (start right after dog-leg stair ends) ──────────
  const bedStart  = stairP0 + stairPl;
  const rearAvail = P - bedStart; // exact, not snapped (avoids boundary overrun)

  if (bedsHere <= 0 || rearAvail < 4.2) return rooms;

  const bathD   = Math.min(sn(cl(rearAvail * 0.38, 1.8, 2.4)), rearAvail - 2.7);
  const bedD    = rearAvail - bathD;
  if (bedD < 2.7) return rooms;

  const bedEndP  = bedStart + bedD;
  const bathEndP = Math.min(P, bedStart + rearAvail);
  const bedW     = sn(S / bedsHere);
  const isMF     = floor === 1; // master on first floor only

  for (let i = 0; i < bedsHere; i++) {
    const s0 = sn(i * bedW);
    const sl = (i === bedsHere - 1) ? (S - s0) : bedW;
    if (sl < 2.7) continue;

    const isMaster = isMF && i === 0;
    const bType: RoomType = isMaster ? "master_bedroom" : "bedroom";
    const bName = isMaster ? "Master Bedroom" : `Bedroom ${i + 1}`;

    add(bType, bName, bedStart, bedD, s0, sl);

    if (i < bathsHere && bathD >= 1.5) {
      const bathW  = sn(cl(sl * 0.55, 1.5, 2.1));
      const batName = isMaster ? "Bathroom" : `Bathroom ${i + 1}`;
      add("bathroom", batName, bedEndP, bathEndP - bedEndP, s0, bathW);

      if (i === bedsHere - 1 && bathsHere > bedsHere) {
        const wcS = s0 + bathW;
        if (S - wcS >= 1.2) {
          add("toilet", "Common W.C.", bedEndP, bathEndP - bedEndP, wcS, S - wcS);
        }
      }
    }
  }

  return rooms;
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export function planAllFloors(
  _specs: RoomSpec[],   // derived from input directly; arg kept for API compat
  input: LayoutInput,
): FloorPlan[] {
  const plans: FloorPlan[] = [];

  // ── Ground floor ─────────────────────────────────────────────────────────
  const { rooms: g0, stairRef } = planGround(input);
  plans.push({ floor: 0, rooms: g0 });

  const bedsOnG  = g0.filter(r => r.type === "master_bedroom" || r.type === "bedroom").length;
  const bathsOnG = g0.filter(r => r.type === "bathroom" || r.type === "toilet").length;
  let bedsAssigned  = bedsOnG;
  let bathsAssigned = bathsOnG;

  // ── Upper floors ─────────────────────────────────────────────────────────
  for (let fl = 1; fl < input.floors; fl++) {
    const floorsLeft = input.floors - fl;
    const bedsLeft   = input.bedrooms  - bedsAssigned;
    const bathsLeft  = input.bathrooms - bathsAssigned;
    const bedsHere   = Math.max(0, Math.ceil(bedsLeft  / floorsLeft));
    const bathsHere  = Math.max(0, Math.ceil(bathsLeft / floorsLeft));
    const hasBal     = input.hasBalcony && fl === 1;

    const upper = planUpper(fl, input, stairRef, bedsHere, bathsHere, hasBal);
    plans.push({ floor: fl, rooms: upper });

    bedsAssigned  += bedsHere;
    bathsAssigned += bathsHere;
  }

  return plans;
}

/** Legacy stub kept for API compatibility. */
export function planFloor(
  floorIndex: number,
  _specs: RoomSpec[],
  _input: LayoutInput,
  _stairReservation?: { x: number; y: number; width: number; depth: number },
): FloorPlan {
  return { floor: floorIndex, rooms: [] };
}
