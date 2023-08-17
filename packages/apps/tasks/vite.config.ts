import { defineConfig } from "vite";
import { ConfigPlugin } from "@dxos/config/vite-plugin";
import { VaultPlugin } from "@dxos/vault/vite-plugin";
import react from "@vitejs/plugin-react";
import { ThemePlugin } from "@dxos/aurora-theme/plugin";
import { resolve } from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  build: {
    outDir: "out/tasks",
  },

  plugins: [
    VaultPlugin(),
    ConfigPlugin(),
    react({ jsxRuntime: "classic" }),
    ThemePlugin({
      content: [
        resolve(__dirname, "./index.html"),
        resolve(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
        resolve(__dirname, "node_modules/@dxos/aurora/dist/**/*.mjs"),
        resolve(__dirname, "node_modules/@dxos/aurora-theme/dist/**/*.mjs"),
        resolve(__dirname, "node_modules/@dxos/react-appkit/dist/**/*.mjs"),
      ],
    }),
    VitePWA({
      registerType: "prompt",
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000,
      },
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "tasks",
        short_name: "tasks",
        theme_color: "#ffffff",
        icons: [
          {
            src: "icons/icon-32.png",
            sizes: "32x32",
            type: "image/png",
          },
          {
            src: "icons/icon-256.png",
            sizes: "256x256",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
