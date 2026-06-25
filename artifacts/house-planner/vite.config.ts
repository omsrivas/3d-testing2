import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

// Polyfill React 19's missing __SECRET_INTERNALS for react-konva / react-reconciler@18
// react-konva bundles its own react-reconciler which reads ReactCurrentOwner from
// React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED — removed in React 19.
function reactKonvaCompat(): Plugin {
  return {
    name: "react-konva-compat",
    transform(code, id) {
      if (id.includes("react/cjs/react.development.js") || id.includes("react/cjs/react.production.js")) {
        // Inject __SECRET_INTERNALS shim after the module body
        const patch = `
if (typeof exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE !== 'undefined' &&
    typeof exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED === 'undefined') {
  var _ci = exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Object.assign({}, _ci, {
    ReactCurrentOwner: _ci.A || { current: null },
    ReactCurrentDispatcher: _ci.H || { current: null },
    ReactCurrentBatchConfig: _ci.S || { transition: null },
  });
}
`;
        return { code: code + patch, map: null };
      }
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    reactKonvaCompat(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
