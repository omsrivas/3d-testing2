---
name: Geometry engine RCC proportions
description: Chosen dimensional constants for realistic Indian residential RCC construction.
---

**Chosen values (constants.ts):**
- SLAB_T = 0.125m (5 in, residential spans ≤ 4m)
- PARAPET_T = 0.150m (6 in, thicker for RCC-framed buildings)
- PLINTH_H = 0.450m (18 in, standard raised plinth)
- LINTEL_H = 0.225m (9 in), LINTEL_EXT = 0.150m (6 in extension beyond opening)
- BEAM_D = 0.300m (12 in projection below slab soffit)
- SLAB_PROJ = 0.075m (3 in slab overhang beyond exterior wall face)
- BALCONY_SLAB_T = 0.100m (4 in cantilever slab — thinner than structural slabs)

**Why:** These match Bureau of Indian Standards (BIS) recommendations for G+1/G+2 residential RCC framed structures on plots 25–50 ft wide.

**How to apply:** Do NOT change SLAB_T without also updating FLOOR_TO_FLOOR and re-checking all beam/slab Y positions. FLOOR_TO_FLOOR = WALL_H + SLAB_T = 3.173m.
