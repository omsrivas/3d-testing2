// ─── React 19 → R3F v8 compatibility shim ────────────────────────────────────
// R3F v8 bundles react-reconciler (React 18 era) which reads several properties
// from React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED that React 19
// either renamed (using short keys like "H","A") or removed entirely.
// ThreeViewer is lazy-loaded (React.lazy), so THIS body runs before R3F's
// module evaluates — the shim must run synchronously here.
import React from "react";

type Obj = Record<string, unknown>;
const r = React as unknown as Obj;

// Ensure the legacy internals bag exists (React 19 may not export it)
if (!r["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"]) {
  r["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"] = {};
}
const si = r["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"] as Obj;

// ReactCurrentOwner — R3F reads/writes .current to track fiber owner
if (!si["ReactCurrentOwner"]) {
  si["ReactCurrentOwner"] = { current: null };
}

// ReactCurrentDispatcher — hooks dispatcher; React 19 stores this as "H"
if (!si["ReactCurrentDispatcher"]) {
  const clientInternals = r["__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"] as Obj | undefined;
  si["ReactCurrentDispatcher"] = clientInternals ?? { current: null };
}

// ReactCurrentBatchConfig — batching flag; React 19 stores this as "A"
if (!si["ReactCurrentBatchConfig"]) {
  si["ReactCurrentBatchConfig"] = { transition: null };
}

// ReactCurrentActQueue — testing queue; safe stub
if (!si["ReactCurrentActQueue"]) {
  si["ReactCurrentActQueue"] = null;
}
// ─────────────────────────────────────────────────────────────────────────────

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
