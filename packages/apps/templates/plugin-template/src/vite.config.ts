import { defineConfig } from "vite";
import { ConfigPlugin } from "@dxos/config/vite-plugin";
import { VaultPlugin } from "@dxos/vault/vite-plugin";
import react from "@vitejs/plugin-react";
import { ThemePlugin } from "@dxos/react-ui-theme/plugin";
import { resolve } from "path";
const { osThemeExtension } = require("@dxos/react-shell/theme-extensions");

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  build: { outDir: "out/dxos-templates", target: "esnext" },
  optimizeDeps: { esbuildOptions: { target: "esnext" } },
  define: {
    process: {
      env: {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    },
  },
  plugins: [
    VaultPlugin(),
    ConfigPlugin(),
    react({ jsxRuntime: "classic" }),
    ThemePlugin({
      extensions: [osThemeExtension],
      content: [
        resolve(__dirname, "./index.html"),
        resolve(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
        resolve(__dirname, "node_modules/@dxos/react-ui/dist/**/*.mjs"),
        resolve(__dirname, "node_modules/@dxos/react-ui-theme/dist/**/*.mjs"),
        resolve(
          __dirname,
          "./node_modules/@braneframe/plugin-*/dist/lib/**/*.mjs"
        ),
        resolve(
          __dirname,
          "./node_modules/@dxos/react-ui-mosaic/dist/lib/**/*.mjs"
        ),
        resolve(
          __dirname,
          "./node_modules/@dxos/react-ui-stack/dist/lib/**/*.mjs"
        ),
        resolve(
          __dirname,
          "./node_modules/@dxos/react-ui-navtree/dist/lib/**/*.mjs"
        ),
      ],
    }),
  ],
});
