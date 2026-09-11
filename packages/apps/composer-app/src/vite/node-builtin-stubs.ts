//
// Copyright 2026 DXOS.org
//

import { type PluginOption } from 'vite';

/**
 * Named exports to synthesize per node builtin. Enumerated rather than generated, so that a node-only
 * import this list does not already cover still fails the build instead of resolving to nothing.
 */
export type NodeBuiltinStubs = Record<string, readonly string[]>;

const VIRTUAL_PREFIX = '\0dxos-node-builtin-stub:';

/**
 * Give node builtins reached from unexecuted code a module with real named exports.
 *
 * Vite resolves a node builtin in the client graph to `__vite-browser-external`, which exports only
 * a `default`. The per-module dev server never notices the mismatch — a named import is not checked
 * until the importing module runs — but Rolldown links the whole graph up front and fails it with
 * `MISSING_EXPORT`. Each stub is a function that throws when called, so reaching one at runtime is
 * loud rather than silent; linking succeeding is the whole point. No `default` is emitted: a default
 * import should surface here as a build error too, so it can be answered deliberately.
 */
export const nodeBuiltinStubs = (stubs: NodeBuiltinStubs): PluginOption => ({
  name: 'dxos-node-builtin-stubs',
  enforce: 'pre',
  // Browser graphs only: a server environment resolving `node:net` wants the real builtin.
  applyToEnvironment: (environment) => environment.config.consumer === 'client',
  resolveId: {
    order: 'pre',
    handler: (source, importer) => {
      if (!importer) {
        return null;
      }
      const name = source.startsWith('node:') ? source.slice('node:'.length) : source;
      return name in stubs ? `${VIRTUAL_PREFIX}${name}` : null;
    },
  },
  load: (id) => {
    if (!id.startsWith(VIRTUAL_PREFIX)) {
      return null;
    }
    const name = id.slice(VIRTUAL_PREFIX.length);
    return stubs[name]
      .map(
        (exportName) =>
          `export const ${exportName} = () => { throw new Error('node:${name}.${exportName} is not available in the browser'); };`,
      )
      .join('\n');
  },
});
