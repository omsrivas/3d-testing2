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
- Shadow map: 1024 on mobile, 2048 on desktop (was 4096 — halved to reduce fill cost with no visible difference).
- N8AO disabled entirely on mobile (too expensive for mobile GPUs); ContactShadows resolution 512 vs 1024.
- `antialias: false` on mobile Canvas gl.
- SoftShadows samples: 6 on mobile, 12 on desktop.
- `useIsMobile()` hook from `@/hooks/use-mobile` used to detect mobile.

## frameloop="demand" + invalidate() (second pass)
- Canvas uses `frameloop="demand"` + `performance={{ min: 0.5 }}`.
- Every animation (opacity lerp, explode, camera transition, walkthrough) calls `invalidate()` while active and stops when settled.
- Pattern per animation: `useEffect([trigger]) → set needsAnimRef=true + invalidate()`. In `useFrame`: early return if !needsAnimRef; call invalidate() if still animating.
- OrbitControls with `makeDefault` handles user orbit/pan/zoom invalidation automatically.
- Walkthrough keydown handler calls `invalidate()`; `useFrame` keeps calling it while keys are held.
- **Why:** Stops GPU burning 60fps when scene is completely idle.

## Shared geometry + material (landscape.tsx)
- Module-level `G` (geometry) and `M` (material) singletons in landscape.tsx.
- All Tree/SmallTree/Shrub/LampPost/etc. instances use `geometry={G.x} material={M.y}` — zero per-render GPU buffer creation.
- Flower colors use a shared 5-element `FLOWER_MATS` array; only flower sphere *geometries* are per-instance (varying radii).
- **Why:** Original code created new THREE.*Geometry + THREE.*Material for every mesh on every render — 200+ redundant GPU uploads.

## Single LOD useFrame in PlotLandscape
- Removed per-tree `useFrame` + `useThree` subscriptions; all distance checks run in one `useFrame` in `PlotLandscape`.
- Tree/SmallTree accept `highRef`/`lowRef` callback props; parent PlotLandscape holds ref arrays and toggles `.visible` directly.
- **Why:** ~13 trees × 1 useFrame each = 13 frame callbacks. One parent callback = 1.

## Pre-allocated walkthrough scratch vectors
- Module-level `_wFwd`, `_wRight`, `_wUp`, `_wMove` reused every walkthrough frame.
- Reset with `.set(0,0,0)` at start of each frame.
- **Why:** `new THREE.Vector3()` inside useFrame = GC pressure at 60fps.
