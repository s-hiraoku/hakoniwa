import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist/renderer",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "index.html")
    }
  }
});
