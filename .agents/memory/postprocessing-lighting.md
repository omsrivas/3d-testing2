---
name: Postprocessing + lighting setup
description: Correct package version and prop names for @react-three/postprocessing v2.16 with @react-three/fiber v8
---

## Rule
`@react-three/postprocessing@3.x` requires R3F v9 — install `@react-three/postprocessing@2.16` for R3F v8.

N8AO is available in v2.16 at top-level: `import { EffectComposer, N8AO } from "@react-three/postprocessing"`.

EffectComposer prop to disable normal pass is `enableNormalPass={false}` (NOT `disableNormalPass`).

SoftShadows and ContactShadows are from `@react-three/drei`, not postprocessing.

**Why:** Peer dependency mismatch silently installs wrong version; prop name is counterintuitive and the TS error message gives the correct alternative.

**How to apply:** Any time postprocessing is added to an R3F v8 project, pin to `@react-three/postprocessing@^2.16`. Use `enableNormalPass={false}` to disable normal pass rendering.
