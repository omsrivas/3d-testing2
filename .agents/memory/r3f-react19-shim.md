---
name: React 19 + R3F v8 shim — resolved by upgrade
description: The shim approach failed; the real fix is upgrading to R3F v9 + drei v10 + postprocessing v3
---

## The Rule
Do NOT try to shim React 19 internals for R3F v8. Upgrade to `@react-three/fiber` v9, `@react-three/drei` v10, and `@react-three/postprocessing` v3 instead. These are natively React 19-compatible.

**Why the shim failed:** React 19 changed the `$$typeof` element type symbol from `Symbol.for('react.element')` to `Symbol.for('react.transitional.element')`. R3F v8's bundled `react-reconciler` (React 18 era) hard-codes the old symbol and throws "Objects are not valid as a React child" when it encounters React 19 elements. Shimming the internals bag (`__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`) only partially helps — the `$$typeof` mismatch is fatal and cannot be shimmed at module import time.

**What was tried (fragile):**
1. Stub `ReactCurrentOwner = { current: null }` → next crash: `ReactCurrentActQueue`
2. Stub `ReactCurrentActQueue = null` → crash: `ReactCurrentActQueue.current`  
3. Stub all 5 internals → crash: `$$typeof` element type mismatch

**The fix:**
```json
"@react-three/fiber": "^9.6.1",
"@react-three/drei": "^10.7.7",
"@react-three/postprocessing": "^3.0.4"
```
Remove all shim code from `main.tsx`. `main.tsx` should be a clean 4-line file with no React internal patching.

**API compatibility:** ThreeViewer.tsx code compiles cleanly under R3F v9 + drei v10. No JSX/component API changes required. `enableNormalPass={false}` on `EffectComposer`, `N8AO` props, `ContactShadows`, `SoftShadows`, `Environment`, `Html` all remain compatible.
