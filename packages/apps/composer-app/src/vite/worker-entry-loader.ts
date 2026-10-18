//
// Copyright 2026 DXOS.org
//

import { type Plugin, type Rollup } from 'vite';

const LOADER_PREFIX = '\0dxos-worker-entry-loader:';

/**
 * Loader body for the entry module at `target`.
 *
 * A worker's first `connect` (SharedWorker) and the parent's first messages are dispatched as soon as the
 * loader has run, before the real module can listen, so they are held and replayed in order once it has
 * loaded; holding stops propagation so a listener the module adds before it finishes loading does not see
 * them twice. A rejected `import()` is rethrown from a task, since only an uncaught error reaches the
 * spawning tab's `Worker.onerror` as a failed script would.
 */
const loaderSource = (target: string): string => `
const types = ['connect', 'message', 'messageerror'];
const held = [];
const hold = (event) => {
  event.stopImmediatePropagation();
  held.push(event);
};
types.forEach((type) => addEventListener(type, hold));
import(${JSON.stringify(target)}).then(
  () => {
    types.forEach((type) => removeEventListener(type, hold));
    held.forEach(({ type, data, origin, lastEventId, source, ports }) => {
      dispatchEvent(new MessageEvent(type, { data, origin, lastEventId, source, ports: [...ports] }));
    });
  },
  (error) => {
    setTimeout(() => {
      throw error;
    });
  },
);
`;

/**
 * Start a worker bundle from a loader chunk that `import()`s the worker's real entry module.
 *
 * Rolldown hoists modules a worker shares with its lazy chunks into the entry chunk, and WebKit evaluates
 * a module worker's top-level script again when a chunk imports it (https://bugs.webkit.org/show_bug.cgi?id=324459);
 * for the data worker that second copy runs `runDedicatedWorker` again and displaces the first (DX-1330).
 * A module loaded by `import()` is shared as usual, and the loader itself exports nothing, so nothing
 * imports it; `generateBundle` fails the build if something does, or if no input was wrapped.
 *
 * For `worker.plugins` only: an HTML or `?module-url` entry must keep its own exports and URL.
 */
export const workerEntryLoader = (): Plugin => {
  let inputs = new Set<string>();
  const targets = new Map<string, Rollup.ResolvedId>();

  return {
    name: 'dxos-worker-entry-loader',
    apply: 'build',
    buildStart: (options) => {
      inputs = new Set(Array.isArray(options.input) ? options.input : Object.values(options.input));
      targets.clear();
    },
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        if (importer?.startsWith(LOADER_PREFIX)) {
          return targets.get(importer) ?? null;
        }
        // Emitted chunks (`?module-url`) also resolve as entries, so only the bundle's own inputs are wrapped.
        if (!options.isEntry || importer || !inputs.has(source)) {
          return null;
        }
        const resolved = await this.resolve(source, importer, { isEntry: true, skipSelf: true });
        if (!resolved || resolved.external) {
          return resolved;
        }
        const loaderId = `${LOADER_PREFIX}${resolved.id}`;
        targets.set(loaderId, resolved);
        return loaderId;
      },
    },
    load: (id) => {
      const target = targets.get(id);
      return target ? loaderSource(target.id) : null;
    },
    generateBundle(_options, bundle) {
      if (targets.size === 0) {
        this.error(`worker entry loader matched none of the inputs: ${[...inputs].join(', ')}`);
      }
      const chunks = Object.values(bundle).filter((output): output is Rollup.OutputChunk => output.type === 'chunk');
      for (const [loaderId, target] of targets) {
        const loader = chunks.find((chunk) => chunk.facadeModuleId === loaderId);
        if (!loader) {
          this.error(`no loader chunk was emitted for worker entry ${target.id}`);
        }
        const importers = chunks
          .filter((chunk) => chunk.imports.includes(loader.fileName) || chunk.dynamicImports.includes(loader.fileName))
          .map((chunk) => chunk.fileName);
        if (importers.length > 0) {
          this.error(
            `chunks import the worker entry ${loader.fileName}, which WebKit would evaluate again: ${importers.join(', ')}`,
          );
        }
      }
    },
  };
};
