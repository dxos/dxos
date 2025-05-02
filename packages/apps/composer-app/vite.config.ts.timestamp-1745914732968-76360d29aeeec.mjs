// packages/apps/composer-app/vite.config.ts
import { sentryVitePlugin } from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/@sentry+vite-plugin@2.14.0_encoding@0.1.13/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import ReactPlugin from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/@vitejs+plugin-react-swc@3.6.0_@swc+helpers@0.5.1_vite@5.4.7_patch_hash=i2cyw7vpoo7fbe7qgy5pw_v3p6msxzlozfej7bnojcxrk4oe/node_modules/@vitejs/plugin-react-swc/index.mjs";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join as join2, resolve } from "node:path";
import SourceMapsPlugin from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/rollup-plugin-sourcemaps@0.6.3_@types+node@22.10.2_rollup@3.23.0/node_modules/rollup-plugin-sourcemaps/dist/index.js";
import { visualizer } from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/rollup-plugin-visualizer@5.12.0_rollup@4.22.4/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { defineConfig as defineConfig2, searchForWorkspaceRoot } from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vite@5.4.7_patch_hash=i2cyw7vpoo7fbe7qgy5pwsznyq_@types+node@22.10.2_less@4.1.3_sass@1.70.0_stylus@0.59.0_terser@5.19.2/node_modules/vite/dist/node/index.js";
import Inspect2 from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vite-plugin-inspect@0.8.3_rollup@3.23.0_vite@5.4.7_patch_hash=i2cyw7vpoo7fbe7qgy5pwsznyq_@typ_lmxsdhzwi2767muay2556u2d5u/node_modules/vite-plugin-inspect/dist/index.mjs";
import { VitePWA } from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vite-plugin-pwa@0.18.2_@types+babel__core@7.20.5_vite@5.4.7_patch_hash=i2cyw7vpoo7fbe7qgy5pws_upleptmlycvdmb4kyb3fesk5aa/node_modules/vite-plugin-pwa/dist/index.js";
import WasmPlugin2 from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vite-plugin-wasm@3.3.0_vite@5.4.7_patch_hash=i2cyw7vpoo7fbe7qgy5pwsznyq_@types+node@22.10.2_l_uvqvreccy2g42oh5dejpjotl5m/node_modules/vite-plugin-wasm/exports/import.mjs";
import tsconfigPaths from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vite-tsconfig-paths@4.3.1_typescript@5.7.3_vite@5.4.7_patch_hash=i2cyw7vpoo7fbe7qgy5pwsznyq_@_x6jkqwdq6p63vftf2benpkouk4/node_modules/vite-tsconfig-paths/dist/index.mjs";
import { ConfigPlugin } from "file:///Users/dmaretskyi/Code/dxos/dxos/packages/sdk/config/dist/plugin/node-esm/vite-plugin.mjs";
import { ThemePlugin } from "file:///Users/dmaretskyi/Code/dxos/dxos/packages/ui/react-ui-theme/plugin.js";
import { IconsPlugin } from "file:///Users/dmaretskyi/Code/dxos/dxos/tools/vite-plugin-icons/dist/src/index.js";
import { mergeConfig } from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vitest@3.1.1_@types+debug@4.1.12_@types+node@22.10.2_@vitest+browser@3.1.1_@vitest+ui@3.1.1_h_mcomxrtbukk75geh3hj7db7eb4/node_modules/vitest/dist/config.js";

// vitest.shared.ts
import { join, relative } from "node:path";
import pkgUp from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/pkg-up@3.1.0/node_modules/pkg-up/index.js";
import { defineConfig } from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vitest@3.1.1_@types+debug@4.1.12_@types+node@22.10.2_@vitest+browser@3.1.1_@vitest+ui@3.1.1_h_mcomxrtbukk75geh3hj7db7eb4/node_modules/vitest/dist/config.js";
import WasmPlugin from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vite-plugin-wasm@3.3.0_vite@5.4.7_patch_hash=i2cyw7vpoo7fbe7qgy5pwsznyq_@types+node@22.10.2_l_uvqvreccy2g42oh5dejpjotl5m/node_modules/vite-plugin-wasm/exports/import.mjs";
import Inspect from "file:///Users/dmaretskyi/Code/dxos/dxos/node_modules/.pnpm/vite-plugin-inspect@0.8.3_rollup@3.23.0_vite@5.4.7_patch_hash=i2cyw7vpoo7fbe7qgy5pwsznyq_@typ_lmxsdhzwi2767muay2556u2d5u/node_modules/vite-plugin-inspect/dist/index.mjs";
import { FixGracefulFsPlugin, NodeExternalPlugin } from "file:///Users/dmaretskyi/Code/dxos/dxos/packages/common/esbuild-plugins/dist/src/index.js";
import { MODULES } from "file:///Users/dmaretskyi/Code/dxos/dxos/packages/common/node-std/dist/lib/browser/_/config.mjs";
var __vite_injected_original_dirname = "/Users/dmaretskyi/Code/dxos/dxos";
var targetProject = String(process.env.NX_TASK_TARGET_PROJECT);
var isDebug = !!process.env.VITEST_DEBUG;
var environment = (process.env.VITEST_ENV ?? "node").toLowerCase();
var shouldCreateXmlReport = Boolean(process.env.VITEST_XML_REPORT);
var createNodeConfig = (cwd) => defineConfig({
  esbuild: {
    target: "es2020"
  },
  test: {
    ...resolveReporterConfig({ browserMode: false, cwd }),
    environment: "node",
    include: [
      "**/src/**/*.test.{ts,tsx}",
      "**/test/**/*.test.{ts,tsx}",
      "!**/src/**/*.browser.test.{ts,tsx}",
      "!**/test/**/*.browser.test.{ts,tsx}"
    ]
  },
  // Shows build trace
  // VITE_INSPECT=1 pnpm vitest --ui
  // http://localhost:51204/__inspect/#/
  plugins: [process.env.VITE_INSPECT && Inspect()]
});
var createBrowserConfig = ({ browserName, cwd, nodeExternal = false, injectGlobals = true }) => defineConfig({
  plugins: [
    nodeStdPlugin(),
    WasmPlugin()
    // Inspect()
  ],
  optimizeDeps: {
    include: ["buffer/"],
    esbuildOptions: {
      plugins: [
        FixGracefulFsPlugin(),
        // TODO(wittjosiah): Compute nodeStd from package.json.
        ...nodeExternal ? [NodeExternalPlugin({ injectGlobals, nodeStd: true })] : []
      ]
    }
  },
  esbuild: {
    target: "es2020"
  },
  test: {
    ...resolveReporterConfig({ browserMode: true, cwd }),
    name: targetProject,
    env: {
      LOG_CONFIG: "log-config.yaml"
    },
    include: [
      "**/src/**/*.test.{ts,tsx}",
      "**/test/**/*.test.{ts,tsx}",
      "!**/src/**/*.node.test.{ts,tsx}",
      "!**/test/**/*.node.test.{ts,tsx}"
    ],
    testTimeout: isDebug ? 9999999 : 5e3,
    inspect: isDebug,
    isolate: false,
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    browser: {
      enabled: true,
      screenshotFailures: false,
      headless: !isDebug,
      provider: "playwright",
      name: browserName,
      isolate: false
    }
  }
});
var resolveReporterConfig = ({ browserMode, cwd }) => {
  const packageJson = pkgUp.sync({ cwd });
  const packageDir = packageJson.split("/").slice(0, -1).join("/");
  const packageDirRelative = relative(__vite_injected_original_dirname, packageDir);
  const coverageDir = join(__vite_injected_original_dirname, "coverage", packageDirRelative);
  if (shouldCreateXmlReport) {
    return {
      passWithNoTests: true,
      reporters: ["junit", "verbose"],
      // TODO(wittjosiah): Browser mode will overwrite this, should be separate directories
      //    however nx outputs config also needs to be aware of this.
      outputFile: join(__vite_injected_original_dirname, "test-results", packageDirRelative, "results.xml"),
      coverage: {
        reportsDirectory: coverageDir
      }
    };
  }
  return {
    passWithNoTests: true,
    reporters: ["verbose"],
    coverage: {
      reportsDirectory: coverageDir
    }
  };
};
var baseConfig = (options = {}) => {
  switch (environment) {
    case "chromium":
      return createBrowserConfig({ browserName: environment, ...options });
    case "node":
    default:
      if (environment.length > 0 && environment !== "node") {
        console.log("Unrecognized VITEST_ENV value, falling back to 'node': " + environment);
      }
      return createNodeConfig(options.cwd);
  }
};
function nodeStdPlugin() {
  return {
    name: "node-std",
    resolveId: {
      order: "pre",
      async handler(source, importer, options) {
        if (source.startsWith("node:")) {
          return this.resolve("@dxos/node-std/" + source.slice("node:".length), importer, options);
        }
        if (MODULES.includes(source)) {
          return this.resolve("@dxos/node-std/" + source, importer, options);
        }
      }
    }
  };
}

// packages/apps/composer-app/src/constants.ts
var APP_KEY = "composer.dxos.org";

