//
// Copyright 2026 DXOS.org
//

// @ts-ignore — @types/babel__core present transitively but not declared here.
import * as babel from '@babel/core';
// @ts-ignore — @babel/preset-typescript ships no .d.ts.
import babelPresetTypeScript from '@babel/preset-typescript';
// @ts-ignore — babel-preset-solid ships no .d.ts.
import babelPresetSolid from 'babel-preset-solid';
import { type Plugin as EsbuildPlugin, build } from 'esbuild';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Plugin } from 'vite';

import css from './loader-app/boot-loader.css?raw';
// The loader-app Solid sources are inlined as raw text (never parsed by
// dx-compile — app-framework is a React package, so its build can't compile
// Solid JSX). They are compiled to a self-contained browser IIFE at the
// consuming app's build time by {@link compileLoaderBundle} below.
import bridgeSrc from './loader-app/bridge.ts?raw';
import entrySrc from './loader-app/entry.tsx?raw';
import loaderSrc from './loader-app/Loader.tsx?raw';
import mountSrc from './loader-app/mount.tsx?raw';
import storeSrc from './loader-app/store.ts?raw';
import typesSrc from './loader-app/types.ts?raw';

/**
 * Options for {@link bootLoaderPlugin}.
 */
export type BootLoaderOptions = {
  /**
   * Initial status text rendered by the loader (replaced via
   * `window.__bootLoader.status(...)` once the host starts firing phase callbacks).
   */
  status?: string;

  /**
   * Inline SVG markup for an optional brand mark rendered inside the progress
   * ring. The mark renders at full opacity with whatever fills the SVG declares,
   * so pass a colour-palette logo for the strongest visual identity. SVGs that
   * use `fill="currentColor"` still inherit the loader's `prefers-color-scheme`
   * text colour. Leave empty/undefined to render only the ring.
   */
  markSvg?: string;

  /**
   * HTML entry filenames to inject the loader into. Defaults to `index.html` only
   * so auxiliary pages (`recovery.html`, `reset.html`, etc.) stay unobstructed.
   */
  include?: string[];
};

const VIRTUAL_NS = 'boot-loader-app';

// Relative-import graph of the loader-app, keyed by module name (no extension).
// `tsx` modules carry JSX (compiled via `babel-preset-solid`); `ts` modules are
// type-stripped only. `solid-js` imports introduced by the Solid transform
// resolve from `node_modules` against `resolveDir`.
const MODULES: Record<string, { contents: string; tsx: boolean }> = {
  entry: { contents: entrySrc, tsx: true },
  mount: { contents: mountSrc, tsx: true },
  Loader: { contents: loaderSrc, tsx: true },
  bridge: { contents: bridgeSrc, tsx: false },
  store: { contents: storeSrc, tsx: false },
  types: { contents: typesSrc, tsx: false },
};

// Walk up from the compiled plugin to find a `node_modules` containing
// `solid-js` (a dependency of this package). Used as esbuild's `resolveDir`.
const resolveDir = dirname(fileURLToPath(import.meta.url));

/**
 * Compile the loader-app from its inlined raw sources into a single
 * self-contained IIFE (Solid runtime bundled in) suitable for inlining into
 * `index.html`. Mirrors dx-compile's Solid pipeline: `@babel/preset-typescript`
 * strips types, then `babel-preset-solid` compiles JSX into reactive primitives.
 */
