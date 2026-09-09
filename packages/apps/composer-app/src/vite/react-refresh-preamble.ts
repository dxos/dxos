//
// Copyright 2026 DXOS.org
//

import { type PluginOption } from 'vite';

/** Virtual module holding the preamble; resolves to itself, like plugin-react's `/@react-refresh`. */
const PREAMBLE_ID = '/@dxos-react-refresh-preamble';

/**
 * Re-inject React Fast Refresh's preamble under Vite's full-bundle dev mode.
 *
 * `@vitejs/plugin-react` still wraps every component module with the refresh registration, whose
 * footer throws `@vitejs/plugin-react can't detect preamble` when `window.$RefreshReg$` is unset —
 * but its own `vite:react-refresh-fbm` hook cannot deliver the preamble there: bundled dev drops
 * INLINE `<script type="module">` tags added by `transformIndexHtml` (a tag with a `src`, or a
 * non-script tag, survives). So the same code is served from a virtual module and referenced by
 * `src`, which the HTML plugin parses as a real script entry and links into the Rolldown graph —
 * where plugin-react's own `/@react-refresh` resolver can satisfy its import.
 *
 * Drop this once upstream carries inline injections through bundled dev.
 */
export const reactRefreshPreamble = (preambleCode: string): PluginOption => ({
  name: 'dxos-react-refresh-preamble',
  enforce: 'pre',
  transformIndexHtml: {
    order: 'pre',
    handler: () => [
      {
        tag: 'script',
        // Ahead of the entry script, so the hook is installed before any wrapped module body runs.
        injectTo: 'head-prepend',
        attrs: { type: 'module', src: PREAMBLE_ID },
      },
    ],
  },
  resolveId: (source) => (source === PREAMBLE_ID ? PREAMBLE_ID : null),
  // `__BASE__` is plugin-react's placeholder for the app base; this app is served from the root.
  load: (id) => (id === PREAMBLE_ID ? preambleCode.replace('__BASE__', '/') : null),
});
