// ─── React 19 → R3F v8 compatibility shim ────────────────────────────────────
// R3F v8 bundles react-reconciler (React 18 era) which reads several properties
// from React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED that React 19
// renamed (to short keys like "H","A") or removed entirely.
// ThreeViewer is lazy-loaded (React.lazy), so THIS body runs before R3F's
// module evaluates — stubs must be in place before the lazy chunk is resolved.
import React from "react";

type Obj = Record<string, unknown>;
const r = React as unknown as Obj;

// Ensure the legacy internals bag exists (React 19 may omit it entirely)
if (!r["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"]) {
  r["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"] = {};
}
const si = r["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"] as Obj;

// ReactCurrentOwner — fiber owner tracker; R3F reads/writes .current
if (!si["ReactCurrentOwner"]) {
  si["ReactCurrentOwner"] = { current: null };
}
// ReactCurrentDispatcher — hooks dispatcher; React 19 renamed to "H"
if (!si["ReactCurrentDispatcher"]) {
  const ci = r["__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"] as Obj | undefined;
  si["ReactCurrentDispatcher"] = ci ?? { current: null };
}
// ReactCurrentBatchConfig — batching flags; R3F reads .transition
if (!si["ReactCurrentBatchConfig"]) {
  si["ReactCurrentBatchConfig"] = { transition: null };
}
// ReactCurrentActQueue — act() test queue; R3F reads .current + flags
if (!si["ReactCurrentActQueue"]) {
  si["ReactCurrentActQueue"] = { current: null, isBatchingLegacy: false, didScheduleLegacyUpdate: false };
}
// ReactDebugCurrentFrame — error stack helper; R3F calls .getCurrentStack()
if (!si["ReactDebugCurrentFrame"]) {
  si["ReactDebugCurrentFrame"] = { current: null, getCurrentStack: () => "" };
}
// ─────────────────────────────────────────────────────────────────────────────

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
