import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "node:path";

export default defineConfig({
  root: path.join(import.meta.dirname, "client"),
  publicDir: path.join(import.meta.dirname, "client/public"),
  // Read .env from the repo root so frontend + backend share one env file.
  envDir: path.join(import.meta.dirname, "../.."),
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
  ],
  define: {
    global: "globalThis",
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": process.env.VITE_API_URL ?? `http://localhost:${process.env.EFFECTSTREAM_API_PORT ?? 9999}`,
    },
  },
  build: {
    outDir: path.join(import.meta.dirname, "client/dist"),
    emptyOutDir: true,
  },
});
