import template from './template.t';
import { plate } from '@dxos/plate';

export default template.define.script({
  content: ({ input: { defaultPlugins } }) => {
    return plate/* javascript */`
      import { defineConfig } from "vite";
      import { resolve } from "path";
      import react from "@vitejs/plugin-react";
      import { ThemePlugin } from "@dxos/react-ui-theme/plugin";
    
      ${defaultPlugins && plate/* javascript */`
      import { ConfigPlugin } from "@dxos/config/vite-plugin";
      import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
      import WasmPlugin from 'vite-plugin-wasm';
      `}
      
      // https://vitejs.dev/config
      export default defineConfig({
        server: {
          host: true,
        },
        root: 'composer',
        build: { outDir: "composer/out", target: "esnext" },
        optimizeDeps: { esbuildOptions: { target: "esnext" } },
        define: {
          process: {
            env: {
              NODE_ENV: JSON.stringify(process.env.NODE_ENV),
            },
          },
        },
        plugins: [
          react(),
          ThemePlugin({
            root: __dirname + '/composer',
            content: [
              resolve(__dirname, "./composer/index.html"),
              resolve(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
              resolve(__dirname, "./composer/**/*.{js,ts,jsx,tsx}"),
              ${defaultPlugins && plate/* javascript */`
              resolve(__dirname, "node_modules/@dxos/react-ui/dist/**/*.mjs"),
              resolve(__dirname, "node_modules/@dxos/react-ui-theme/dist/**/*.mjs"),
              resolve(
                __dirname,
                "node_modules/@dxos/react-ui-mosaic/dist/lib/**/*.mjs"
              ),
              resolve(
                __dirname,
                "node_modules/@dxos/react-ui-stack/dist/lib/**/*.mjs"
              ),
              resolve(
                __dirname,
                "node_modules/@dxos/react-ui-navtree/dist/lib/**/*.mjs"
              ),
              resolve(
                __dirname,
                "node_modules/@braneframe/plugin-*/dist/lib/**/*.mjs"
              ),
              `}
            ],
          }),
          ${defaultPlugins && plate/* javascript */`
          ConfigPlugin(),
          TopLevelAwaitPlugin(),
          WasmPlugin(),
          `}
        ],
      });
    `
  }
})
