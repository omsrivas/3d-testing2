/**
 * floorPlanner.ts – Indian Residential Layout Engine (Band Placement)
 *
 * Deterministic, facing-aware floor planner that produces realistic Indian
 * residential layouts using a canonical coordinate system + band allocators.
 *
 * COORDINATE SYSTEM
 * ─────────────────
 * All placement logic works in "canonical" space where:
 *   primary axis p  : 0 = road-facing edge → grows toward back of plot
 *   secondary axis s: 0 = left edge (when standing at road, facing house) → right
 *
 * Transforms to plot (x, y) coords per facing direction:
 *   N-facing: p→Y,  s→X         pSize=plotDepth, sSize=plotWidth
 *   S-facing: p→¬Y, s→¬X        pSize=plotDepth, sSize=plotWidth
 *   E-facing: p→¬X, s→Y         pSize=plotWidth,  sSize=plotDepth
 *   W-facing: p→X,  s→¬Y        pSize=plotWidth,  sSize=plotDepth
 *
 * BAND LAYOUT (ground floor)
 * ──────────────────────────
 *   Band A [public]    : Car porch · Foyer · Living room · Pooja room
 *   Band B [service]   : Staircase · Dining · Kitchen · Utility
 *   Band C [passage]   : Passage (only if multi-floor) — spans to stair end
 *   Band D [bedrooms]  : Bedroom rows
 *   Band E [bathrooms] : Bathrooms directly behind bedrooms
 *
 * BAND LAYOUT (upper floors)
 * ──────────────────────────
 *   Band A [front]   : Balcony (road-facing portion)
 *   Band B [passage] : Passage → staircase zone (same canonical pos as G floor)
 *   Band C [private] : Bedrooms
 *   Band D [baths]   : Bathrooms behind bedrooms
 */

import type {
  LayoutInput,
  PlacedRoom,
  RoomSpec,
  RoomType,
  VastuZone,
  FloorPlan,
} from "./types";

// ─── Grid ─────────────────────────────────────────────────────────────────────
const SNAP = 0.3; // 300 mm module

