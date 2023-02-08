import { defineConfig } from "vite";
import { ConfigPlugin } from "@dxos/config/vite-plugin";
import react from "@vitejs/plugin-react";
import { ThemePlugin } from "@dxos/react-components/plugin";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "", // Ensures relative path to assets.
  server: {
    host: true,
  },
  optimizeDeps: {
    force: true,
    include: [
      "@dxos/client",
      "@dxos/react-client",
      "@dxos/react-appkit",
      "@dxos/react-components",
      "@dxos/echo-schema",
      "@dxos/config",
    ],
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
    outDir: "out/tasks-app-2",
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
        resolve(__dirname, "node_modules/@dxos/react-appkit/dist/**/*.mjs"),
      ],
    }),
  ],
});
