//
// Copyright 2026 DXOS.org
//

/**
 * Types `import descriptor from '@dxos/plugin-x/dxplugin.jsonc'`, the module the descriptor loader
 * materializes. Declared here rather than in app-framework because tsc loads an ambient declaration
 * only from a file in the consumer's own program, and every package already lists `@dxos/typings`
 * in its tsconfig `types`.
 *
 * The specifier must be non-relative: TypeScript applies a wildcard module declaration to nothing else.
 */
declare module '*/dxplugin.jsonc' {
  const descriptor: import('@dxos/protocols').Config2.Descriptor;
  export default descriptor;
}
