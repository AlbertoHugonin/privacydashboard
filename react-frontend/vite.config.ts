import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendUrl = process.env.VITE_BACKEND_URL ?? "http://localhost:11002";

export default defineConfig({
  base: "/react/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
      "/login": {
        target: backendUrl,
        changeOrigin: false,
      },
      "/logout": {
        target: backendUrl,
        changeOrigin: false,
      },
      "/userapi": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
