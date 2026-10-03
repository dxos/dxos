//
// Copyright 2026 DXOS.org
//

import { type PluginOption } from 'vite';

/** Resolves to itself and stays URL-shaped (no `\0`), as plugin-react's own `/@react-refresh` does. */
const PREAMBLE_ID = '/@dxos-react-refresh-preamble';

/**
 * Re-inject React Fast Refresh's preamble under Vite's full-bundle dev mode.
 *
 * `@vitejs/plugin-react` still wraps every component module with the refresh registration, whose
 * footer throws `@vitejs/plugin-react can't detect preamble` when `window.$RefreshReg$` is unset —
 * and its own `vite:react-refresh-fbm` hook does not deliver it there. The hook runs and returns
 * the tag (verified by calling it directly), but the tag never reaches the served document; a
 * probe injecting both from one `order: 'pre'` hook showed a `<meta>` arrive and an inline
 * `<script type="module">` not. Referencing the same code by `src` off a virtual module puts it in
 * front of the HTML plugin as a real script entry, so it is linked into the Rolldown graph where
 * plugin-react's own `/@react-refresh` resolver can satisfy its import. Drop this once the
 * upstream hook's preamble shows up in the document on its own.
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
