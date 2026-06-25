---
name: 3D rendering optimizations
description: Key decisions made for the ThreeViewer performance pass — InstancedMesh, texture cache, lazy furniture, LOD, mobile scaling.
---

## InstancedMesh strategy
- Group BoxSpecs by (role, floor) → one InstancedMesh per group (~15 roles × floors ≈ 15–60 draw calls instead of 500+).
- Use a module-level unit BoxGeometry(1,1,1) shared by all InstancedMeshes; dimensions are encoded into instance matrices via compose(pos, quat, scale).
- Each InstancedMeshGroup creates its own material clone so opacity can be animated independently per floor without affecting other floors.
- Call `mesh.instanceMatrix.needsUpdate = true` + `mesh.computeBoundingSphere()` after baking matrices.
- Use refs (`targetOpRef.current = targetOpacity` inline) instead of useEffect to keep target opacity fresh in useFrame without extra renders.

**Why:** Individual mesh approach = one draw call per BoxSpec = ~400–600 draw calls on a 2-floor house. InstancedMesh collapses that to draw calls per role.

## Texture singleton
- Module-level `let _texCache: Textures | null = null` — created once per browser session via `getTextures(mobile)`.
- Mobile flag uses 256px textures vs 512px on desktop, and 128px normal maps vs 256px.
- `useTextures` hook removed; replaced with `useMemo(() => getTextures(isMobile), [isMobile])`.

**Why:** Previous `useMemo([], [])` recreated all canvas textures on every ThreeViewer remount (expensive CPU work).

## Lazy furniture
- `React.lazy(() => import(...).then(m => ({ default: m.FloorFurniture })))` for both FloorFurniture and PlotLandscape.
- This splits furniture JS into a separate chunk fetched only when first shown.

## LOD trees
- Tree and SmallTree use `useRef<THREE.Group>` for high/low detail groups.
- In `useFrame`, imperatively toggle `group.visible` based on `camera.position.distanceTo(posVec)`.
- High detail threshold: 22m (Tree), 18m (SmallTree). Low detail = trunk + single sphere.

**Why:** Imperative visibility toggle avoids React state updates/re-renders per frame. Three.js LOD object was avoided because R3F wrapping is awkward.

## Mobile quality scaling
- DPR capped at 1.5× on mobile (vs 2× desktop).
- Shadow map: 1024 on mobile, 4096 on desktop.
- N8AO disabled entirely on mobile (too expensive for mobile GPUs); ContactShadows resolution 512 vs 1024.
- `antialias: false` on mobile Canvas gl.
- SoftShadows samples: 6 on mobile, 12 on desktop.
- `useIsMobile()` hook from `@/hooks/use-mobile` used to detect mobile.
