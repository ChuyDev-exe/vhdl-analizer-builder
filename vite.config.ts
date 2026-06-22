import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      manifest: {
        name: "Simulador de Circuitos Lógicos · VHDL ⇄ Diagrama",
        short_name: "LogicFlow",
        description: "Editor de circuitos lógicos con VHDL bidireccional y diagrama de tiempos",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: { port: 5599, strictPort: true },
  base: process.env.VITE_BASE_URL || "/",
});
