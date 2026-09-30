//
// Copyright 2026 DXOS.org
//

import { posix } from 'node:path';
import { type Plugin } from 'vite';

const QUERY = '?module-url';

/**
 * Files imported with `?module-url` in a build. Module scope rather than per instance: the tab's
 * build and the worker bundles it spawns each run their own instance of the plugin.
 */
const targets = new Set<string>();

/**
 * Path prefix the dev server mounts `/@fs/` under. The dev server ignores an absolute-URL base's origin,
 * and a relative base (`./`, empty) is only meaningful for build output, so both reduce to a path.
 */
const devBasePath = (base: string): string => {
  if (/^[a-z][a-z\d+.-]*:/i.test(base)) {
    return new URL(base).pathname;
  }
  return base.startsWith('/') ? base : '/';
};

/**
 * Resolves `import url from './module.ts?module-url'` to the URL of that module compiled as a
 * standalone ES module whose exports are preserved, so another realm (e.g. a worker) can `import()` it.
 *
 * Vite's built-ins cannot do this: `new URL('./x.ts', import.meta.url)` and `?url` copy the raw
 * source as an asset, and `?worker&url` bundles a worker entry with its exports tree-shaken away.
 *
 * Dev serves the source module through `/@fs/`. Build goes through Vite's worker bundler
 * (`?worker&url`) with the entry's exports kept: a self-contained bundle, never a chunk of the
 * importing build, whose shared chunks could carry DOM code into a worker or break a chunking scheme
 * that assumes it sees the whole graph. So the plugin must also be in `worker.plugins`, and
 * `worker.format` must be `'es'`.
 */
export const ModuleUrlPlugin = (): Plugin => {
  let command: 'serve' | 'build' = 'serve';
  let base = '/';

  return {
    name: 'dxos:module-url',
    configResolved: (config) => {
      command = config.command;
      base = config.base;
      if (command === 'build' && config.worker.format !== 'es') {
        throw new Error('ModuleUrlPlugin needs `worker.format: "es"`: a module URL is imported, not run as a script.');
      }
    },
    // Runs in each worker bundle's own build (see `worker.plugins`): Vite drops a worker entry's
    // exports, which are the point of a module URL.
    options: (options) =>
      typeof options.input === 'string' && targets.has(options.input)
        ? { ...options, preserveEntrySignatures: 'strict' }
        : undefined,
    async resolveId(source, importer) {
      if (!source.endsWith(QUERY)) {
        return;
      }

      const resolved = await this.resolve(source.slice(0, -QUERY.length), importer, { skipSelf: true });
      return resolved ? `${resolved.id}${QUERY}` : undefined;
    },
    load(id) {
      if (!id.endsWith(QUERY)) {
        return;
      }

      const file = id.slice(0, -QUERY.length);
      if (command === 'serve') {
        const path = JSON.stringify(posix.join(devBasePath(base), '@fs', file));
        return `export default new URL(${path}, location.href).href;`;
      }

      targets.add(file);
      return [
        `import url from ${JSON.stringify(`${file}?worker&url`)};`,
        'export default new URL(url, globalThis.location?.href ?? import.meta.url).href;',
      ].join('\n');
    },
  };
};
