import { defineConfig } from "vite";
import { ConfigPlugin } from "@dxos/config/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  base: "", // Ensures relative path to assets.
  server: {
    host: true,
  },
  optimizeDeps: {
    force: true,
    include: ["@dxos/client", "@dxos/config"],
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
    outDir: "out/noreact-app",
    commonjsOptions: {
      include: [/packages/, /node_modules/],
    },
  },
  plugins: [ConfigPlugin()],
});