const compileLoaderBundle = async (): Promise<string> => {
  const virtualSolid = (): EsbuildPlugin => ({
    name: 'boot-loader-app-virtual',
    setup: (esbuild) => {
      esbuild.onResolve({ filter: /^\.\// }, (args) => {
        const name = args.path.replace(/^\.\//, '').replace(/\.(tsx?|jsx?)$/, '');
        return name in MODULES ? { path: name, namespace: VIRTUAL_NS } : undefined;
      });

      esbuild.onLoad({ filter: /.*/, namespace: VIRTUAL_NS }, async (args) => {
        const module = MODULES[args.path];
        const result = await babel.transformAsync(module.contents, {
          filename: `${args.path}.${module.tsx ? 'tsx' : 'ts'}`,
          babelrc: false,
          configFile: false,
          // Presets run last-to-first: TS strips first, then Solid sees plain JSX.
          presets: [
            [babelPresetSolid, { generate: 'dom', hydratable: false }],
            [babelPresetTypeScript, { allowDeclareFields: true }],
          ],
        });
        if (!result?.code) {
          throw new Error(`babel-preset-solid returned no code for ${args.path}`);
        }
        return { contents: result.code, loader: 'js', resolveDir };
      });
    },
  });

  const result = await build({
    stdin: { contents: "import './entry';", loader: 'ts', resolveDir, sourcefile: 'boot-loader-entry.ts' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    write: false,
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [virtualSolid()],
  });

  return result.outputFiles[0].text;
};

let bundlePromise: Promise<string> | undefined;
const getLoaderBundle = (): Promise<string> => (bundlePromise ??= compileLoaderBundle());

/**
 * Vite plugin that injects a Solid "boot loader" app into the host app's
 * `index.html`.
 *
 * The full-screen backdrop paints on the very first frame from an inline
 * `<style>` (before any JS bundle is fetched), so the user sees the loading
 * surface immediately on cold load instead of a blank document. A compiled,
 * self-contained Solid IIFE — inlined ahead of the app bundle — then renders
 * the determinate progress ring + status log into that backdrop and exposes the
 * host-facing driver on `window.__bootLoader`.
 *
 * The host app drives the loader (the React relay forwards `useApp`'s startup
 * progress):
 * - `window.__bootLoader.status(payload)` updates the status line per phase.
 * - `window.__bootLoader.progress(fraction)` grows the determinate ring (0–1).
 * - `window.__bootLoader.ready()` plays the dismissal outro, then self-removes.
 * - `window.__bootLoader.dismiss()` removes the loader immediately (fast path).
 *
 * Inject order (all at the start of `<body>`, except the stylesheet):
 * - `<style>` → `<head>` (parses before any bundled stylesheet).
 * - `<div id="boot-loader">` → the static backdrop the CSS styles instantly.
 * - inline `<script>` config (`window.__BOOT_LOADER_CONFIG__`) → before the bundle.
 * - inline `<script>` loader bundle → renders the Solid app into the backdrop.
 *
 * Keeping the loader a sibling of `#root` (rather than a child) means
 * `createRoot(document.getElementById('root')).render(...)` does not fight the
 * loader for ownership; the framework explicitly dismisses after the first
 * React commit for a deterministic handoff.
 *
 * Color tokens are exposed as CSS custom properties (`--boot-loader-bg-light`,
 * etc.) in `boot-loader.css`, so consumers can override them at the document
 * level without re-parameterizing this plugin.
 */
export const bootLoaderPlugin = ({ status, markSvg, include = ['index.html'] }: BootLoaderOptions = {}): Plugin => {
  return {
    name: 'app-framework:boot-loader',
    async transformIndexHtml(_html, ctx) {
      const filename = basename(ctx.filename ?? 'index.html');
      if (!include.includes(filename)) {
        return;
      }

      const bundle = await getLoaderBundle();
      // Authoritative backdrop id: injected here, passed to the bundle via
      // config (so `entry.tsx` reads it), and mirrored by the CSS selector in
      // `boot-loader.css`. The inner DOM ↔ CSS contract is guarded by the story.
      const rootId = 'boot-loader';
      return [
        {
          tag: 'style',
          injectTo: 'head',
          children: css,
        },
        {
          tag: 'div',
          injectTo: 'body-prepend',
          attrs: {
            id: rootId,
            role: 'status',
            'aria-live': 'polite',
            'aria-label': 'Initializing',
          },
          children: '',
        },
        {
          tag: 'script',
          injectTo: 'body-prepend',
          children: `window.__BOOT_LOADER_CONFIG__=${JSON.stringify({ rootId, markSvg, status })};`,
        },
        {
          tag: 'script',
          injectTo: 'body-prepend',
          children: bundle,
        },
      ];
    },
  };
};
