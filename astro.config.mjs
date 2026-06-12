import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const backendTarget = process.env.PUBLIC_API_BASE_URL || process.env.BACKEND_API_BASE || "https://api.gtcodestar.com";

export default defineConfig({
  integrations: [react()],
  output: "static",
  site: process.env.PUBLIC_SITE_URL || "https://www.gtcodestar.com",
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        "/backend": {
          target: backendTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend/, ""),
        },
      },
    },
  },
});
