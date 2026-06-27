---
name: Furniture & exterior symbols
description: How architectural furniture and exterior elements are rendered in the SVG floor plan.
---

# Furniture & Exterior Symbols

## File
`artifacts/house-planner/src/components/FurnitureSymbols.tsx`

## How it plugs in
Imported into `FloorPlanSVG.tsx` as `RoomFurniture`. Rendered in the SVG after room fills and balcony hatch (step ⑥b), before walls (step ⑧) so walls clip furniture at edges. Labels remain on top (step ⑫).

## Scale constant
S = 45 px/m — must always match BASE_SCALE in FloorPlanSVG.tsx.

## Room dispatch
`RoomFurniture` component dispatches by `room.type`:
- `master_bedroom / bedroom` → BedroomFurniture (bed, headboard, pillows, wardrobe, side tables)
- `living / family_lounge` → LivingFurniture (sofa, TV unit, center table)
- `dining` → DiningFurniture (table, chairs on 4 sides)
- `kitchen` → KitchenFurniture (L-shape counter, sink, stove, island if >3.5m)
- `bathroom / toilet` → BathroomFurniture (WC, basin, shower)
- `parking` → ParkingFurniture (car silhouette)
- `front_garden` → FrontGardenElements (tree circles)
- `entrance_gate` → EntranceGateElements (paving slabs, gate bars, posts, boundary wall stubs)
- `foyer` → FoyerElements (entry mat)

## Car parking orientation rule
Car orients along the **longer room axis** (`landscape = rw >= rh`). carL scaled to fit longer axis, carW to shorter. Minimum: either dimension >= 1.8m.

**Why:** Car porches vary — some are wide-and-shallow (landscape), some narrow-and-deep (portrait). Fixed orientation caused the car to overflow or not render.

## Minimum size guards
Each component has a minimum size check (e.g., bedroom needs ≥2.2m×2.4m). Rooms smaller than the minimum render no furniture to avoid clutter.

## Auto-generate on mount
`HousePlannerPage.tsx` has `useEffect(() => { generate(); }, [])` so users see a plan immediately on load instead of a blank "Ready to Draft" state.

## Boundary wall
In FloorPlanSVG.tsx step ⑦, the plot outline uses `strokeWidth="3.5"` (was 0.5) to show a proper exterior boundary wall, with a faint inner face line.
