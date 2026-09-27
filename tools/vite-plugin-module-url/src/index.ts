//
// Copyright 2026 DXOS.org
//

import { basename, extname, posix } from 'node:path';
import { type Plugin } from 'vite';

const QUERY = '?module-url';

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
 * Dev serves the source module through `/@fs/`; build emits a chunk with `preserveSignature: 'strict'`.
 */
export const ModuleUrlPlugin = (): Plugin => {
  let command: 'serve' | 'build' = 'serve';
  let base = '/';

  return {
    name: 'dxos:module-url',
    configResolved: (config) => {
      command = config.command;
      base = config.base;
    },
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

      const ref = this.emitFile({
        type: 'chunk',
        id: file,
        name: basename(file, extname(file)),
        preserveSignature: 'strict',
      });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
  };
};
