import type { LayoutInput, LayoutOutput } from "@/lib/layoutEngine";
import type { SceneData, BoxSpec } from "./types";
import { buildSlabs }                       from "./slabBuilder3d";
import { buildWalls }                       from "./wallBuilder3d";
import { buildColumns }                     from "./columnBuilder3d";
import { buildStairs3d }                    from "./stairBuilder3d";
import { buildDoorFrames, buildWindowFrames } from "./openingBuilder3d";
import { buildParapets }                    from "./parapetBuilder3d";
import { buildBalconies }                   from "./balconyBuilder3d";
import { buildLintels }                     from "./lintelBuilder3d";
import { buildBeams }                       from "./beamBuilder3d";
import { buildPlinth }                      from "./plinthBuilder3d";
import {
  FLOOR_TO_FLOOR, PARAPET_H, PARAPET_CAP_T, PLINTH_H,
} from "./constants";

export type { BoxSpec, SceneData, MeshRole } from "./types";

// ─── Main scene builder ───────────────────────────────────────────────────────
// Returns a flat array of BoxSpec (no Three.js dependency – pure data).
// The viewer component constructs actual Three.js geometry from these specs.
//
// Build order (back to front for material grouping):
//   1  Plinth perimeter walls         (below finished floor)
//   2  Structural slabs               (floor, intermediate, roof)
//   3  RCC beams                      (under each slab along wall lines)
//   4  Exterior + interior walls      (with door/window cutouts)
//   5  RCC lintels                    (above doors and windows)
//   6  Columns                        (corners, T-junctions, parapet)
//   7  Stair treads + landings
//   8  Door frames
//   9  Window frames + glass
//  10  Roof parapet walls + coping
//  11  Balcony slabs + railings

export function build3dScene(
  output: LayoutOutput,
  input:  LayoutInput,
): SceneData {
  // Filter parapet-type walls from the layout engine – we synthesise them
  const structuralWalls = output.walls.filter(w => w.type !== "parapet");

  const meshes: BoxSpec[] = [
    // 1. Plinth perimeter band
    ...buildPlinth(input.plotWidth, input.plotDepth),

    // 2. Structural slabs (ground mat → plinth top → intermediate → roof)
    ...buildSlabs(input.floors, input.plotWidth, input.plotDepth),

    // 3. RCC beams under each floor/roof slab
    ...buildBeams(structuralWalls, input.floors),

    // 4. Walls (exterior + interior) with opening sub-segments
    ...buildWalls(structuralWalls, output.doors, output.windows),

    // 5. RCC lintels above every door and window
    ...buildLintels(structuralWalls, output.doors, output.windows),

    // 6. Columns at corners, T-junctions, and parapet level
    ...buildColumns(structuralWalls, input.floors),

    // 7. Stair treads + intermediate landings
    ...buildStairs3d(output.stairs),

    // 8. Door frames (jambs + head casings)
    ...buildDoorFrames(output.doors, structuralWalls),

    // 9. Window frames + glass panes
    ...buildWindowFrames(output.windows, structuralWalls),

    // 10. Roof parapet walls + coping caps
    ...buildParapets(input.floors, input.plotWidth, input.plotDepth),

    // 11. Balcony / terrace slabs + perimeter railings
    ...buildBalconies(output.rooms, structuralWalls, input.floors),
  ];

  // ── Scene bounds ─────────────────────────────────────────────────────────────
  const totalH = PLINTH_H + input.floors * FLOOR_TO_FLOOR + PARAPET_H + PARAPET_CAP_T;
  const cx     = input.plotWidth  / 2;
  const cz     = input.plotDepth  / 2;
  const diag   = Math.sqrt(
    input.plotWidth ** 2 + totalH ** 2 + input.plotDepth ** 2,
  );

  return {
    meshes,
    rooms:     output.rooms,
    floors:    input.floors,
    plotWidth: input.plotWidth,
    plotDepth: input.plotDepth,
    center:    [cx, totalH / 2, cz],
    diagonal:  diag,
  };
}
