//
// Copyright 2026 DXOS.org
//

/**
 * Types `import descriptor from '@dxos/plugin-x/dxplugin.jsonc'`, the module the descriptor loader
 * materializes. Not part of the package's `exports`: a types-only subpath breaks `composer-app`'s
 * bundle, whose import map resolves every export under runtime conditions. Consumers reach it by
 * naming this file in their tsconfig `types`, which loads it into their own program — the only place
 * tsc honours an ambient declaration.
 *
 * The specifier must be non-relative: TypeScript applies a wildcard module declaration to nothing
 * else, so a plugin imports its own descriptor as `@dxos/plugin-x/dxplugin.jsonc`.
 *
 * `make` and `meta` are synthesized by the loader beside the data, so a consumer imports a descriptor
 * exactly as it used to import a plugin's TypeScript entrypoint. A host that reads the raw file gets
 * only the default export and calls `Plugin.fromManifest` itself.
 */
declare module '*/dxplugin.jsonc' {
  const descriptor: import('@dxos/protocols').Config2.Descriptor;

  export const meta: import('@dxos/app-framework/Plugin').Meta;

  export const make: import('@dxos/app-framework/Plugin').PluginFactory<void>;

  export default descriptor;
}