function sn(v: number): number { return Math.round(v / SNAP) * SNAP; }
function cl(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

// ─── ID counter ───────────────────────────────────────────────────────────────
let _ctr = 0;
export function resetCounter(): void { _ctr = 0; }
function uid(f: number) { return `room-f${f}-${++_ctr}`; }

// ─── Canonical ↔ plot transforms ──────────────────────────────────────────────
type Dir = "N" | "S" | "E" | "W";

function axisSize(facing: Dir, W: number, D: number) {
  const isEW = facing === "E" || facing === "W";
  return { P: isEW ? W : D, S: isEW ? D : W };
}

interface PR { x: number; y: number; width: number; depth: number }

function toPlot(p0: number, pl: number, s0: number, sl: number,
  facing: Dir, W: number, D: number): PR {
  const [pa, pb, sa, sb] = [sn(p0), sn(pl), sn(s0), sn(sl)];
  switch (facing) {
    case "N": return { x: sa,       y: pa,       width: sb, depth: pb };
    case "S": return { x: W-sa-sb,  y: D-pa-pb,  width: sb, depth: pb };
    case "E": return { x: W-pa-pb,  y: sa,       width: pb, depth: sb };
    case "W": return { x: pa,       y: D-sa-sb,  width: pb, depth: sb };
  }
}

function toCanonical(r: PR, facing: Dir, W: number, D: number) {
  // Converts a placed room back to canonical coords.
  switch (facing) {
    case "N": return { p0: r.y,     pl: r.depth, s0: r.x,       sl: r.width  };
    case "S": return { p0: D-r.y-r.depth, pl: r.depth, s0: W-r.x-r.width, sl: r.width  };
    case "E": return { p0: W-r.x-r.width,  pl: r.width, s0: r.y,       sl: r.depth };
    case "W": return { p0: r.x,     pl: r.width, s0: D-r.y-r.depth, sl: r.depth };
  }
}

// ─── Room factory ──────────────────────────────────────────────────────────────
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

// ─── Sequential band allocator ────────────────────────────────────────────────
class BandAlloc {
  cursor = 0;
  constructor(
    readonly p0: number, readonly pl: number, readonly sTot: number,
  ) {}
  get remaining() { return Math.max(0, sn(this.sTot - this.cursor)); }
  place(sl: number, overridePl?: number): { p0: number; pl: number; s0: number; sl: number } | null {
    const sw = sn(sl);
    if (sw < 0.01 || this.cursor + sw > this.sTot + 0.01) return null;
    const pos = { p0: this.p0, pl: overridePl !== undefined ? sn(overridePl) : this.pl, s0: this.cursor, sl: sw };
    this.cursor = sn(this.cursor + sw);
    return pos;
  }
  fill(overridePl?: number) { return this.place(this.remaining, overridePl); }
}

// ─── Staircase reference (canonical coords, same on all floors) ───────────────
interface StairRef { p0: number; pl: number; s0: number; sl: number }

// ─── Adaptive band sizing ─────────────────────────────────────────────────────
interface Bands {
  frontD: number; midD: number; bedD: number; bathD: number;
}

function calcBands(P: number, bedsHere: number): Bands {
  const minFront = 2.7, minMid = 2.4;
  const minBed   = bedsHere > 0 ? 3.0 : 0;
  const minBath  = bedsHere > 0 ? 1.8 : 0;
  const minTotal = minFront + minMid + minBed + minBath;

  if (P <= minTotal + 0.01) {
    const scale = P / (minTotal || 1);
    const frontD = sn(minFront * scale);
    const midD   = sn(minMid   * scale);
    const bathD  = sn(minBath  * scale);
    const bedD   = sn(Math.max(0, P - frontD - midD - bathD));
    return { frontD, midD, bedD, bathD };
  }
  const frontD = sn(cl(P * 0.27, minFront, 4.8));
  const midD   = sn(cl(P * 0.27, minMid,  4.5));
  const bathD  = sn(bedsHere > 0 ? cl(P * 0.17, minBath, 2.7) : 0);
  const bedD   = sn(P - frontD - midD - bathD);
  return { frontD, midD, bedD, bathD };
}

// ─── Ground floor planner ─────────────────────────────────────────────────────
function planGround(input: LayoutInput): { rooms: PlacedRoom[]; stairRef?: StairRef } {
  const { plotWidth: W, plotDepth: D, facingDirection: facing,
          hasParking, floors, bedrooms, bathrooms, hasStaircase } = input;
  const { P, S } = axisSize(facing, W, D);
  const multi = floors > 1 || hasStaircase;
  const f = 0;

  // How many beds/baths on this floor?
  // Indian convention: if multi-floor, at most 1 ground-floor bedroom (elderly/guest)
  const bedsHere  = floors === 1 ? bedrooms : (bedrooms > 2 ? 1 : 0);
  const bathsHere = floors === 1 ? bathrooms : (bedsHere > 0 ? 1 : 0);

  const { frontD, midD, bedD, bathD } = calcBands(P, bedsHere);
  const midStart  = frontD;
  const bedStart  = frontD + midD;
  const bathStart = bedStart + bedD;

  const rooms: PlacedRoom[] = [];
  let stairRef: StairRef | undefined;

  const add = (type: RoomType, name: string, p0: number, pl: number, s0: number, sl: number) => {
    if (pl < 0.01 || sl < 0.01) return;
    rooms.push(mkRoom(type, name, f, p0, pl, s0, sl, facing, W, D));
  };

  // ── Band A · Public zone ──────────────────────────────────────────────────
  {
    // Calculate widths first so we can check feasibility
    const poojaW = sn(cl(S * 0.14, 1.2, 1.8));
    const poojaS = sn(S - poojaW);
    const foyerW = sn(cl(S * 0.16, 1.5, 2.4));

    // Car porch: left side — adaptive width respects minimum living room space
    let cpW = 0;
    if (hasParking) {
      const raw = sn(cl(S * 0.33, 2.7, 4.2));
      // Only include parking if living room will still be ≥ 2.7m wide
      if (poojaS - raw - foyerW >= 2.7) {
        cpW = raw;
      } else if (poojaS - 2.7 - foyerW >= 2.4) {
        cpW = sn(poojaS - foyerW - 2.7);   // shrink parking so living gets 2.7m
      }
      // else: skip parking (plot too narrow)
    }

    const ba = new BandAlloc(0, frontD, S);

    if (cpW > 0) {
      const cp = ba.place(cpW);
      if (cp) add("parking", "Car Porch", cp.p0, cp.pl, cp.s0, cp.sl);
    }

    // Foyer
    const foy = ba.place(foyerW);
    if (foy) add("foyer", "Foyer", foy.p0, foy.pl, foy.s0, foy.sl);

    // Living room — fills gap between foyer end and pooja column
    const livW = sn(poojaS - ba.cursor);
    if (livW >= 2.1) {
      const liv = ba.place(livW);
      if (liv) add("living", "Living Room", liv.p0, liv.pl, liv.s0, liv.sl);
    } else {
      // No room for a separate pooja — just fill with living
      const liv = ba.fill();
      if (liv) add("living", "Living Room", liv.p0, liv.pl, liv.s0, liv.sl);
    }

    // Pooja room — NE corner, full band height
    if (S - ba.cursor >= poojaW - 0.01) {
      add("pooja", "Pooja Room", 0, frontD, poojaS, poojaW);
    }
  }

  // ── Band B · Service zone ─────────────────────────────────────────────────
  {
    const bb = new BandAlloc(midStart, midD, S);

    // Staircase — left side of service band, full band depth
    if (multi) {
      const stW = sn(cl(S * 0.16, 1.5, 2.1));
      const st  = bb.place(stW);
      if (st) {
        add("staircase", "Staircase", st.p0, st.pl, st.s0, st.sl);
        stairRef = { p0: st.p0, pl: st.pl, s0: st.s0, sl: st.sl };
      }
    }

    // Dining
    const dW = sn(cl(S * 0.28, 2.4, 4.2));
    const din = bb.place(dW);
    if (din) add("dining", "Dining Room", din.p0, din.pl, din.s0, din.sl);

    // Kitchen
    const kW = sn(cl(S * 0.28, 2.4, 4.2));
    const kit = bb.place(kW);
    if (kit) add("kitchen", "Kitchen", kit.p0, kit.pl, kit.s0, kit.sl);

    // Utility — remaining
    if (bb.remaining >= 1.2) {
      const ut = bb.fill();
      if (ut) add("utility", "Utility / Wash", ut.p0, ut.pl, ut.s0, ut.sl);
    }
  }

  // ── Beds D + Baths E ──────────────────────────────────────────────────────
  if (bedsHere > 0 && bedD >= 2.4) {
    const bb_bed  = new BandAlloc(bedStart, bedD, S);
    const bb_bath = new BandAlloc(bathStart, bathD, S);

    // Passage strip at top of bedroom zone (if multi-floor)
    // Note: upper-floor passage covers this same canonical p range
    // Ground floor: add a narrow passage at bedStart spanning full width
    if (multi && bedD >= 3.6) {
      const passD = sn(cl(bedD * 0.22, 0.9, 1.2));
      add("passage", "Passage", bedStart, passD, 0, S);
      // shift bed band down by passD
      const bb_bed2 = new BandAlloc(bedStart + passD, bedD - passD, S);
      const bb_bath2 = new BandAlloc(bathStart, bathD, S);
      placeBedBath(bedsHere, bathsHere, bb_bed2, bb_bath2, add, false);
    } else {
      placeBedBath(bedsHere, bathsHere, bb_bed, bb_bath, add, bedsHere === 1 && bathrooms >= 1);
    }
  }

  return { rooms, stairRef };
}

// Helper: place bedsHere beds + bathsHere baths in two BandAllocs
function placeBedBath(
  bedsHere: number,
  bathsHere: number,
  bb_bed: BandAlloc,
  bb_bath: BandAlloc,
  add: (type: RoomType, name: string, p0: number, pl: number, s0: number, sl: number) => void,
  masterBed: boolean,
) {
  for (let i = 0; i < bedsHere; i++) {
    const left    = bedsHere - i;
    const bedW    = sn(bb_bed.remaining / left);
    const isMast  = masterBed && i === 0;
    const bType: RoomType = isMast ? "master_bedroom" : "bedroom";
    const bName   = isMast ? "Master Bedroom" : `Bedroom ${i + 1}`;
    const bed     = bb_bed.place(bedW);
    if (bed) add(bType, bName, bed.p0, bed.pl, bed.s0, bed.sl);

    if (i < bathsHere && bb_bath.remaining >= 1.5) {
      const bathW = sn(cl(bedW * 0.42, 1.5, 2.1));
      const bat   = bb_bath.place(bathW);
      if (bat) {
        const batName = isMast ? "Bathroom" : `Bathroom ${i + 1}`;
        add("bathroom", batName, bat.p0, bat.pl, bat.s0, bat.sl);
      }
    }
  }
  if (bathsHere > bedsHere && bb_bath.remaining >= 1.2) {
    const ex = bb_bath.fill();
    if (ex) add("toilet", "Common W.C.", ex.p0, ex.pl, ex.s0, ex.sl);
  }
}

// ─── Upper floor planner ──────────────────────────────────────────────────────
function planUpper(
  floor: number, input: LayoutInput,
  stairRef: StairRef | undefined,
  bedsHere: number, bathsHere: number,
  withBalcony: boolean,
): PlacedRoom[] {
  const { plotWidth: W, plotDepth: D, facingDirection: facing } = input;
  const { P, S } = axisSize(facing, W, D);
  const rooms: PlacedRoom[] = [];

  const add = (type: RoomType, name: string, p0: number, pl: number, s0: number, sl: number) => {
    if (pl < 0.01 || sl < 0.01) return;
    rooms.push(mkRoom(type, name, floor, p0, pl, s0, sl, facing, W, D));
  };

  // ── Balcony at road-facing front ─────────────────────────────────────────
  let pCursor = 0;
  let balD = 0;
  if (withBalcony) {
    balD = sn(cl(P * 0.12, 1.2, 1.8));
    const balW = sn(cl(S * 0.55, 2.4, S));
    add("balcony", "Balcony", 0, balD, 0, balW);
    pCursor += balD;
  }

  // ── Passage — spans from balcony end to staircase zone end ───────────────
  // This ensures the landing/passage connects seamlessly to the staircase.
  const passStart  = pCursor;
  const stairEnd   = stairRef ? stairRef.p0 + stairRef.pl : pCursor + sn(cl(P * 0.10, 1.0, 1.5));
  const passDepth  = sn(Math.max(1.0, stairEnd - passStart));

  add("passage", "Passage", passStart, passDepth, 0, S);

  // ── Staircase — exactly same canonical position as ground floor ───────────
  if (stairRef) {
    add("staircase", "Staircase", stairRef.p0, stairRef.pl, stairRef.s0, stairRef.sl);
  }

  pCursor = sn(stairEnd);

  // ── Bedrooms + Bathrooms ──────────────────────────────────────────────────
  if (bedsHere > 0) {
    const rearAvail = sn(P - pCursor);
    const bathD     = sn(cl(rearAvail * 0.40, 1.8, 2.7));
    const bedD      = sn(rearAvail - bathD);

    if (bedD >= 2.4 && rearAvail >= 4.2) {
      const bb_bed  = new BandAlloc(pCursor, bedD, S);
      const bb_bath = new BandAlloc(pCursor + bedD, bathD, S);
      const isMaster = floor === 1;  // master bedroom on first upper floor
      placeBedBath(bedsHere, bathsHere, bb_bed, bb_bath, add, isMaster);
    }
  }

  return rooms;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

/** Entry point called by layoutEngine.ts */
export function planAllFloors(
  _specs: RoomSpec[],  // ignored — new engine derives rooms from input directly
  input: LayoutInput,
): FloorPlan[] {
  const { floors, bedrooms, bathrooms, hasBalcony } = input;
  const plans: FloorPlan[] = [];

  // Ground floor
  const { rooms: g0, stairRef } = planGround(input);
  plans.push({ floor: 0, rooms: g0 });

  // Count what ground floor actually placed
  const bedsOnG  = g0.filter(r => r.type === "master_bedroom" || r.type === "bedroom").length;
  const bathsOnG = g0.filter(r => r.type === "bathroom" || r.type === "toilet").length;

  let bedsAssigned  = bedsOnG;
  let bathsAssigned = bathsOnG;

  // Upper floors
  for (let fl = 1; fl < floors; fl++) {
    const floorsLeft = floors - fl;
    const bedsLeft   = bedrooms  - bedsAssigned;
    const bathsLeft  = bathrooms - bathsAssigned;
    const bedsHere   = Math.max(0, Math.ceil(bedsLeft  / floorsLeft));
    const bathsHere  = Math.max(0, Math.ceil(bathsLeft / floorsLeft));
    const bal        = hasBalcony && fl === 1;

    const upper = planUpper(fl, input, stairRef, bedsHere, bathsHere, bal);
    plans.push({ floor: fl, rooms: upper });

    bedsAssigned  += bedsHere;
    bathsAssigned += bathsHere;
  }

  return plans;
}

/**
 * planFloor — legacy stub kept for API compatibility.
 * The live engine only calls planAllFloors.
 */
export function planFloor(
  floorIndex: number,
  _specs: RoomSpec[],
  _input: LayoutInput,
  _stairReservation?: { x: number; y: number; width: number; depth: number },
): FloorPlan {
  return { floor: floorIndex, rooms: [] };
}
