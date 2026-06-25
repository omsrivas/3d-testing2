---
name: React 19 + react-konva compatibility
description: react-konva v18 bundles its own react-reconciler that conflicts with React 19; the right fix is to upgrade to react-konva v19.
---

# React 19 + react-konva compatibility

**Rule:** When using React 19 with react-konva, always use react-konva v19+. Do NOT try to shim `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`.

**Why:** react-konva v18 bundles its own copy of react-reconciler 18.x. That reconciler accesses React's removed internal APIs (`ReactCurrentOwner`, `ReactCurrentActQueue.isBatchingLegacy`, etc.) from `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`, which was removed in React 19. Shimming those internals is fragile — even after patching `ReactCurrentOwner` and `ReactCurrentActQueue`, the two reconcilers (React 19's and react-konva's bundled v18) conflict and produce "Objects are not valid as a React child" errors at runtime.

**How to apply:** Run `pnpm add react-konva@19` (latest 19.x). react-konva v19 uses React 19's own reconciler natively — no shims needed. Remove any vite plugin transforms that injected the `__SECRET_INTERNALS` shim.
