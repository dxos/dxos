//
// Copyright 2026 DXOS.org
//

/**
 * Types `import descriptorUrl from '@dxos/plugin-x/dxplugin.jsonc'`. A descriptor stays data: the
 * import yields the URL it lives at, never a module wrapping it, so `Plugin.loadManifest` is the one
 * path a plugin is loaded by whether it was built here or fetched from a registry.
 *
 * Not part of the package's `exports`: a types-only subpath breaks `composer-app`'s bundle, whose
 * import map resolves every export under runtime conditions. Consumers reach it by naming this file
 * in their tsconfig `types`, which loads it into their own program — the only place tsc honours an
 * ambient declaration.
 *
 * The specifier must be non-relative: TypeScript applies a wildcard module declaration to nothing
 * else, so a plugin imports its own descriptor as `@dxos/plugin-x/dxplugin.jsonc`.
 */
declare module '*/dxplugin.jsonc' {
  const url: string;
  export default url;
}
