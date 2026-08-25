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
 * NOT yet wired up to consumers. Two things are settled by experiment: TypeScript applies a wildcard
 * `declare module` only to NON-relative specifiers (so a plugin must import its own descriptor as
 * `@dxos/plugin-x/dxplugin.jsonc`), and naming this file in a consumer's tsconfig `types` does not
 * load it. It is also deliberately NOT an `exports` subpath — a types-only subpath breaks any
 * consumer that enumerates and resolves every export, as composer-app's import map does. Picking a
 * distribution route that satisfies all three is Phase 2; see the project DESIGN.md.
 */
declare module '*/dxplugin.jsonc' {
  const descriptor: Config2.Descriptor;
  export default descriptor;
}
