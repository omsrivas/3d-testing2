---
name: PBR materials in ThreeViewer (house-planner)
description: Procedural CanvasTexture PBR materials implementation for the 3D house viewer. No external image URLs.
---

# PBR materials in ThreeViewer

**Rule:** All textures are created procedurally via `THREE.CanvasTexture` wrapping HTML Canvas elements. No external image URLs.

**Why:** The app has no asset pipeline for binary textures. CanvasTexture lets us generate concrete noise, wood grain, grass blades, concrete pavers, brushed metal, and glass smear patterns at runtime without network requests.

**How to apply:**
- Create textures in a `useTextures()` hook (memoized) called at the ThreeViewer component level (outside Canvas). Pass the resulting object as a `textures` prop through FloorGroups → PBRMesh.
- Glass uses `<meshPhysicalMaterial>` with `transmission`, `ior`, `reflectivity`.
- Add `<Environment preset="city" background={false} />` inside the Canvas for env-map reflections on metal and glass.
- Use `normalScale={new THREE.Vector2(0.6, 0.6)}` or `normalScale={[0.6, 0.6]}` (R3F accepts both) for normal maps.
- Playwright test environments have no GPU, so "Error creating WebGL context" in tests is expected — verify in the real browser preview instead.
