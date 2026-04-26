//
// Copyright 2026 DXOS.org
//

import { type Plugin } from 'vite';

import css from './boot-loader.css?raw';
import driverScript from './boot-loader.js?raw';

/**
 * Options for {@link bootLoaderPlugin}.
 */
export type BootLoaderOptions = {
  /**
   * Initial status text rendered by the loader (replaced via
   * `window.__bootLoader.status(...)` once the host starts firing phase callbacks).
   *
   * @default "Loading…"
   */
  status?: string;
};

/**
 * Vite plugin that injects a tiny native-DOM "boot loader" into the host app's
 * `index.html`.
 *
 * The loader paints on the very first frame, before any JS bundle is fetched —
 * so the user sees something immediately on cold load instead of staring at a
 * blank document while the compiled module graph is parsed. The CSS-only
 * keyframe animation runs on the browser's compositor thread, so it keeps
 * moving even while the JS main thread is fully busy.
 *
 * The host app drives the loader from `main.tsx`:
 *
 *   - `window.__bootLoader.status(text)` updates the status line per phase.
 *   - `window.__bootLoader.dismiss()` removes the loader once React has mounted.
 *
 * Inject order:
 *   - `<style>` → `<head>` (parses before any bundled stylesheet).
 *   - `<div id="boot-loader">…</div>` → start of `<body>` (sibling of `#root`).
 *   - inline `<script>` defining `window.__bootLoader` → start of `<body>`.
 *
 * Keeping the loader as a sibling of `#root` (rather than a child of it) means
 * `createRoot(document.getElementById('root')).render(...)` does not fight the
 * loader for ownership; the host explicitly calls `dismiss()` after the first
 * React commit, which gives a deterministic handoff.
 *
 * Color tokens are exposed as CSS custom properties (`--boot-loader-bg-light`,
 * `--boot-loader-bg-dark`, etc.) defined in `boot-loader.css`, so consumers can
 * override them at the document level without us re-parameterizing this plugin.
 */
// TODO(burdon): Reconcile with Placeholder.tsx.
export const bootLoaderPlugin = ({ status = 'Loading…' }: BootLoaderOptions = {}): Plugin => {
  return {
    name: 'app-framework:boot-loader',
    transformIndexHtml() {
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
            id: 'boot-loader',
            role: 'status',
            'aria-live': 'polite',
            'aria-label': 'Initializing',
          },
          children: [
            { tag: 'div', attrs: { id: 'boot-loader-bar' }, children: '' },
            { tag: 'div', attrs: { id: 'boot-loader-status' }, children: status },
          ],
        },
        {
          tag: 'script',
          injectTo: 'body-prepend',
          children: driverScript,
        },
      ];
    },
  };
};