// packages/apps/composer-app/vite.config.ts
var __vite_injected_original_dirname2 = "/Users/dmaretskyi/Code/dxos/dxos/packages/apps/composer-app";
var rootDir = resolve(__vite_injected_original_dirname2, "../../..");
var phosphorIconsCore = join2(rootDir, "/node_modules/@phosphor-icons/core/assets");
var isTrue = (str) => str === "true" || str === "1";
var isFalse = (str) => str === "false" || str === "0";
var vite_config_default = defineConfig2((env) => ({
  // Vitest config.
  test: mergeConfig(baseConfig({ cwd: __vite_injected_original_dirname2 }), defineConfig2({ test: { environment: "jsdom" } }))["test"],
  server: {
    host: true,
    https: process.env.HTTPS === "true" ? {
      key: "./key.pem",
      cert: "./cert.pem"
    } : void 0,
    fs: {
      strict: false,
      cachedChecks: false,
      allow: [
        // TODO(wittjosiah): Not detecting pnpm-workspace?
        //   https://vitejs.dev/config/server-options.html#server-fs-allow
        searchForWorkspaceRoot(process.cwd())
      ]
    }
  },
  esbuild: {
    keepNames: true
  },
  build: {
    sourcemap: true,
    minify: !isFalse(process.env.DX_MINIFY),
    target: ["chrome89", "edge89", "firefox89", "safari15"],
    rollupOptions: {
      // NOTE: Set cache to `false` to help debug flaky builds.
      // cache: false,
      input: {
        internal: resolve(__vite_injected_original_dirname2, "./internal.html"),
        main: resolve(__vite_injected_original_dirname2, "./index.html"),
        devtools: resolve(__vite_injected_original_dirname2, "./devtools.html"),
        "script-frame": resolve(__vite_injected_original_dirname2, "./script-frame/index.html")
      },
      output: {
        chunkFileNames,
        manualChunks: {
          react: ["react", "react-dom"]
        }
      },
      external: [
        // Provided at runtime by socket supply shell.
        "socket:application",
        "socket:process",
        "socket:window",
        "socket:os"
      ]
    }
  },
  resolve: {
    alias: {
      "node-fetch": "isomorphic-fetch"
    }
  },
  worker: {
    format: "es",
    plugins: () => [WasmPlugin2(), SourceMapsPlugin()]
  },
  plugins: [
    SourceMapsPlugin(),
    // TODO(wittjosiah): Causing issues with bundle.
    env.command === "serve" && tsconfigPaths({
      projects: ["../../../tsconfig.paths.json"]
    }),
    ConfigPlugin(),
    ThemePlugin({
      root: __vite_injected_original_dirname2,
      content: [
        join2(__vite_injected_original_dirname2, "./index.html"),
        join2(__vite_injected_original_dirname2, "./src/**/*.{js,ts,jsx,tsx}"),
        join2(rootDir, "/packages/experimental/*/src/**/*.{js,ts,jsx,tsx}"),
        join2(rootDir, "/packages/devtools/*/src/**/*.{js,ts,jsx,tsx}"),
        join2(rootDir, "/packages/plugins/*/src/**/*.{js,ts,jsx,tsx}"),
        join2(rootDir, "/packages/plugins/experimental/*/src/**/*.{js,ts,jsx,tsx}"),
        join2(rootDir, "/packages/sdk/*/src/**/*.{js,ts,jsx,tsx}"),
        join2(rootDir, "/packages/ui/*/src/**/*.{js,ts,jsx,tsx}")
      ]
    }),
    IconsPlugin({
      symbolPattern: "ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)",
      assetPath: (name, variant) => `${phosphorIconsCore}/${variant}/${name}${variant === "regular" ? "" : `-${variant}`}.svg`,
      spriteFile: "icons.svg",
      contentPaths: [
        join2(rootDir, "/{packages,tools}/**/dist/**/*.{mjs,html}"),
        join2(rootDir, "/{packages,tools}/**/src/**/*.{ts,tsx,js,jsx,css,md,html}")
      ]
      // verbose: true,
    }),
    // https://github.com/antfu-collective/vite-plugin-inspect#readme
    // Open: http://localhost:5173/__inspect
    isTrue(process.env.DX_INSPECT) && Inspect2(),
    WasmPlugin2(),
    ReactPlugin({
      tsDecorators: true,
      plugins: [
        [
          "@dxos/swc-log-plugin",
          {
            to_transform: [
              {
                name: "log",
                package: "@dxos/log",
                param_index: 2,
                include_args: false,
                include_call_site: true,
                include_scope: true
              },
              {
                name: "invariant",
                package: "@dxos/invariant",
                param_index: 2,
                include_args: true,
                include_call_site: false,
                include_scope: true
              },
              {
                name: "Context",
                package: "@dxos/context",
                param_index: 1,
                include_args: false,
                include_call_site: false,
                include_scope: false
              }
            ]
          }
        ]
      ]
    }),
    importMapPlugin({
      modules: [
        "@dxos/app-framework",
        "@dxos/app-graph",
        "@dxos/client",
        "@dxos/client/devtools",
        "@dxos/client/echo",
        "@dxos/client/halo",
        "@dxos/client/invitations",
        "@dxos/client/mesh",
        "@dxos/client-protocol",
        "@dxos/client-services",
        "@dxos/config",
        "@dxos/echo-schema",
        "@dxos/echo-signals",
        "@dxos/live-object",
        "@dxos/react-client",
        "@dxos/react-client/devtools",
        "@dxos/react-client/echo",
        "@dxos/react-client/halo",
        "@dxos/react-client/invitations",
        "@dxos/react-client/mesh",
        "@dxos/schema",
        "@effect/platform",
        "effect",
        "react",
        "react-dom"
      ]
    }),
    VitePWA({
      // No PWA for e2e tests because it slows them down (especially waiting to clear toasts).
      // No PWA in dev to make it easier to ensure the latest version is being used.
      // May be mitigated in the future by https://github.com/dxos/dxos/issues/4939.
      // https://vite-pwa-org.netlify.app/guide/unregister-service-worker.html#unregister-service-worker
      // NOTE: Check cached resources (on CF, and in the PWA).
      // curl -I --header "Cache-Control: no-cache" https://staging.composer.space/icons.svg
      selfDestroying: process.env.DX_PWA === "false",
      workbox: {
        maximumFileSizeToCacheInBytes: 3e7,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,woff2}"]
      },
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "DXOS Composer",
        short_name: "Composer",
        description: "DXOS Composer",
        theme_color: "#003E70",
        icons: [
          {
            "src": "pwa-64x64.png",
            "sizes": "64x64",
            "type": "image/png"
          },
          {
            "src": "pwa-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": "pwa-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
          },
          {
            "src": "maskable-icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ]
      }
    }),
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    sentryVitePlugin({
      org: "dxos",
      project: "composer-app",
      sourcemaps: {
        assets: "./packages/apps/composer-app/out/composer/**"
      },
      authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
      disable: process.env.DX_ENVIRONMENT !== "production",
      release: {
        name: `${APP_KEY}@${process.env.npm_package_version}`
      }
    }),
    ...process.env.DX_STATS ? [
      visualizer({
        emitFile: true,
        filename: "stats.html"
      }),
      // https://www.bundle-buddy.com/rollup
      {
        name: "bundle-buddy",
        buildEnd() {
          const deps = [];
          for (const id of this.getModuleIds()) {
            const m = this.getModuleInfo(id);
            if (m != null && !m.isExternal) {
              for (const target of m.importedIds) {
                deps.push({ source: m.id, target });
              }
            }
          }
          const outDir = join2(__vite_injected_original_dirname2, "out");
          if (!existsSync(outDir)) {
            mkdirSync(outDir);
          }
          writeFileSync(join2(outDir, "graph.json"), JSON.stringify(deps, null, 2));
        }
      }
    ] : []
  ]
  // Plugins
}));
function chunkFileNames(chunkInfo) {
  if (chunkInfo.facadeModuleId && chunkInfo.facadeModuleId.match(/index.[^\/]+$/gm)) {
    let segments = chunkInfo.facadeModuleId.split("/").reverse().slice(1);
    const nodeModulesIdx = segments.indexOf("node_modules");
    if (nodeModulesIdx !== -1) {
      segments = segments.slice(0, nodeModulesIdx);
    }
    const ignoredNames = ["dist", "lib", "browser"];
    const significantSegment = segments.find((segment) => !ignoredNames.includes(segment));
    if (significantSegment) {
      return `assets/${significantSegment}-[hash].js`;
    }
  }
  return "assets/[name]-[hash].js";
}
function importMapPlugin(options) {
  const chunkRefIds = {};
  let imports = {};
  return [
    {
      name: "import-map:get-chunk-ref-ids",
      async buildStart() {
        for (const m of options.modules) {
          const resolved = await this.resolve(m);
          if (resolved) {
            chunkRefIds[m] = this.emitFile({
              type: "chunk",
              id: resolved.id,
              // Preserve the original exports.
              preserveSignature: "strict"
            });
          }
        }
      },
      generateBundle() {
        imports = Object.fromEntries(options.modules.map((m) => [m, `/${this.getFileName(chunkRefIds[m])}`]));
      }
    },
    {
      name: "import-map:transform-index-html",
      enforce: "post",
      transformIndexHtml(html) {
        const tags = [{
          tag: "script",
          attrs: {
            type: "importmap"
          },
          children: JSON.stringify({ imports }, null, 2)
        }];
        return {
          html,
          tags
        };
      }
    }
  ];
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicGFja2FnZXMvYXBwcy9jb21wb3Nlci1hcHAvdml0ZS5jb25maWcudHMiLCAidml0ZXN0LnNoYXJlZC50cyIsICJwYWNrYWdlcy9hcHBzL2NvbXBvc2VyLWFwcC9zcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2RtYXJldHNreWkvQ29kZS9keG9zL2R4b3MvcGFja2FnZXMvYXBwcy9jb21wb3Nlci1hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9kbWFyZXRza3lpL0NvZGUvZHhvcy9keG9zL3BhY2thZ2VzL2FwcHMvY29tcG9zZXItYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9kbWFyZXRza3lpL0NvZGUvZHhvcy9keG9zL3BhY2thZ2VzL2FwcHMvY29tcG9zZXItYXBwL3ZpdGUuY29uZmlnLnRzXCI7Ly9cbi8vIENvcHlyaWdodCAyMDIyIERYT1Mub3JnXG4vL1xuXG5pbXBvcnQgeyBzZW50cnlWaXRlUGx1Z2luIH0gZnJvbSAnQHNlbnRyeS92aXRlLXBsdWdpbic7XG5pbXBvcnQgUmVhY3RQbHVnaW4gZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgU291cmNlTWFwc1BsdWdpbiBmcm9tICdyb2xsdXAtcGx1Z2luLXNvdXJjZW1hcHMnO1xuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gJ3JvbGx1cC1wbHVnaW4tdmlzdWFsaXplcic7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIHNlYXJjaEZvcldvcmtzcGFjZVJvb3QsIHR5cGUgUGx1Z2luIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgSW5zcGVjdCBmcm9tICd2aXRlLXBsdWdpbi1pbnNwZWN0JztcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xuaW1wb3J0IFdhc21QbHVnaW4gZnJvbSAndml0ZS1wbHVnaW4td2FzbSc7XG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tICd2aXRlLXRzY29uZmlnLXBhdGhzJztcblxuaW1wb3J0IHsgQ29uZmlnUGx1Z2luIH0gZnJvbSAnQGR4b3MvY29uZmlnL3ZpdGUtcGx1Z2luJztcbmltcG9ydCB7IFRoZW1lUGx1Z2luIH0gZnJvbSAnQGR4b3MvcmVhY3QtdWktdGhlbWUvcGx1Z2luJztcbmltcG9ydCB7IEljb25zUGx1Z2luIH0gZnJvbSAnQGR4b3Mvdml0ZS1wbHVnaW4taWNvbnMnO1xuaW1wb3J0IHsgbWVyZ2VDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCB7IGJhc2VDb25maWcgfSBmcm9tICcuLi8uLi8uLi92aXRlc3Quc2hhcmVkJztcblxuaW1wb3J0IHsgQVBQX0tFWSB9IGZyb20gJy4vc3JjL2NvbnN0YW50cyc7XG5cbmNvbnN0IHJvb3REaXIgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy4uJyk7XG5jb25zdCBwaG9zcGhvckljb25zQ29yZSA9IGpvaW4ocm9vdERpciwgJy9ub2RlX21vZHVsZXMvQHBob3NwaG9yLWljb25zL2NvcmUvYXNzZXRzJyk7XG5cbmNvbnN0IGlzVHJ1ZSA9IChzdHI/OiBzdHJpbmcpID0+IHN0ciA9PT0gJ3RydWUnIHx8IHN0ciA9PT0gJzEnO1xuY29uc3QgaXNGYWxzZSA9IChzdHI/OiBzdHJpbmcpID0+IHN0ciA9PT0gJ2ZhbHNlJyB8fCBzdHIgPT09ICcwJztcblxuLyoqXG4gKiBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoZW52KSA9PiAoe1xuICAvLyBWaXRlc3QgY29uZmlnLlxuICB0ZXN0OiBtZXJnZUNvbmZpZyhiYXNlQ29uZmlnKHsgY3dkOiBfX2Rpcm5hbWUgfSksIGRlZmluZUNvbmZpZyh7IHRlc3Q6IHsgZW52aXJvbm1lbnQ6ICdqc2RvbScgfSB9KSlbJ3Rlc3QnXSBhcyBhbnksXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IHRydWUsXG4gICAgaHR0cHM6XG4gICAgICBwcm9jZXNzLmVudi5IVFRQUyA9PT0gJ3RydWUnXG4gICAgICAgID8ge1xuICAgICAgICAgICAga2V5OiAnLi9rZXkucGVtJyxcbiAgICAgICAgICAgIGNlcnQ6ICcuL2NlcnQucGVtJyxcbiAgICAgICAgICB9XG4gICAgICAgIDogdW5kZWZpbmVkLFxuICAgIGZzOiB7XG4gICAgICBzdHJpY3Q6IGZhbHNlLFxuICAgICAgY2FjaGVkQ2hlY2tzOiBmYWxzZSxcbiAgICAgIGFsbG93OiBbXG4gICAgICAgIC8vIFRPRE8od2l0dGpvc2lhaCk6IE5vdCBkZXRlY3RpbmcgcG5wbS13b3Jrc3BhY2U/XG4gICAgICAgIC8vICAgaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9zZXJ2ZXItb3B0aW9ucy5odG1sI3NlcnZlci1mcy1hbGxvd1xuICAgICAgICBzZWFyY2hGb3JXb3Jrc3BhY2VSb290KHByb2Nlc3MuY3dkKCkpLFxuICAgICAgXSxcbiAgICB9LFxuICB9LFxuICBlc2J1aWxkOiB7XG4gICAga2VlcE5hbWVzOiB0cnVlLFxuICB9LFxuICBidWlsZDoge1xuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICBtaW5pZnk6ICFpc0ZhbHNlKHByb2Nlc3MuZW52LkRYX01JTklGWSksXG4gICAgdGFyZ2V0OiBbJ2Nocm9tZTg5JywgJ2VkZ2U4OScsICdmaXJlZm94ODknLCAnc2FmYXJpMTUnXSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAvLyBOT1RFOiBTZXQgY2FjaGUgdG8gYGZhbHNlYCB0byBoZWxwIGRlYnVnIGZsYWt5IGJ1aWxkcy5cbiAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgIGlucHV0OiB7XG4gICAgICAgIGludGVybmFsOiByZXNvbHZlKF9fZGlybmFtZSwgJy4vaW50ZXJuYWwuaHRtbCcpLFxuICAgICAgICBtYWluOiByZXNvbHZlKF9fZGlybmFtZSwgJy4vaW5kZXguaHRtbCcpLFxuICAgICAgICBkZXZ0b29sczogcmVzb2x2ZShfX2Rpcm5hbWUsICcuL2RldnRvb2xzLmh0bWwnKSxcbiAgICAgICAgJ3NjcmlwdC1mcmFtZSc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zY3JpcHQtZnJhbWUvaW5kZXguaHRtbCcpLFxuICAgICAgfSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBjaHVua0ZpbGVOYW1lcyxcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgcmVhY3Q6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgZXh0ZXJuYWw6IFtcbiAgICAgICAgLy8gUHJvdmlkZWQgYXQgcnVudGltZSBieSBzb2NrZXQgc3VwcGx5IHNoZWxsLlxuICAgICAgICAnc29ja2V0OmFwcGxpY2F0aW9uJyxcbiAgICAgICAgJ3NvY2tldDpwcm9jZXNzJyxcbiAgICAgICAgJ3NvY2tldDp3aW5kb3cnLFxuICAgICAgICAnc29ja2V0Om9zJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnbm9kZS1mZXRjaCc6ICdpc29tb3JwaGljLWZldGNoJyxcbiAgICB9LFxuICB9LFxuICB3b3JrZXI6IHtcbiAgICBmb3JtYXQ6ICdlcycgYXMgY29uc3QsXG4gICAgcGx1Z2luczogKCkgPT4gW1dhc21QbHVnaW4oKSwgU291cmNlTWFwc1BsdWdpbigpXSxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIFNvdXJjZU1hcHNQbHVnaW4oKSxcbiAgICAvLyBUT0RPKHdpdHRqb3NpYWgpOiBDYXVzaW5nIGlzc3VlcyB3aXRoIGJ1bmRsZS5cbiAgICBlbnYuY29tbWFuZCA9PT0gJ3NlcnZlJyAmJlxuICAgICAgdHNjb25maWdQYXRocyh7XG4gICAgICAgIHByb2plY3RzOiBbJy4uLy4uLy4uL3RzY29uZmlnLnBhdGhzLmpzb24nXSxcbiAgICAgIH0pLFxuICAgIENvbmZpZ1BsdWdpbigpLFxuICAgIFRoZW1lUGx1Z2luKHtcbiAgICAgIHJvb3Q6IF9fZGlybmFtZSxcbiAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgam9pbihfX2Rpcm5hbWUsICcuL2luZGV4Lmh0bWwnKSxcbiAgICAgICAgam9pbihfX2Rpcm5hbWUsICcuL3NyYy8qKi8qLntqcyx0cyxqc3gsdHN4fScpLFxuICAgICAgICBqb2luKHJvb3REaXIsICcvcGFja2FnZXMvZXhwZXJpbWVudGFsLyovc3JjLyoqLyoue2pzLHRzLGpzeCx0c3h9JyksXG4gICAgICAgIGpvaW4ocm9vdERpciwgJy9wYWNrYWdlcy9kZXZ0b29scy8qL3NyYy8qKi8qLntqcyx0cyxqc3gsdHN4fScpLFxuICAgICAgICBqb2luKHJvb3REaXIsICcvcGFja2FnZXMvcGx1Z2lucy8qL3NyYy8qKi8qLntqcyx0cyxqc3gsdHN4fScpLFxuICAgICAgICBqb2luKHJvb3REaXIsICcvcGFja2FnZXMvcGx1Z2lucy9leHBlcmltZW50YWwvKi9zcmMvKiovKi57anMsdHMsanN4LHRzeH0nKSxcbiAgICAgICAgam9pbihyb290RGlyLCAnL3BhY2thZ2VzL3Nkay8qL3NyYy8qKi8qLntqcyx0cyxqc3gsdHN4fScpLFxuICAgICAgICBqb2luKHJvb3REaXIsICcvcGFja2FnZXMvdWkvKi9zcmMvKiovKi57anMsdHMsanN4LHRzeH0nKSxcbiAgICAgIF0sXG4gICAgfSksXG4gICAgSWNvbnNQbHVnaW4oe1xuICAgICAgc3ltYm9sUGF0dGVybjogJ3BoLS0oW2Etel0rW2Etei1dKiktLShib2xkfGR1b3RvbmV8ZmlsbHxsaWdodHxyZWd1bGFyfHRoaW4pJyxcbiAgICAgIGFzc2V0UGF0aDogKG5hbWUsIHZhcmlhbnQpID0+XG4gICAgICAgIGAke3Bob3NwaG9ySWNvbnNDb3JlfS8ke3ZhcmlhbnR9LyR7bmFtZX0ke3ZhcmlhbnQgPT09ICdyZWd1bGFyJyA/ICcnIDogYC0ke3ZhcmlhbnR9YH0uc3ZnYCxcbiAgICAgIHNwcml0ZUZpbGU6ICdpY29ucy5zdmcnLFxuICAgICAgY29udGVudFBhdGhzOiBbXG4gICAgICAgIGpvaW4ocm9vdERpciwgJy97cGFja2FnZXMsdG9vbHN9LyoqL2Rpc3QvKiovKi57bWpzLGh0bWx9JyksXG4gICAgICAgIGpvaW4ocm9vdERpciwgJy97cGFja2FnZXMsdG9vbHN9LyoqL3NyYy8qKi8qLnt0cyx0c3gsanMsanN4LGNzcyxtZCxodG1sfScpLFxuICAgICAgXSxcbiAgICAgIC8vIHZlcmJvc2U6IHRydWUsXG4gICAgfSksXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FudGZ1LWNvbGxlY3RpdmUvdml0ZS1wbHVnaW4taW5zcGVjdCNyZWFkbWVcbiAgICAvLyBPcGVuOiBodHRwOi8vbG9jYWxob3N0OjUxNzMvX19pbnNwZWN0XG4gICAgaXNUcnVlKHByb2Nlc3MuZW52LkRYX0lOU1BFQ1QpICYmIEluc3BlY3QoKSxcbiAgICBXYXNtUGx1Z2luKCksXG4gICAgUmVhY3RQbHVnaW4oe1xuICAgICAgdHNEZWNvcmF0b3JzOiB0cnVlLFxuICAgICAgcGx1Z2luczogW1xuICAgICAgICBbXG4gICAgICAgICAgJ0BkeG9zL3N3Yy1sb2ctcGx1Z2luJyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0b190cmFuc2Zvcm06IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdsb2cnLFxuICAgICAgICAgICAgICAgIHBhY2thZ2U6ICdAZHhvcy9sb2cnLFxuICAgICAgICAgICAgICAgIHBhcmFtX2luZGV4OiAyLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVfYXJnczogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW5jbHVkZV9jYWxsX3NpdGU6IHRydWUsXG4gICAgICAgICAgICAgICAgaW5jbHVkZV9zY29wZTogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdpbnZhcmlhbnQnLFxuICAgICAgICAgICAgICAgIHBhY2thZ2U6ICdAZHhvcy9pbnZhcmlhbnQnLFxuICAgICAgICAgICAgICAgIHBhcmFtX2luZGV4OiAyLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVfYXJnczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlX2NhbGxfc2l0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW5jbHVkZV9zY29wZTogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdDb250ZXh0JyxcbiAgICAgICAgICAgICAgICBwYWNrYWdlOiAnQGR4b3MvY29udGV4dCcsXG4gICAgICAgICAgICAgICAgcGFyYW1faW5kZXg6IDEsXG4gICAgICAgICAgICAgICAgaW5jbHVkZV9hcmdzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlX2NhbGxfc2l0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW5jbHVkZV9zY29wZTogZmFsc2UsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICBdLFxuICAgIH0pLFxuICAgIGltcG9ydE1hcFBsdWdpbih7XG4gICAgICBtb2R1bGVzOiBbXG4gICAgICAgICdAZHhvcy9hcHAtZnJhbWV3b3JrJyxcbiAgICAgICAgJ0BkeG9zL2FwcC1ncmFwaCcsXG4gICAgICAgICdAZHhvcy9jbGllbnQnLFxuICAgICAgICAnQGR4b3MvY2xpZW50L2RldnRvb2xzJyxcbiAgICAgICAgJ0BkeG9zL2NsaWVudC9lY2hvJyxcbiAgICAgICAgJ0BkeG9zL2NsaWVudC9oYWxvJyxcbiAgICAgICAgJ0BkeG9zL2NsaWVudC9pbnZpdGF0aW9ucycsXG4gICAgICAgICdAZHhvcy9jbGllbnQvbWVzaCcsXG4gICAgICAgICdAZHhvcy9jbGllbnQtcHJvdG9jb2wnLFxuICAgICAgICAnQGR4b3MvY2xpZW50LXNlcnZpY2VzJyxcbiAgICAgICAgJ0BkeG9zL2NvbmZpZycsXG4gICAgICAgICdAZHhvcy9lY2hvLXNjaGVtYScsXG4gICAgICAgICdAZHhvcy9lY2hvLXNpZ25hbHMnLFxuICAgICAgICAnQGR4b3MvbGl2ZS1vYmplY3QnLFxuICAgICAgICAnQGR4b3MvcmVhY3QtY2xpZW50JyxcbiAgICAgICAgJ0BkeG9zL3JlYWN0LWNsaWVudC9kZXZ0b29scycsXG4gICAgICAgICdAZHhvcy9yZWFjdC1jbGllbnQvZWNobycsXG4gICAgICAgICdAZHhvcy9yZWFjdC1jbGllbnQvaGFsbycsXG4gICAgICAgICdAZHhvcy9yZWFjdC1jbGllbnQvaW52aXRhdGlvbnMnLFxuICAgICAgICAnQGR4b3MvcmVhY3QtY2xpZW50L21lc2gnLFxuICAgICAgICAnQGR4b3Mvc2NoZW1hJyxcbiAgICAgICAgJ0BlZmZlY3QvcGxhdGZvcm0nLFxuICAgICAgICAnZWZmZWN0JyxcbiAgICAgICAgJ3JlYWN0JyxcbiAgICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICBdLFxuICAgIH0pLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgLy8gTm8gUFdBIGZvciBlMmUgdGVzdHMgYmVjYXVzZSBpdCBzbG93cyB0aGVtIGRvd24gKGVzcGVjaWFsbHkgd2FpdGluZyB0byBjbGVhciB0b2FzdHMpLlxuICAgICAgLy8gTm8gUFdBIGluIGRldiB0byBtYWtlIGl0IGVhc2llciB0byBlbnN1cmUgdGhlIGxhdGVzdCB2ZXJzaW9uIGlzIGJlaW5nIHVzZWQuXG4gICAgICAvLyBNYXkgYmUgbWl0aWdhdGVkIGluIHRoZSBmdXR1cmUgYnkgaHR0cHM6Ly9naXRodWIuY29tL2R4b3MvZHhvcy9pc3N1ZXMvNDkzOS5cbiAgICAgIC8vIGh0dHBzOi8vdml0ZS1wd2Etb3JnLm5ldGxpZnkuYXBwL2d1aWRlL3VucmVnaXN0ZXItc2VydmljZS13b3JrZXIuaHRtbCN1bnJlZ2lzdGVyLXNlcnZpY2Utd29ya2VyXG4gICAgICAvLyBOT1RFOiBDaGVjayBjYWNoZWQgcmVzb3VyY2VzIChvbiBDRiwgYW5kIGluIHRoZSBQV0EpLlxuICAgICAgLy8gY3VybCAtSSAtLWhlYWRlciBcIkNhY2hlLUNvbnRyb2w6IG5vLWNhY2hlXCIgaHR0cHM6Ly9zdGFnaW5nLmNvbXBvc2VyLnNwYWNlL2ljb25zLnN2Z1xuICAgICAgc2VsZkRlc3Ryb3lpbmc6IHByb2Nlc3MuZW52LkRYX1BXQSA9PT0gJ2ZhbHNlJyxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDMwMDAwMDAwLFxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd2FzbSx3b2ZmMn0nXSxcbiAgICAgIH0sXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJ10sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnRFhPUyBDb21wb3NlcicsXG4gICAgICAgIHNob3J0X25hbWU6ICdDb21wb3NlcicsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRFhPUyBDb21wb3NlcicsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzAwM0U3MCcsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJzcmNcIjogXCJwd2EtNjR4NjQucG5nXCIsXG4gICAgICAgICAgICBcInNpemVzXCI6IFwiNjR4NjRcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInNyY1wiOiBcInB3YS0xOTJ4MTkyLnBuZ1wiLFxuICAgICAgICAgICAgXCJzaXplc1wiOiBcIjE5MngxOTJcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInNyY1wiOiBcInB3YS01MTJ4NTEyLnBuZ1wiLFxuICAgICAgICAgICAgXCJzaXplc1wiOiBcIjUxMng1MTJcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImltYWdlL3BuZ1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInNyY1wiOiBcIm1hc2thYmxlLWljb24tNTEyeDUxMi5wbmdcIixcbiAgICAgICAgICAgIFwic2l6ZXNcIjogXCI1MTJ4NTEyXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgIFwicHVycG9zZVwiOiBcIm1hc2thYmxlXCJcbiAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pLFxuICAgIC8vIGh0dHBzOi8vZG9jcy5zZW50cnkuaW8vcGxhdGZvcm1zL2phdmFzY3JpcHQvc291cmNlbWFwcy91cGxvYWRpbmcvdml0ZVxuICAgIC8vIGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0BzZW50cnkvdml0ZS1wbHVnaW5cbiAgICBzZW50cnlWaXRlUGx1Z2luKHtcbiAgICAgIG9yZzogJ2R4b3MnLFxuICAgICAgcHJvamVjdDogJ2NvbXBvc2VyLWFwcCcsXG4gICAgICBzb3VyY2VtYXBzOiB7XG4gICAgICAgIGFzc2V0czogJy4vcGFja2FnZXMvYXBwcy9jb21wb3Nlci1hcHAvb3V0L2NvbXBvc2VyLyoqJyxcbiAgICAgIH0sXG4gICAgICBhdXRoVG9rZW46IHByb2Nlc3MuZW52LlNFTlRSWV9SRUxFQVNFX0FVVEhfVE9LRU4sXG4gICAgICBkaXNhYmxlOiBwcm9jZXNzLmVudi5EWF9FTlZJUk9OTUVOVCAhPT0gJ3Byb2R1Y3Rpb24nLFxuICAgICAgcmVsZWFzZToge1xuICAgICAgICBuYW1lOiBgJHtBUFBfS0VZfUAke3Byb2Nlc3MuZW52Lm5wbV9wYWNrYWdlX3ZlcnNpb259YCxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgLi4uKHByb2Nlc3MuZW52LkRYX1NUQVRTXG4gICAgICA/IFtcbiAgICAgICAgICB2aXN1YWxpemVyKHtcbiAgICAgICAgICAgIGVtaXRGaWxlOiB0cnVlLFxuICAgICAgICAgICAgZmlsZW5hbWU6ICdzdGF0cy5odG1sJyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICAvLyBodHRwczovL3d3dy5idW5kbGUtYnVkZHkuY29tL3JvbGx1cFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdidW5kbGUtYnVkZHknLFxuICAgICAgICAgICAgYnVpbGRFbmQoKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlcHM6IHsgc291cmNlOiBzdHJpbmc7IHRhcmdldDogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgIGZvciAoY29uc3QgaWQgb2YgdGhpcy5nZXRNb2R1bGVJZHMoKSkge1xuICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICBjb25zdCBtID0gdGhpcy5nZXRNb2R1bGVJbmZvKGlkKTtcbiAgICAgICAgICAgICAgICBpZiAobSAhPSBudWxsICYmICFtLmlzRXh0ZXJuYWwpIHtcbiAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIG0uaW1wb3J0ZWRJZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVwcy5wdXNoKHsgc291cmNlOiBtLmlkLCB0YXJnZXQgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3Qgb3V0RGlyID0gam9pbihfX2Rpcm5hbWUsICdvdXQnKTtcbiAgICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKG91dERpcikpIHtcbiAgICAgICAgICAgICAgICBta2RpclN5bmMob3V0RGlyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKGpvaW4ob3V0RGlyLCAnZ3JhcGguanNvbicpLCBKU09OLnN0cmluZ2lmeShkZXBzLCBudWxsLCAyKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF1cbiAgICAgIDogW10pLFxuICBdLCAvLyBQbHVnaW5zXG59KSk7XG5cbi8qKlxuICogR2VuZXJhdGUgbmljZXIgY2h1bmsgbmFtZXMuXG4gKiBEZWZhdWx0IG1ha2VzIG1vc3QgY2h1bmtzIGhhdmUgbmFtZXMgbGlrZSBpbmRleC1baGFzaF0uanMuXG4gKi9cbmZ1bmN0aW9uIGNodW5rRmlsZU5hbWVzKGNodW5rSW5mbzogYW55KSB7XG4gIGlmIChjaHVua0luZm8uZmFjYWRlTW9kdWxlSWQgJiYgY2h1bmtJbmZvLmZhY2FkZU1vZHVsZUlkLm1hdGNoKC9pbmRleC5bXlxcL10rJC9nbSkpIHtcbiAgICBsZXQgc2VnbWVudHM6IGFueVtdID0gY2h1bmtJbmZvLmZhY2FkZU1vZHVsZUlkLnNwbGl0KCcvJykucmV2ZXJzZSgpLnNsaWNlKDEpO1xuICAgIGNvbnN0IG5vZGVNb2R1bGVzSWR4ID0gc2VnbWVudHMuaW5kZXhPZignbm9kZV9tb2R1bGVzJyk7XG4gICAgaWYgKG5vZGVNb2R1bGVzSWR4ICE9PSAtMSkge1xuICAgICAgc2VnbWVudHMgPSBzZWdtZW50cy5zbGljZSgwLCBub2RlTW9kdWxlc0lkeCk7XG4gICAgfVxuICAgIGNvbnN0IGlnbm9yZWROYW1lcyA9IFsnZGlzdCcsICdsaWInLCAnYnJvd3NlciddO1xuICAgIGNvbnN0IHNpZ25pZmljYW50U2VnbWVudCA9IHNlZ21lbnRzLmZpbmQoKHNlZ21lbnQpID0+ICFpZ25vcmVkTmFtZXMuaW5jbHVkZXMoc2VnbWVudCkpO1xuICAgIGlmIChzaWduaWZpY2FudFNlZ21lbnQpIHtcbiAgICAgIHJldHVybiBgYXNzZXRzLyR7c2lnbmlmaWNhbnRTZWdtZW50fS1baGFzaF0uanNgO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnO1xufVxuXG5mdW5jdGlvbiBpbXBvcnRNYXBQbHVnaW4ob3B0aW9uczogeyBtb2R1bGVzOiBzdHJpbmdbXSB9KSB7XG4gIGNvbnN0IGNodW5rUmVmSWRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGxldCBpbXBvcnRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cbiAgcmV0dXJuIFtcbiAgICB7XG4gICAgICBuYW1lOiAnaW1wb3J0LW1hcDpnZXQtY2h1bmstcmVmLWlkcycsXG4gICAgICBhc3luYyBidWlsZFN0YXJ0KCkge1xuICAgICAgICBmb3IgKGNvbnN0IG0gb2Ygb3B0aW9ucy5tb2R1bGVzKSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCB0aGlzLnJlc29sdmUobSk7XG4gICAgICAgICAgaWYgKHJlc29sdmVkKSB7XG4gICAgICAgICAgICAvLyBFbWl0IHRoZSBjaHVuayBkdXJpbmcgYnVpbGQgc3RhcnQuXG4gICAgICAgICAgICBjaHVua1JlZklkc1ttXSA9IHRoaXMuZW1pdEZpbGUoe1xuICAgICAgICAgICAgICB0eXBlOiAnY2h1bmsnLFxuICAgICAgICAgICAgICBpZDogcmVzb2x2ZWQuaWQsXG4gICAgICAgICAgICAgIC8vIFByZXNlcnZlIHRoZSBvcmlnaW5hbCBleHBvcnRzLlxuICAgICAgICAgICAgICBwcmVzZXJ2ZVNpZ25hdHVyZTogJ3N0cmljdCcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIGdlbmVyYXRlQnVuZGxlKCkge1xuICAgICAgICBpbXBvcnRzID0gT2JqZWN0LmZyb21FbnRyaWVzKG9wdGlvbnMubW9kdWxlcy5tYXAobSA9PiBbbSwgYC8ke3RoaXMuZ2V0RmlsZU5hbWUoY2h1bmtSZWZJZHNbbV0pfWBdKSk7XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnaW1wb3J0LW1hcDp0cmFuc2Zvcm0taW5kZXgtaHRtbCcsXG4gICAgICBlbmZvcmNlOiAncG9zdCcsXG4gICAgICB0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHRhZ3MgPSBbe1xuICAgICAgICAgIHRhZzogJ3NjcmlwdCcsXG4gICAgICAgICAgYXR0cnM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdpbXBvcnRtYXAnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IEpTT04uc3RyaW5naWZ5KHsgaW1wb3J0cyB9LCBudWxsLCAyKSxcbiAgICAgICAgfV07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBodG1sLFxuICAgICAgICAgIHRhZ3MsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIF0gc2F0aXNmaWVzIFBsdWdpbltdO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZG1hcmV0c2t5aS9Db2RlL2R4b3MvZHhvc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2RtYXJldHNreWkvQ29kZS9keG9zL2R4b3Mvdml0ZXN0LnNoYXJlZC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZG1hcmV0c2t5aS9Db2RlL2R4b3MvZHhvcy92aXRlc3Quc2hhcmVkLnRzXCI7Ly9cbi8vIENvcHlyaWdodCAyMDI0IERYT1Mub3JnXG4vL1xuXG5pbXBvcnQgeyBqb2luLCByZWxhdGl2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgcGtnVXAgZnJvbSAncGtnLXVwJztcbmltcG9ydCB7IHR5cGUgUGx1Z2luLCBVc2VyQ29uZmlnIGFzIFZpdGVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgdHlwZSBVc2VyQ29uZmlnIGFzIFZpdGVzdENvbmZpZyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnO1xuaW1wb3J0IFdhc21QbHVnaW4gZnJvbSAndml0ZS1wbHVnaW4td2FzbSc7XG5pbXBvcnQgSW5zcGVjdCBmcm9tICd2aXRlLXBsdWdpbi1pbnNwZWN0JztcblxuaW1wb3J0IHsgRml4R3JhY2VmdWxGc1BsdWdpbiwgTm9kZUV4dGVybmFsUGx1Z2luIH0gZnJvbSAnQGR4b3MvZXNidWlsZC1wbHVnaW5zJztcbmltcG9ydCB7IEdMT0JBTFMsIE1PRFVMRVMgfSBmcm9tICdAZHhvcy9ub2RlLXN0ZC9fL2NvbmZpZyc7XG5cbmNvbnN0IHRhcmdldFByb2plY3QgPSBTdHJpbmcocHJvY2Vzcy5lbnYuTlhfVEFTS19UQVJHRVRfUFJPSkVDVCk7XG5jb25zdCBpc0RlYnVnID0gISFwcm9jZXNzLmVudi5WSVRFU1RfREVCVUc7XG5jb25zdCBlbnZpcm9ubWVudCA9IChwcm9jZXNzLmVudi5WSVRFU1RfRU5WID8/ICdub2RlJykudG9Mb3dlckNhc2UoKTtcbmNvbnN0IHNob3VsZENyZWF0ZVhtbFJlcG9ydCA9IEJvb2xlYW4ocHJvY2Vzcy5lbnYuVklURVNUX1hNTF9SRVBPUlQpO1xuXG5jb25zdCBjcmVhdGVOb2RlQ29uZmlnID0gKGN3ZDogc3RyaW5nKSA9PlxuICBkZWZpbmVDb25maWcoe1xuICAgIGVzYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgfSxcbiAgICB0ZXN0OiB7XG4gICAgICAuLi5yZXNvbHZlUmVwb3J0ZXJDb25maWcoeyBicm93c2VyTW9kZTogZmFsc2UsIGN3ZCB9KSxcbiAgICAgIGVudmlyb25tZW50OiAnbm9kZScsXG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICcqKi9zcmMvKiovKi50ZXN0Lnt0cyx0c3h9JyxcbiAgICAgICAgJyoqL3Rlc3QvKiovKi50ZXN0Lnt0cyx0c3h9JyxcbiAgICAgICAgJyEqKi9zcmMvKiovKi5icm93c2VyLnRlc3Que3RzLHRzeH0nLFxuICAgICAgICAnISoqL3Rlc3QvKiovKi5icm93c2VyLnRlc3Que3RzLHRzeH0nLFxuICAgICAgXSxcbiAgICB9LFxuICAgIC8vIFNob3dzIGJ1aWxkIHRyYWNlXG4gICAgLy8gVklURV9JTlNQRUNUPTEgcG5wbSB2aXRlc3QgLS11aVxuICAgIC8vIGh0dHA6Ly9sb2NhbGhvc3Q6NTEyMDQvX19pbnNwZWN0LyMvXG4gICAgcGx1Z2luczogW3Byb2Nlc3MuZW52LlZJVEVfSU5TUEVDVCAmJiBJbnNwZWN0KCldLFxuICB9KTtcblxudHlwZSBCcm93c2VyT3B0aW9ucyA9IHtcbiAgYnJvd3Nlck5hbWU6IHN0cmluZztcbiAgY3dkOiBzdHJpbmc7XG4gIG5vZGVFeHRlcm5hbD86IGJvb2xlYW47XG4gIGluamVjdEdsb2JhbHM/OiBib29sZWFuO1xufTtcblxuY29uc3QgY3JlYXRlQnJvd3NlckNvbmZpZyA9ICh7IGJyb3dzZXJOYW1lLCBjd2QsIG5vZGVFeHRlcm5hbCA9IGZhbHNlLCBpbmplY3RHbG9iYWxzID0gdHJ1ZSB9OiBCcm93c2VyT3B0aW9ucykgPT5cbiAgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICBub2RlU3RkUGx1Z2luKCksXG4gICAgICBXYXNtUGx1Z2luKCksXG4gICAgICAvLyBJbnNwZWN0KClcbiAgICBdLFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogWydidWZmZXIvJ10sXG4gICAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgRml4R3JhY2VmdWxGc1BsdWdpbigpLFxuICAgICAgICAgIC8vIFRPRE8od2l0dGpvc2lhaCk6IENvbXB1dGUgbm9kZVN0ZCBmcm9tIHBhY2thZ2UuanNvbi5cbiAgICAgICAgICAuLi4obm9kZUV4dGVybmFsID8gW05vZGVFeHRlcm5hbFBsdWdpbih7IGluamVjdEdsb2JhbHMsIG5vZGVTdGQ6IHRydWUgfSldIDogW10pLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGVzYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgfSxcbiAgICB0ZXN0OiB7XG4gICAgICAuLi5yZXNvbHZlUmVwb3J0ZXJDb25maWcoeyBicm93c2VyTW9kZTogdHJ1ZSwgY3dkIH0pLFxuICAgICAgbmFtZTogdGFyZ2V0UHJvamVjdCxcblxuICAgICAgZW52OiB7XG4gICAgICAgIExPR19DT05GSUc6ICdsb2ctY29uZmlnLnlhbWwnLFxuICAgICAgfSxcblxuICAgICAgaW5jbHVkZTogW1xuICAgICAgICAnKiovc3JjLyoqLyoudGVzdC57dHMsdHN4fScsXG4gICAgICAgICcqKi90ZXN0LyoqLyoudGVzdC57dHMsdHN4fScsXG4gICAgICAgICchKiovc3JjLyoqLyoubm9kZS50ZXN0Lnt0cyx0c3h9JyxcbiAgICAgICAgJyEqKi90ZXN0LyoqLyoubm9kZS50ZXN0Lnt0cyx0c3h9JyxcbiAgICAgIF0sXG5cbiAgICAgIHRlc3RUaW1lb3V0OiBpc0RlYnVnID8gOTk5OTk5OSA6IDUwMDAsXG4gICAgICBpbnNwZWN0OiBpc0RlYnVnLFxuXG4gICAgICBpc29sYXRlOiBmYWxzZSxcbiAgICAgIHBvb2xPcHRpb25zOiB7XG4gICAgICAgIHRocmVhZHM6IHtcbiAgICAgICAgICBzaW5nbGVUaHJlYWQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuXG4gICAgICBicm93c2VyOiB7XG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgIHNjcmVlbnNob3RGYWlsdXJlczogZmFsc2UsXG4gICAgICAgIGhlYWRsZXNzOiAhaXNEZWJ1ZyxcbiAgICAgICAgcHJvdmlkZXI6ICdwbGF5d3JpZ2h0JyxcbiAgICAgICAgbmFtZTogYnJvd3Nlck5hbWUsXG4gICAgICAgIGlzb2xhdGU6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxuY29uc3QgcmVzb2x2ZVJlcG9ydGVyQ29uZmlnID0gKHsgYnJvd3Nlck1vZGUsIGN3ZCB9OiB7IGJyb3dzZXJNb2RlOiBib29sZWFuOyBjd2Q6IHN0cmluZyB9KTogVml0ZXN0Q29uZmlnWyd0ZXN0J10gPT4ge1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IHBrZ1VwLnN5bmMoeyBjd2QgfSk7XG4gIGNvbnN0IHBhY2thZ2VEaXIgPSBwYWNrYWdlSnNvbiEuc3BsaXQoJy8nKS5zbGljZSgwLCAtMSkuam9pbignLycpO1xuICBjb25zdCBwYWNrYWdlRGlyUmVsYXRpdmUgPSByZWxhdGl2ZShfX2Rpcm5hbWUsIHBhY2thZ2VEaXIpO1xuICBjb25zdCBjb3ZlcmFnZURpciA9IGpvaW4oX19kaXJuYW1lLCAnY292ZXJhZ2UnLCBwYWNrYWdlRGlyUmVsYXRpdmUpO1xuXG4gIGlmIChzaG91bGRDcmVhdGVYbWxSZXBvcnQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcGFzc1dpdGhOb1Rlc3RzOiB0cnVlLFxuICAgICAgcmVwb3J0ZXJzOiBbJ2p1bml0JywgJ3ZlcmJvc2UnXSxcbiAgICAgIC8vIFRPRE8od2l0dGpvc2lhaCk6IEJyb3dzZXIgbW9kZSB3aWxsIG92ZXJ3cml0ZSB0aGlzLCBzaG91bGQgYmUgc2VwYXJhdGUgZGlyZWN0b3JpZXNcbiAgICAgIC8vICAgIGhvd2V2ZXIgbnggb3V0cHV0cyBjb25maWcgYWxzbyBuZWVkcyB0byBiZSBhd2FyZSBvZiB0aGlzLlxuICAgICAgb3V0cHV0RmlsZTogam9pbihfX2Rpcm5hbWUsICd0ZXN0LXJlc3VsdHMnLCBwYWNrYWdlRGlyUmVsYXRpdmUsICdyZXN1bHRzLnhtbCcpLFxuICAgICAgY292ZXJhZ2U6IHtcbiAgICAgICAgcmVwb3J0c0RpcmVjdG9yeTogY292ZXJhZ2VEaXIsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHBhc3NXaXRoTm9UZXN0czogdHJ1ZSxcbiAgICByZXBvcnRlcnM6IFsndmVyYm9zZSddLFxuICAgIGNvdmVyYWdlOiB7XG4gICAgICByZXBvcnRzRGlyZWN0b3J5OiBjb3ZlcmFnZURpcixcbiAgICB9LFxuICB9O1xufTtcblxuZXhwb3J0IHR5cGUgQ29uZmlnT3B0aW9ucyA9IE9taXQ8QnJvd3Nlck9wdGlvbnMsICdicm93c2VyTmFtZSc+O1xuXG5leHBvcnQgY29uc3QgYmFzZUNvbmZpZyA9IChvcHRpb25zOiBDb25maWdPcHRpb25zID0ge30pOiBWaXRlQ29uZmlnID0+IHtcbiAgc3dpdGNoIChlbnZpcm9ubWVudCkge1xuICAgIGNhc2UgJ2Nocm9taXVtJzpcbiAgICAgIHJldHVybiBjcmVhdGVCcm93c2VyQ29uZmlnKHsgYnJvd3Nlck5hbWU6IGVudmlyb25tZW50LCAuLi5vcHRpb25zIH0pO1xuICAgIGNhc2UgJ25vZGUnOlxuICAgIGRlZmF1bHQ6XG4gICAgICBpZiAoZW52aXJvbm1lbnQubGVuZ3RoID4gMCAmJiBlbnZpcm9ubWVudCAhPT0gJ25vZGUnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVW5yZWNvZ25pemVkIFZJVEVTVF9FTlYgdmFsdWUsIGZhbGxpbmcgYmFjayB0byAnbm9kZSc6IFwiICsgZW52aXJvbm1lbnQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNyZWF0ZU5vZGVDb25maWcob3B0aW9ucy5jd2QpO1xuICB9XG59O1xuXG4vKipcbiAqIFJlcGxhY2VzIG5vZGUgYnVpbHQtaW4gbW9kdWxlcyB3aXRoIHRoZWlyIGJyb3dzZXIgZXF1aXZhbGVudHMuXG4gKi9cbi8vIFRPRE8oZG1hcmV0c2t5aSk6IEV4dHJhY3QuXG5mdW5jdGlvbiBub2RlU3RkUGx1Z2luKCk6IFBsdWdpbiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ25vZGUtc3RkJyxcbiAgICByZXNvbHZlSWQ6IHtcbiAgICAgIG9yZGVyOiAncHJlJyxcbiAgICAgIGFzeW5jIGhhbmRsZXIoc291cmNlLCBpbXBvcnRlciwgb3B0aW9ucykge1xuICAgICAgICBpZiAoc291cmNlLnN0YXJ0c1dpdGgoJ25vZGU6JykpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCdAZHhvcy9ub2RlLXN0ZC8nICsgc291cmNlLnNsaWNlKCdub2RlOicubGVuZ3RoKSwgaW1wb3J0ZXIsIG9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKE1PRFVMRVMuaW5jbHVkZXMoc291cmNlKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlc29sdmUoJ0BkeG9zL25vZGUtc3RkLycgKyBzb3VyY2UsIGltcG9ydGVyLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZG1hcmV0c2t5aS9Db2RlL2R4b3MvZHhvcy9wYWNrYWdlcy9hcHBzL2NvbXBvc2VyLWFwcC9zcmNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9kbWFyZXRza3lpL0NvZGUvZHhvcy9keG9zL3BhY2thZ2VzL2FwcHMvY29tcG9zZXItYXBwL3NyYy9jb25zdGFudHMudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2RtYXJldHNreWkvQ29kZS9keG9zL2R4b3MvcGFja2FnZXMvYXBwcy9jb21wb3Nlci1hcHAvc3JjL2NvbnN0YW50cy50c1wiOy8vXG4vLyBDb3B5cmlnaHQgMjAyMyBEWE9TLm9yZ1xuLy9cblxuZXhwb3J0IGNvbnN0IEFQUF9LRVkgPSAnY29tcG9zZXIuZHhvcy5vcmcnO1xuXG5leHBvcnQgY29uc3QgSU5JVElBTF9ET0NfVElUTEUgPSAnUkVBRE1FJztcblxuLy8gVE9ETyh3aXR0am9zaWFoKTogVHJhbnNsYXRlLlxuLy8gVE9ETyhidXJkb24pOiBJbXBvcnQgTUQgZmlsZS5cbmV4cG9ydCBjb25zdCBJTklUSUFMX0NPTlRFTlQgPSBbXG4gIC8vIFNlY3Rpb24gMVxuICBgIVtpbWddKGh0dHBzOi8vZHhvcy5uZXR3b3JrL2R4b3MtbG9nb3R5cGUtYmx1ZS5wbmcpXG4jIFdlbGNvbWUgdG8gQ29tcG9zZXIgYnkgRFhPU1xuXG4jIyBXaGF0IGlzIENvbXBvc2VyP1xuXG5Db21wb3NlciBpcyBhbiBleHRlbnNpYmxlIGFwcGxpY2F0aW9uIHRoYXQgaW5jbHVkZXMgZmFtaWxpYXIgY29tcG9uZW50cyBzdWNoIGFzIGRvY3VtZW50cywgZGlhZ3JhbXMsIGFuZCB0YWJsZXMuIEl0IGxldmVyYWdlcyBEWE9TIFx1MjAxNCBhIGZ1bGwgc3RhY2sgZnJhbWV3b3JrIGZvciBidWlsZGluZyBjb2xsYWJvcmF0aXZlIGxvY2FsLWZpcnN0IGFwcGxpY2F0aW9ucy5cblxuV2l0aCBvdXIgdXBjb21pbmcgU0RLLCB5b3UnbGwgYmUgYWJsZSB0byBidWlsZCBjdXN0b20gcGx1Z2lucywgbGV2ZXJhZ2UgZXh0ZXJuYWwgQVBJcyBhbmQgaW50ZWdyYXRlIHdpdGggTExNcy4gQWxsIGluc2lkZSBvZiBhIHByaXZhdGUgY29sbGFib3JhdGl2ZSB3b3Jrc3BhY2UuXG5cbiMjIERpc2NsYWltZXJcblxuQ29tcG9zZXIgaXMgY3VycmVudGx5IGluIEJldGEuIFdlIGFyZSBvZmZlcmluZyBhbiBlYXJseSBwcmV2aWV3IG9mIGl0cyBjb2xsYWJvcmF0aXZlIGFuZCBwcm9ncmFtbWFibGUgZmVhdHVyZXMsIGFuZCB3ZSB3b3VsZCBncmVhdGx5IGFwcHJlY2lhdGUgeW91ciBmZWVkYmFjayB0byBoZWxwIGltcHJvdmUgaXQgYmVmb3JlIHRoZSBvZmZpY2lhbCBsYXVuY2guXG5cblBsZWFzZSBqb2luIG91ciBbRGlzY29yZF0oaHR0cHM6Ly9keG9zLm9yZy9kaXNjb3JkKSB0byBzaGFyZSBmZWF0dXJlIHJlcXVlc3RzLCBidWcgcmVwb3J0cywgYW5kIGdlbmVyYWwgcXVlc3Rpb25zIGFib3V0IHlvdXIgZXhwZXJpZW5jZS5gLFxuICAvLyBTZWN0aW9uIDJcbiAgYCMjIFdvcmtpbmcgaW4gQ29tcG9zZXJcblxuQ29tcG9zZXIgaXMgbWFkZSB1cCBmcm9tIHBsdWdpbnMgZGV2ZWxvcGVkIGJ5IERYT1MgYW5kIHRoZSBjb21tdW5pdHkuIFBsdWdpbnMgdHlwaWNhbGx5IG1hbmFnZSBkYXRhIG9iamVjdHMgdGhhdCByZXByZXNlbnQgZGlmZmVyZW50IHR5cGVzIG9mIGNvbnRlbnQuXG5cblBsdWdpbnMgY2FuIGJlIGluc3RhbGxlZCBhbmQgY29uZmlndXJlZCBmcm9tIHRoZSBTZXR0aW5ncyBkaWFsb2cuIEJ5IGRlZmF1bHQgQ29tcG9zZXIgaW5zdGFsbHMgdGhlIGZvbGxvd2luZyBwbHVnaW5zOlxuXG4tICoqRG9jdW1lbnQqKiAtIENvbGxhYm9yYXRpdmUgTWFya2Rvd24gZG9jdW1lbnRzLCB3aXRoIHJlYWx0aW1lIGNvbW1lbnRzLlxuLSAqKlNrZXRjaGVzKiogLSBVc2UgYW4gaW5maW5pdGUgY2FudmFzIHRvIGNyZWF0ZSBkeW5hbWljIGRpYWdyYW1zIG9yIHNpbXBsZSBkcmF3aW5ncy5cbi0gKipUYWJsZXMqKiAtIFN0cnVjdHVyZWQgcmVjb3JkcyB3aXRoIHNvcnRpbmcgYW5kIGZpbHRlcmluZy5cbi0gKipTaGVldHMqKiAtIE51bWVyaWMgZGF0YSB3aXRoIGZvcm11bGFzIGFuZCBjaGFydHMuXG5cbk9iamVjdHMgY2FuIGJlIG9yZ2FuaXplZCBpbnNpZGUgb2YgKipDb2xsZWN0aW9ucyoqIGFuZCAqKlNwYWNlcyoqIHRvIGNyZWF0ZSBkeW5hbWljIGRvY3VtZW50cy5cblxuIyMjIFNwYWNlc1xuXG5UaGluayBvZiBTcGFjZXMgYXMgY29sbGFib3JhdGl2ZSB3b3Jrc3BhY2VzIGluc2lkZSBvZiBDb21wb3NlciB0aGF0IGNhbiBiZSB1c2VkIHRvIHBhcnRpdGlvbiBjb250ZW50IGFzIHdlbGwgYXMgcmVzdHJpY3QgYWNjZXNzIHRvIHlvdXIgdmFyaW91cyBPYmplY3RzIGFuZCBDb2xsZWN0aW9ucy5cblxuWW91ciBTcGFjZXMgYXJlIGxpc3RlZCBpbiB0aGUgbGVmdCBzaWRlYmFyIG9mIHlvdXIgQ29tcG9zZXIgd2luZG93IGFuZCB5b3VyIE9iamVjdHMgYW5kIENvbGxlY3Rpb25zIGFyZSBuZXN0ZWQgaW5zaWRlIG9mIHRoZXNlIGFzIGNoaWxkcmVuIGVsZW1lbnRzLiBJZiB5b3UgbG9vayBub3csIHlvdSB3aWxsIGZpbmQgdGhpcyBSRUFETUUgY29sbGVjdGlvbiBuZXN0ZWQgaW5zaWRlIG9mIHlvdXIgZmlyc3QgU3BhY2Ugd2hpY2ggd2FzIGNyZWF0ZWQgZm9yIHlvdSBieSBkZWZhdWx0IHdoZW4geW91IGVudGVyZWQgQ29tcG9zZXIuXG5cbiMjIyBDb2xsZWN0aW9uc1xuXG5Db2xsZWN0aW9ucyBhcmUgYSBoaWdoIGxldmVsIHN0cnVjdHVyZSBmb3Igb3JnYW5pemluZyB5b3VyIGRvY3VtZW50cyBpbnNpZGUgb2YgQ29tcG9zZXIuIENvbGxlY3Rpb25zIGNhbiBjb250YWluIG11bHRpcGxlIFwib2JqZWN0c1wiIHdoaWNoIGluY2x1ZGUgdGhpbmdzIGxpa2UgZG9jdW1lbnRzLCBza2V0Y2hlcywgYW5kIG1vcmUuXG5cbiMjIyBDb2xsYWJvcmF0aW9uXG5cbkNvbXBvc2VyIGlzIGEgcmVhbHRpbWUgY29sbGFib3JhdGl2ZSBlbnZpcm9ubWVudC4gVGhpcyBtZWFucyBtdWx0aXBsZSBwZW9wbGUgY2FuIGJlIHdvcmtpbmcgaW5zaWRlIG9mIHRoZSBzYW1lIFNwYWNlLCBDb2xsZWN0aW9uIG9yIE9iamVjdCBhdCBhbnkgZ2l2ZW4gdGltZSB3aXRob3V0IG92ZXJ3cml0aW5nIGVhY2ggb3RoZXJzIGNoYW5nZXMuIFRoaXMgaXMgb25lIG9mIHRoZSBjb3JlIGJlbmVmaXRzIG9mIHRoZSBEWE9TIHBsYXRmb3JtLlxuXG5JbnZpdGUgYSBjb2xsYWJvcmF0b3IgdG8geW91ciBzaGFyZWQgU3BhY2UgYnkgc2VsZWN0aW5nIHRoZSBTcGFjZSBmcm9tIHRoZSBzaWRlYmFyIGFuZCBjbGlja2luZyB0aGUgXCJTaGFyZVwiIGJ1dHRvbiBpbiB0aGUgdG9wIG1lbnUuIEZyb20gaGVyZSB5b3UgY2FuIGNyZWF0ZSBhIHNpbmdsZSBvciBtdWx0aS11c2UgaW52aXRlLiBUaGF0IHNhbWUgc2hhcmUgYnV0dG9uIHdpbGwgYWxzbyBzaG93IHlvdSB3aG8gY3VycmVudGx5IGhhcyBhY2Nlc3MgdG8gYW55IGdpdmVuIFNwYWNlLmAsXG4gIC8vIFNlY3Rpb24gM1xuICBgIyMgT3VyIFByb21pc2UgdG8gWW91XG5cbldlIGFyZSBlYXJseSBvbiBvdXIgam91cm5leSwgYnV0IGhlcmUgYXJlIGEgZmV3IHRoaW5ncyB0aGF0IHdpbGwgYWx3YXlzIGJlIHRydWUgYWJvdXQgQ29tcG9zZXIuXG5cbioqRnJlZSB0byB1c2UqKlxuU2luY2UgQ29tcG9zZXIgZG9lcyBub3QgZGVwZW5kIG9uIGNlbnRyYWxpemVkIHNlcnZlcnMgdG8gb3BlcmF0ZSwgdGhlcmUgaXMgbm8gc2lnbmlmaWNhbnQgb3ZlcmhlYWQgZm9yIHJ1bm5pbmcgdGhlIGNvcmUgc3lzdGVtLlxuXG4qKlByaXZhdGUgYnkgZGVmYXVsdCoqXG5EYXRhIGZyb20gQ29tcG9zZXIgaXMgc3RvcmVkIGxvY2FsbHkgb24geW91ciBkZXZpY2UuIFRoaXMgbWVhbnMgbm8gb25lIGVsc2UgY2FuIHNlZSBpdCB1bmxlc3MgeW91IGludml0ZSB0aGVtIHRvIGEgc2hhcmVkIHNwYWNlLlxuXG4qKkNvbGxhYm9yYXRpdmUqKlxuVGhlIERYT1MgZnJhbWV3b3JrIGlzIGJ1aWx0IGZyb20gdGhlIGdyb3VuZCB1cCB0byBiZSBjb2xsYWJvcmF0aXZlLiBUaGlzIG1lYW5zIHJlYWwtdGltZSBtdWx0aXBsYXllciBmdW5jdGlvbmFsaXR5IGlzIGJha2VkIGluIGFzIGEgY29yZSBwcmltaXRpdmUuXG5cbioqRXh0ZW5zaWJsZSoqXG5OZWVkIGEgZmVhdHVyZSB0aGF0IHdlIGRvIG5vdCBvZmZlciBpbnNpZGUgb2YgQ29tcG9zZXI/IEJ1aWxkIGEgcGx1Z2luIGZvciB5b3Vyc2VsZiBvciBzaGFyZSBpdCB3aXRoIHRoZSBjb21tdW5pdHkgc28gdGhhdCBvdGhlcnMgY2FuIGJlbmVmaXQgZnJvbSB5b3VyIGNyZWF0aXZpdHkuXG5cbioqT3BlbiBTb3VyY2UqKlxuQm90aCBEWE9TIGFuZCBDb21wb3NlciBhcmUgb3BlbiBzb3VyY2UgcHJvamVjdHMgYW5kIHRoZSBzb3VyY2UgY29kZSBpcyBhdmFpbGFibGUgb24gW0dpdGh1Yl0oaHR0cHM6Ly9naXRodWIuY29tL2R4b3MvZHhvcykuXG5cbiMjIE90aGVyIHRoaW5ncyB0byBjb25zaWRlclxuXG4qKldhcm5pbmchIC0gTm8gZm9ybWFsIGJhY2t1cHM6KipcbklmIHlvdSBsb3NlIHlvdXIgZGV2aWNlLCB5b3Ugd2lsbCBsb3NlIGFjY2VzcyB0byB5b3VyIHdvcmsgaW5zaWRlIG9mIENvbXBvc2VyLiBUbyBlbnN1cmUgeW91IGRvIG5vdCBsb3NlIHlvdXIgd29yaywgeW91IG1heSB3YW50IHRvIGNvbm5lY3QgYSBzZWNvbmRhcnkgZGV2aWNlIHRvIHlvdXIgd29ya3NwYWNlIHRvIHNlcnZlIGFzIGEgYmFja3VwLlxuXG4qKk5vIGxvZ2luIG5lZWRlZDoqKlxuWW91IG1heSBoYXZlIG5vdGljZWQgdGhhdCB5b3UgZG8gbm90IG5lZWQgdG8gbG9nIGluIHRvIHVzZSBDb21wb3NlciBsaWtlIHlvdSBtaWdodCB3aXRoIHRyYWRpdGlvbmFsIHNvZnR3YXJlLiBUaGlzIGlzIGJlY2F1c2UgeW91ciBpZGVudGl0eSBpcyB0aWVkIHRvIHlvdXIgc3BlY2lmaWMgZGV2aWNlIGFzIHdlbGwgYXMgeW91ciBicm93c2VyLiBJZiB5b3Ugd291bGQgbGlrZSB0byBsb2cgaW4gZnJvbSBvdGhlciBkZXZpY2VzIG9yIG90aGVyIGJyb3dzZXJzIHlvdSB3aWxsIGZpcnN0IG5lZWQgdG8gY2xpY2sgb24gdGhlIEhBTE8gYnV0dG9uIChsb3dlciBsZWZ0IGNvcm5lciBvZiBDb21wb3NlciB3aW5kb3cpIGFuZCBhZGQgYSBkZXZpY2UgZnJvbSB0aGVyZS4gQ2hlY2sgb3VyIGRvY3VtZW50YXRpb24gdG8gbGVhcm4gbW9yZSBhYm91dCB0aGUgSEFMTyBpZGVudGl0eSBzeXN0ZW1zIGFuZCBob3cgd2UgbWFuYWdlIGF1dGhlbnRpY2F0aW9uLlxuXG4jIyBOZWVkIGhlbHA/XG5cbkxlYXJuIG1vcmUgYWJvdXQgRFhPUyBhbmQgQ29tcG9zZXIgYmUgZXhwbG9yaW5nIG91ciBbZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLmR4b3Mub3JnKS5cblxuSm9pbiBvdXIgW0Rpc2NvcmRdKGh0dHBzOi8vZHhvcy5vcmcvZGlzY29yZCkgdG8gc2hhcmUgZmVhdHVyZSByZXF1ZXN0cywgYnVnIHJlcG9ydHMsIGFuZCBnZW5lcmFsIHF1ZXN0aW9ucyBhYm91dCBvdXIgcGxhdGZvcm0uYCxcbl07XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBSUEsU0FBUyx3QkFBd0I7QUFDakMsT0FBTyxpQkFBaUI7QUFDeEIsU0FBUyxZQUFZLFdBQVcscUJBQXFCO0FBQ3JELFNBQVMsUUFBQUEsT0FBTSxlQUFlO0FBQzlCLE9BQU8sc0JBQXNCO0FBQzdCLFNBQVMsa0JBQWtCO0FBQzNCLFNBQVMsZ0JBQUFDLGVBQWMsOEJBQTJDO0FBQ2xFLE9BQU9DLGNBQWE7QUFDcEIsU0FBUyxlQUFlO0FBQ3hCLE9BQU9DLGlCQUFnQjtBQUN2QixPQUFPLG1CQUFtQjtBQUUxQixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLG1CQUFtQjtBQUM1QixTQUFTLG1CQUFtQjtBQUM1QixTQUFTLG1CQUFtQjs7O0FDZjVCLFNBQVMsTUFBTSxnQkFBZ0I7QUFDL0IsT0FBTyxXQUFXO0FBRWxCLFNBQVMsb0JBQXFEO0FBQzlELE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sYUFBYTtBQUVwQixTQUFTLHFCQUFxQiwwQkFBMEI7QUFDeEQsU0FBa0IsZUFBZTtBQVpqQyxJQUFNLG1DQUFtQztBQWN6QyxJQUFNLGdCQUFnQixPQUFPLFFBQVEsSUFBSSxzQkFBc0I7QUFDL0QsSUFBTSxVQUFVLENBQUMsQ0FBQyxRQUFRLElBQUk7QUFDOUIsSUFBTSxlQUFlLFFBQVEsSUFBSSxjQUFjLFFBQVEsWUFBWTtBQUNuRSxJQUFNLHdCQUF3QixRQUFRLFFBQVEsSUFBSSxpQkFBaUI7QUFFbkUsSUFBTSxtQkFBbUIsQ0FBQyxRQUN4QixhQUFhO0FBQUEsRUFDWCxTQUFTO0FBQUEsSUFDUCxRQUFRO0FBQUEsRUFD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Q0FBQyxHQUFHLElBQUksS0FBSyxZQUFZLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFBQSxNQUNwRztBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixTQUFTO0FBQUEsTUFDVCxtQkFBbUIsTUFBYztBQUMvQixjQUFNLE9BQU8sQ0FBQztBQUFBLFVBQ1osS0FBSztBQUFBLFVBQ0wsT0FBTztBQUFBLFlBQ0wsTUFBTTtBQUFBLFVBQ1I7QUFBQSxVQUNBLFVBQVUsS0FBSyxVQUFVLEVBQUUsUUFBUSxHQUFHLE1BQU0sQ0FBQztBQUFBLFFBQy9DLENBQUM7QUFFRCxlQUFPO0FBQUEsVUFDTDtBQUFBLFVBQ0E7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7IiwKICAibmFtZXMiOiBbImpvaW4iLCAiZGVmaW5lQ29uZmlnIiwgIkluc3BlY3QiLCAiV2FzbVBsdWdpbiIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSIsICJqb2luIiwgImRlZmluZUNvbmZpZyIsICJXYXNtUGx1Z2luIiwgIkluc3BlY3QiXQp9Cg==
