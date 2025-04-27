import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
    cors: true,
  },
  preview: {
    allowedHosts: [
      'gestion-locative-frontend.onrender.com',
      'localhost',
    ],
  },
  base: './',
  build: {
    chunkSizeWarningLimit: 2000, // Supprime l’avertissement chunk
  },
});