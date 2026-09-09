//
// Copyright 2026 DXOS.org
//

import { type PluginOption } from 'vite';

/**
 * Named exports to synthesize per node builtin, for builtins the client graph references but
 * never executes. Enumerated rather than proxied so that a newly reached node-only import still
 * fails the build here, instead of silently resolving to `undefined` at runtime.
 */
export type NodeBuiltinStubs = Record<string, readonly string[]>;

const VIRTUAL_PREFIX = '\0dxos-node-builtin-stub:';

/**
 * Give node builtins reached from unexecuted code a module with real named exports.
 *
 * Vite resolves a node builtin in the client graph to `__vite-browser-external`, which exports
 * only a `default` Proxy. The transform-per-module dev server never notices the mismatch — a named
 * import is not checked until the importing module runs — but Rolldown links the whole graph up
 * front and fails it with `MISSING_EXPORT`. Each stubbed name throws on access, matching what the
 * Proxy does at runtime; the point is only that the binding exists so linking succeeds.
 */
export const nodeBuiltinStubs = (stubs: NodeBuiltinStubs): PluginOption => ({
  name: 'dxos-node-builtin-stubs',
  enforce: 'pre',
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
    const thrower = (exportName: string) =>
      `export const ${exportName} = () => { throw new Error('node:${name}.${exportName} is not available in the browser'); };`;
    return [...stubs[name].map(thrower), 'export default {};'].join('\n');
  },
});
