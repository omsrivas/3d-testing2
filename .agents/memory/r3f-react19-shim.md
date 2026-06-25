---
name: React 19 + R3F v8 shim
description: How to fix ReactSharedInternals.ReactCurrentOwner crash when R3F v8 runs under React 19
---

## The Rule
The shim in `main.tsx` must CREATE `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` if it is absent (React 19 may not export it), and must stub ALL the internals properties R3F v8's bundled reconciler reads: `ReactCurrentOwner`, `ReactCurrentDispatcher`, `ReactCurrentBatchConfig`, `ReactCurrentActQueue`.

**Why:** R3F v8 bundles its own copy of `react-reconciler` (React 18 era). At module evaluation time, that reconciler reads `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner` (and others) into local `var` bindings. In React 19 those properties were renamed or removed; if the value is `undefined` the local var is captured as `undefined`, and any later read of `.current` on it crashes (`undefined is not an object` on Safari/WebKit).

**How to apply:** `ThreeViewer` is imported via `React.lazy()` in `HousePlannerPage.tsx`. This means R3F's module code runs during the **first render** of ThreeViewer, not at app startup — so the synchronous shim body in `main.tsx` fires first. The shim must:
1. Check if `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` exists; if not, create an empty object and assign it.
2. Stub `ReactCurrentOwner = { current: null }` if missing.
3. Stub `ReactCurrentDispatcher = { current: null }` if missing.
4. Stub `ReactCurrentBatchConfig = { transition: null }` if missing.
5. Stub `ReactCurrentActQueue = null` if missing.

The original shim only patched if `legacyInternals` was truthy — silent no-op when React 19 doesn't export the property at all.

**The long-term fix** is to upgrade to `@react-three/fiber` v9 (React 19 native), but that also requires `@react-three/drei` v10 — a larger migration.
