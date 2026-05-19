import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.join(import.meta.dirname, "client"),
  publicDir: path.join(import.meta.dirname, "client/public"),
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": process.env.VITE_API_URL ?? "http://localhost:3333",
    },
  },
  build: {
    outDir: path.join(import.meta.dirname, "client/dist"),
    emptyOutDir: true,
  },
});
