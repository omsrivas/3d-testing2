---
name: Indian layout engine design
description: Key decisions and constraints for the zone-based Indian residential floor plan layout engine in floorPlanner.ts
---

## Two-depth staircase model
The staircase has **two different depths** stored in `StairRef`:
- `pl` (ground floor): covers the full left column from `frontP` to `svcEndP` — includes the dog-leg flight PLUS under-stair storage. This fills the structural left column on the ground floor with no gaps.
- `upperPl` (upper floors): dog-leg formula only — `TOTAL_RUN/2 + 0.3 ≈ 2.7 m`. Keeps more rear depth available for bedrooms.

`planUpper` uses `stairRef.upperPl` (not `stairRef.pl`) so bedrooms start at `frontP + upperPl` not `frontP + groundStairPl`.

**Why:** Using the full ground column depth on upper floors left only ~3 m for beds+baths, which is insufficient. Using only the dog-leg depth on upper floors gives ~5 m of rear zone for bedrooms+bathrooms.

## Boundary arithmetic — never snap the last edge
Use **exact arithmetic** (no `sn()`) when computing `bedEndP` and `bathEndP` on upper floors:
```
const bedStart  = stairP0 + stairPl;   // exact
const rearAvail = P - bedStart;         // exact (not sn(P - bedStart))
const bathEndP  = Math.min(P, bedStart + rearAvail); // clamp to plot
```
Snapping `rearAvail` can round UP and push `bathEndP` past P.

## Ground floor rear-zone gap filling
When `bedsHere === 0` on the ground floor (typical for G+1 with 3 beds), the zone `p=svcEndP → P` is uncovered. Fill it with:
- A short `passage` ("Rear Passage") strip
- A `toilet` (Common W.C.) + `utility` (Rear Utility) side by side

## Upper floor layout order (non-overlapping)
1. Balcony: `p=0..balD`, `s=stairW..S`
2. Passage: `p=balD..frontP` (= `stairP0`), full width — gap at `s=0..stairW, p=0..balD` is intentional structural return wall
3. Staircase: `p=stairP0..stairP0+upperPl`, `s=0..stairW`
4. Bedrooms: `p=stairP0+upperPl..bedEndP`, full width, subdivided by `s`
5. Bathrooms: `p=bedEndP..P`, partial s (attached per bedroom)

## Gate and garden are conditional
- Gate (`gateEndP = 0.6 m`): only if `P ≥ 7.5` AND enough depth remains for mandatory rooms
- Front garden: only if gate exists AND `P ≥ 9.0` AND enough depth remains

`mandatoryMins = foyerLiv(2.1) + trans(2.1) + svc(1.8) + [bedsHere > 0 ? 4.5 : 0]`

## New room types added
`family_lounge`, `front_garden`, `entrance_gate` added to `RoomType` union in `types.ts`, with:
- Vastu zone rules in `vastu.ts`
- Base dimensions in `roomSizer.ts`
- SVG fills + labels in `FloorPlanSVG.tsx` (fills: greenish for garden/gate, soft green for family lounge)
- `openRooms` filter extended in `FloorPlanSVG.tsx` to hatch garden and gate
- `CIRCULATION_TYPES` in `validation.ts` includes `family_lounge`
