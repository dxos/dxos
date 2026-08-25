//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { type Plugin as VitePlugin } from 'vite';

import { Config2 } from '@dxos/protocols';

import { Plugin } from '../../core';

/** Filename every plugin publishes next to its `package.json`. */
export const DXPLUGIN_FILENAME = 'dxplugin.jsonc';

const decodeDescriptor = Schema.decodeUnknownSync(Config2.Descriptor);

/** Marks where a module `src` sits in the generated JS, so it can be swapped for a live expression. */
const SRC_PLACEHOLDER = (index: number) => `__dxplugin_src_${index}__`;

/**
 * Loader for `dxplugin.jsonc` plugin descriptors, modelled on vite's own HTML handling: a
 * descriptor is not an opaque asset but a *document that references modules*, so the loader walks
 * its `modules[].src` list and hands each referenced file to vite as a first-class module.
 *
 * - **dev** — each `src` is rewritten to a URL the dev server already serves (`/@fs/<abs path>`),
 *   so the app's `await import(module.src)` hits the dev server and gets transformed-on-demand
 *   source, with HMR intact and no bundling step.
 * - **build** — each `src` is emitted as a build entrypoint (`this.emitFile({ type: 'chunk' })`)
 *   and rewritten to `import.meta.ROLLUP_FILE_URL_*`, which resolves at runtime to the built
 *   chunk's URL — the `.ts` paths become the `.js` assets that actually ship. The chunk is
 *   *declared* rather than inferred from an `import()` expression, so a module reachable only
 *   through a descriptor is never tree-shaken away.
 *
 * The descriptor is served as a JS module whose default export is the rewritten descriptor, so
 * `await import('@dxos/plugin-x/dxplugin.jsonc')` yields data the app hands straight to
 * {@link Plugin.fromManifest}. A host loading a *published* plugin instead fetches the same file
 * over HTTP and parses the JSONC itself; `Plugin.fromManifest` accepts either.
 */
export const dxPluginManifest = (): VitePlugin => {
  let isBuild = false;

  return {
    name: '@dxos/vite-plugin-dxplugin',
    // Ahead of vite's JSON plugin, which would otherwise claim the file and choke on its comments.
    enforce: 'pre',

    configResolved(config) {
      isBuild = config.command === 'build';
    },

    load(id) {
      const [path] = id.split('?');
      if (!path.endsWith(DXPLUGIN_FILENAME)) {
        return null;
      }

      const descriptor = decodeDescriptor(Plugin.parseJsonc(readFileSync(path, 'utf-8')));
      const dir = dirname(path);
      const sources: string[] = [];

      const modules = descriptor.modules.map((module, index) => {
        const absolute = resolve(dir, module.src);
        if (isBuild) {
          const referenceId = this.emitFile({ type: 'chunk', id: absolute, preserveSignature: 'exports-only' });
          sources.push(`import.meta.ROLLUP_FILE_URL_${referenceId}`);
        } else {
          sources.push(JSON.stringify(`/@fs/${absolute}`));
        }
        return { ...module, src: SRC_PLACEHOLDER(index) };
      });

      // The placeholders are the only occurrences of their text in the serialized descriptor
      // (they are generated, not authored), so a plain string swap is unambiguous.
      const body = sources.reduce(
        (code, src, index) => code.replace(JSON.stringify(SRC_PLACEHOLDER(index)), src),
        JSON.stringify({ ...descriptor, modules }, null, 2),
      );

      return { code: `export default ${body};\n`, moduleSideEffects: false };
    },
  };
};
