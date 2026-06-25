// React 19 removed ReactCurrentOwner from __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.
// react-konva's bundled react-reconciler still reads it. Patch before any other import.
import React from "react";

type AnyObj = Record<string, unknown>;
const legacyInternals = (React as unknown as AnyObj)[
  "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"
] as AnyObj | undefined;

if (legacyInternals && legacyInternals["ReactCurrentOwner"] === undefined) {
  const clientInternals = (React as unknown as AnyObj)[
    "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"
  ] as AnyObj | undefined;
  legacyInternals["ReactCurrentOwner"] = clientInternals?.["A"] ?? { current: null };
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
