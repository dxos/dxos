import { defineConfig } from "vite";
import { ConfigPlugin } from "@dxos/config/vite-plugin";
import { VaultPlugin } from "@dxos/vault/vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { ThemePlugin } from "@dxos/react-ui-theme/plugin";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  optimizeDeps: {
    force: true,
    include: [
      "@dxos/client",
      "@dxos/react-client",
      "@dxos/react-appkit",
      "@dxos/react-ui",
      "@dxos/react-ui-theme",
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
    outDir: "out/test-app",
    commonjsOptions: {
      include: [/packages/, /node_modules/],
    },
  },

  plugins: [
    VaultPlugin(),
    ConfigPlugin(),
    react({ jsxRuntime: "classic" }),
    ThemePlugin({
      content: [
        resolve(__dirname, "./index.html"),
        resolve(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
        resolve(__dirname, "node_modules/@dxos/react-ui/dist/**/*.mjs"),
        resolve(__dirname, "node_modules/@dxos/react-ui-theme/dist/**/*.mjs"),
        resolve(__dirname, "node_modules/@dxos/react-appkit/dist/**/*.mjs"),
      ],
    }),
  ],
});
