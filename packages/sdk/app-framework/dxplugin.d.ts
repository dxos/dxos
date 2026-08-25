//
// Copyright 2026 DXOS.org
//

import type { Config2 } from '@dxos/protocols';

/**
 * Types `import descriptor from './dxplugin.jsonc'` — a plugin's serialized entrypoint — for every
 * package that imports one. The module is materialized by the `dxPluginManifest()` vite plugin,
 * which serves the descriptor as a JS module with the parsed object as its default export; tsc only
 * needs to know its shape.
 *
 * Declared here rather than per plugin package so a plugin depending on `@dxos/app-framework` — as
 * every plugin does — gets it for free.
 */
declare module '*/dxplugin.jsonc' {
  const descriptor: Config2.Descriptor;
  export default descriptor;
}
