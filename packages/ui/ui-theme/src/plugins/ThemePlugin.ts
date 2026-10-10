//
// Copyright 2022 DXOS.org
//

/* eslint-disable no-console */

import tailwindcssPostcss from '@tailwindcss/postcss';
import tailwindcssVite from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';
import { type HtmlTagDescriptor, type Plugin, type UserConfig } from 'vite';

/**
 * CSS cascade layer order.
 * Must be established before any stylesheets load so that Tailwind's own @layer declarations don't override our ordering. Exported so consuming
 */
export const LAYER_ORDER = [
  'properties',
  'theme',
  'dx-tokens',
  'user-tokens',
  'base',
  'tw-base',
  'dx-base',
  'components',
  'tw-components',
  'dx-components',
  'utilities',
] as const;

// Package root relative to this module's built location, `dist/plugin/ThemePlugin.{mjs,cjs}`.
// Tied to the output depth: the two-pass vite build in `vite.plugin.config.ts` emits flat into
// `dist/plugin`, where the retired pipeline nested a platform slug and a mirrored source tree.
const ROOT = '../../';

/**
 * Disable `@tailwindcss/vite`'s `hotUpdate` hook under Vite's full-bundle dev mode.
 *
 * `vite dev --experimentalBundle` routes `hotUpdate` through Rolldown's plugin bridge, whose
 * options object carries no `server` and whose context carries no `environment` — so the hook
 * throws on its first dereference and takes the whole rebuild with it (`TypeError: Cannot read
 * properties of undefined (reading 'environments')`, then `(reading 'name')` once `server` is
 * supplied). Its job is to invalidate the generated CSS in Vite's module graph when a scanned
 * source file changes, and that graph is not what serves CSS under bundled dev, so there is
 * nothing to salvage by filling the gaps in: skipping it keeps HMR working for everything else,
 * at the cost of needing a server restart before a NEWLY USED utility class is generated.
 */
const skipHotUpdateInBundledDev = (plugin: Plugin): Plugin => {
  const hotUpdate = plugin.hotUpdate;
  const handler = typeof hotUpdate === 'function' ? hotUpdate : hotUpdate?.handler;
  if (!handler) {
    return plugin;
  }

  // Chained rather than assigned: only `@tailwindcss/vite:generate:serve` declares `hotUpdate` and
  // it declares no `configResolved` today, but this package publishes against a caret range where
  // a later minor could add one, and a clobbered hook would fail silently.
  const configResolved = plugin.configResolved;
  const inheritedConfigResolved = typeof configResolved === 'function' ? configResolved : configResolved?.handler;

  let bundledDev = false;
  return {
    ...plugin,
    configResolved(config) {
      bundledDev = config.experimental.bundledDev === true;
      return inheritedConfigResolved?.call(this, config);
    },
    hotUpdate: {
      ...(typeof hotUpdate === 'object' ? hotUpdate : {}),
      handler(context) {
        if (bundledDev) {
          return;
        }
        return handler.call(this, context);
      },
    },
  };
};

export type ThemePluginOptions = {
  srcCssPath?: string;
  /** Extra Tailwind scan globs (absolute, or relative to the Vite root) for a consumer of the published package. */
  content?: string[];
  virtualFileId?: string;
  verbose?: boolean;
};

const toCssString = (path: string): string => JSON.stringify(path.split(sep).join('/'));

/**
 * Writes the theme entry for a consumer of the published package and returns its path.
 * `workspace.css` cannot serve them: its scan paths are relative to this package, which from inside
 * `node_modules` reaches every installed package, and Tailwind walks all of it before answering.
 */
const writeConsumerTheme = ({
  packageRoot,
  root,
  outPath,
  content,
}: {
  packageRoot: string;
  root: string;
  outPath: string;
  content: string[];
}): string => {
  // The scope this package was installed into, and the consumer's own, which differ under pnpm's isolated layout.
  const scopeDirs = new Set([dirname(packageRoot), resolve(root, 'node_modules/@dxos')]);
  const sources = [
    // Tailwind skips `node_modules` below an explicit base, so this covers only the consumer's own files.
    join(root, '**/*.{ts,tsx,js,jsx,html}'),
    ...[...scopeDirs].map((scopeDir) => join(scopeDir, '*/dist/lib/**/*.mjs')),
    ...content.map((glob) => resolve(root, glob)),
  ];
  const css = [
    `@import ${toCssString(join(packageRoot, 'src/main.css'))};`,
    ...sources.map((source) => `@source ${toCssString(source)};`),
    '',
  ].join('\n');

  // Rewriting identical content would bump the mtime, which Tailwind reads as a reason to rebuild.
  if (!existsSync(outPath) || readFileSync(outPath, 'utf-8') !== css) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, css);
  }

  return outPath;
};

