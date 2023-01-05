import { defineConfig } from "vite";
import { ConfigPlugin } from "@dxos/config/vite-plugin";
import react from "@vitejs/plugin-react";
import { ThemePlugin } from "@dxos/react-ui/plugin";
import { resolve } from "node:path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  base: "", // Ensures relative path to assets.
  server: {
    host: true,
  },
  optimizeDeps: {
    force: true,
    include: ["@dxos/client", "@dxos/react-client", "@dxos/config"],
    esbuildOptions: {
      // TODO(wittjosiah): Remove.
      plugins: [
        {
          name: "yjs",
          setup: ({ onResolve }) => {
            onResolve({ filter: /yjs/ }, () => {
              return { path: require.resolve("yjs").replace(".cjs", ".mjs") };
            });
          },
        },
      ],
    },
  },
  build: {
    outDir: "out/app/@dxos/hello",
    commonjsOptions: {
      include: [/packages/, /node_modules/],
    },
  },
  plugins: [
    ConfigPlugin(),
    react(),
    ThemePlugin({
      content: [
        resolve(__dirname, "./index.html"),
        resolve(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
      ],
    }),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000,
      },
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "@dxos/hello",
        short_name: "@dxos/hello",
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