/**
 * Vite plugin to configure theme.
 * Returns the official Tailwind Vite plugin (persistent incremental scanner) alongside the theme plugin.
 */
export const ThemePlugin = (options: ThemePluginOptions): Plugin[] => {
  // `src` is published too, so only the location tells a workspace checkout from an installed copy.
  const packageRoot = realpathSync(resolve(import.meta.dirname, ROOT));
  const isMonorepo = !packageRoot.split(sep).includes('node_modules');

  // Static assets shipped via "files": ["src"] in package.json.
  // Both monorepo and installed package resolve to the same src/plugins/ directory.
  const pluginsDir = resolve(import.meta.dirname, ROOT, 'src/plugins');
  const darkModeScriptPath = resolve(pluginsDir, 'dark-mode.ts');
  const mainCssPath = resolve(pluginsDir, 'main.css');

  const config = {
    // Installed copies get theirs from `configResolved`, which knows the consumer's root.
    srcCssPath: options.srcCssPath ?? (isMonorepo ? resolve(packageRoot, 'src/workspace.css') : ''),
    virtualFileId: options.virtualFileId ?? '@dxos-theme',
    verbose: options.verbose,
  };

  // Set under `vite dev --experimentalBundle`; see the guard in `hotUpdate`.
  let bundledDev = false;

  // Trailing-edge debounce handle for theme CSS reloads (see `hotUpdate`).
  let themeReloadTimer: ReturnType<typeof setTimeout> | undefined;

  // Under Vitest there is no HMR, and a live watcher leaks per-file `fs_event` handles: Tailwind's
  // `@source` scan registers every scanned source file as a Vite watch dependency, and those handles
  // are never released on close, hanging single-pass `vitest run` teardown. A non-null `server.watch`
  // here also overrides the `watch: null` set by the test configs, so gate it: disable the watcher
  // entirely under Vitest (`VITEST` is exported to the whole process tree), keep the HMR-ignore
  // patterns for interactive `storybook dev` / `vite dev` (where `VITEST` is unset).
  const isVitest = process.env.VITEST === 'true';

  const themePlugin: Plugin = {
    name: 'vite-plugin-dxos-ui-theme',
    configResolved: (resolved) => {
      bundledDev = resolved.experimental.bundledDev === true;
      if (!config.srcCssPath) {
        config.srcCssPath = writeConsumerTheme({
          packageRoot,
          root: resolved.root,
          outPath: resolve(resolved.cacheDir, '..', '.dxos-ui-theme.css'),
          content: options.content ?? [],
        });
      }

      if (process.env.DEBUG || options.verbose) {
        console.log('ThemePlugin:\n', JSON.stringify(config, null, 2));
      }
    },
    config: (): UserConfig => {
      return {
        server: {
          watch: isVitest
            ? null
            : {
                // Stop build outputs from driving HMR — they are the root of the
                // `main.css` HMR storm.
                //
                // Tailwind's `@source` scanning (see `src/main.css`) registers its
                // scanned source files as Vite watch dependencies of the compiled
                // theme CSS. Tailwind's own scanner respects `.gitignore` (and the
                // `@source not` directives), so it never *scans* `dist/`. BUT the
                // scanner hands Vite a coarse `dir-dependency` glob — e.g.
                // `{**/*.html,**/*.ts,**/*.tsx}` — and Vite re-expands that glob
                // itself, ignoring only `node_modules` (not `.gitignore`, not the
                // `@source not` negations). The re-expansion therefore sweeps in
                // every `packages/*/dist/**/*.d.ts` (`.d.ts` matches `**/*.ts`),
                // making each emitted declaration file a watch-dependency of
                // `main.css`. A single package rebuild emits dozens of `.d.ts` in a
                // tight burst, and each write re-invalidates the theme — 40+ HMR
                // pings for `main.css` in one second, repeating on every rebuild.
                //
                // Ignoring build outputs in the watcher is also semantically
                // correct: in dev the workspace resolves `@dxos/*` via the `source`
                // export condition (see `vite-plugin-import-source`), so `dist/`
                // is never consumed at runtime and its churn should never trigger
                // HMR. Vite concatenates these patterns with its built-in ignores
                // (`**/node_modules/**`, `**/.git/**`, …), so this is purely
                // additive.
                //
                // `<root>/.claude/**` covers agent worktrees checked out under the
                // repo root (`.claude/worktrees/<name>/packages/**`): they are full
                // source copies, so the glob re-expansion above sweeps them in and
                // every agent-side edit burst or checkout invalidates the theme in
                // the user's dev server. The pattern is anchored at the resolved
                // repo root (not `**/.claude/**`) because chokidar matches against
                // absolute paths — a bare pattern would match *everything* when the
                // dev server itself runs from inside a worktree whose path contains
                // a `.claude` segment. `*.log` covers runtime log sinks (e.g.
                // vite-plugin-log's `app.log` in the app root), which are appended
                // continuously at runtime and must never feed back into the
                // watcher.
                ignored: ['**/dist/**', '**/out/**', '**/*.log', `${resolve(import.meta.dirname, ROOT, '.claude')}/**`],
              },
        },
        css: {
          postcss: {
            plugins: [
              // Handles @import statements in CSS.
              postcssImport(),
              // Processes CSS nesting syntax.
              postcssNesting(),
              // Resolves @reference/@apply in `.pcss` files (e.g. lit-grid, lit-ui), which the
              // @tailwindcss/vite plugin skips — its transform filter only matches `.css`.
              // Theme `.css` files are compiled by @tailwindcss/vite first (enforce: 'pre'),
              // so this plugin's quick-bail check passes them through untouched.
              tailwindcssPostcss(),
              // Adds vendor prefixes.
              autoprefixer,
            ],
          },
        },
      };
    },
    resolveId: (id) => {
      if (id === config.virtualFileId) {
        return config.srcCssPath;
      }
    },
    hotUpdate({ type, file, modules }) {
      // Everything below is an optimization of Vite's per-module dev graph, which full-bundle dev
      // mode does not have — and Rolldown's plugin bridge passes no `environment` there, so the
      // first dereference would throw and fail the rebuild instead of updating the page.
      if (bundledDev) {
        return;
      }

      // Direct edits to CSS (the theme source or its imports) keep Vite's
      // default immediate update for instant feedback while authoring styles.
      if (this.environment.name !== 'client' || type !== 'update' || file.endsWith('.css')) {
        return;
      }

      // Every content file Tailwind scans is registered as a dependency of the
      // theme CSS — Vite models it as a file-only entry node whose importer is
      // `main.css` — so each source-file save invalidates `main.css` and
      // re-runs the monorepo-wide Tailwind scan. During an edit wave that
      // serializes one full scan per save. Drop the theme-dep entries from the
      // update (the changed module itself still hot-updates immediately) and
      // reload the theme CSS once on the trailing edge of a quiet window, so a
      // wave costs at most one scan.
      const isThemeDep = (mod: (typeof modules)[number]): boolean =>
        mod.file === config.srcCssPath ||
        (mod.id === null &&
          mod.importers.size > 0 &&
          [...mod.importers].every((importer) => importer.file === config.srcCssPath));
      if (!modules.some(isThemeDep)) {
        return;
      }

      const environment = this.environment;
      clearTimeout(themeReloadTimer);
      themeReloadTimer = setTimeout(() => {
        for (const mod of environment.moduleGraph.getModulesByFile(config.srcCssPath) ?? []) {
          environment.reloadModule(mod).catch(() => {
            // Server may be mid-restart; the next edit reschedules the reload.
          });
        }
      }, 300);

      return modules.filter((mod) => !isThemeDep(mod));
    },
    transformIndexHtml: () => {
      // Apply .dark class to <html> synchronously before any scripts run, so that
      // the critical CSS html.dark rules apply on the very first paint.
      const darkModeTag: HtmlTagDescriptor = {
        tag: 'script',
        attrs: { 'data-dxos-theme': '' },
        injectTo: 'head-prepend',
        children: readFileSync(darkModeScriptPath, 'utf-8'),
      };

      // Establish cascade layer order before any stylesheet loads.
      const layersTag: HtmlTagDescriptor = {
        tag: 'style',
        attrs: { 'data-dxos-layers': '' },
        children: `@layer ${LAYER_ORDER.join(', ')};`,
        injectTo: 'head-prepend',
      };

      // Critical styles: font sizing, overscroll, color fallbacks.
      // Loaded from critical.css to keep styles maintainable and out of index.html.
      const criticalTag: HtmlTagDescriptor = {
        tag: 'style',
        attrs: { 'data-dxos-critical': '' },
        injectTo: 'head-prepend',
        children: readFileSync(mainCssPath, 'utf-8'),
      };

      return [darkModeTag, layersTag, criticalTag];
    },
  };

  // The Tailwind Vite plugins are `enforce: 'pre'`, so they compile theme CSS (resolving
  // `@import 'tailwindcss'`, @source, @plugin, @theme) before the postcss chain runs —
  // postcss-import never sees the raw Tailwind directives. Scan roots come from the @source
  // directives in main.css (relative to that file); no project-root base is needed.
  return [...tailwindcssVite().map(skipHotUpdateInBundledDev), themePlugin];
};
