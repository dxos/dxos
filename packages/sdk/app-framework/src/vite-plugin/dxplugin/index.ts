//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Plugin as VitePlugin } from 'vite';

import { parseJsonc } from '../../core/jsonc.ts';

/** Filename every plugin publishes next to its `package.json`. */
export const DXPLUGIN_FILENAME = 'dxplugin.jsonc';

/** A descriptor module, as the loader needs it: anything else on the entry rides through untouched. */
type RawModule = { src: string } & Record<string, unknown>;

const isModule = (value: unknown): value is RawModule =>
  typeof value === 'object' && value !== null && 'src' in value && typeof value.src === 'string';

/**
 * Narrows the parsed descriptor structurally rather than against the schema: keeping the loader
 * schema-free is what lets `vite.base.config.ts` import it by path without a build-order dependency
 * on this package. `Plugin.fromManifest` validates against `Config2.Descriptor` at load time.
 */
const readDescriptor = (raw: unknown): { modules: RawModule[]; profile: Record<string, unknown> } => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Plugin descriptor is not an object.');
  }
  const entries = Object.entries({ ...raw });
  const declared = entries.find(([key]) => key === 'modules')?.[1];
  const profile = Object.fromEntries(entries.filter(([key]) => key !== 'modules'));
  const listed: unknown[] = Array.isArray(declared) ? declared : [];
  const modules = listed.filter(isModule);
  if (modules.length !== listed.length) {
    throw new Error('Every plugin descriptor module must name a `src`.');
  }
  return { modules, profile };
};

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

    // A library build externalizes every non-relative import, and an externalized id never reaches
    // `load` — so a descriptor imported by its package specifier has to be resolved to its file here.
    async resolveId(id, importer) {
      if (!id.endsWith(DXPLUGIN_FILENAME)) {
        return null;
      }
      const resolved = await this.resolve(id, importer, { skipSelf: true });
      return resolved ? { id: resolved.id, external: false } : null;
    },

    load(id) {
      const [path] = id.split('?');
      if (!path.endsWith(DXPLUGIN_FILENAME)) {
        return null;
      }

      const { modules: declared, profile } = readDescriptor(parseJsonc(readFileSync(path, 'utf-8')));
      const dir = dirname(path);

      // Only the browser dev server serves `/@fs/`; a node consumer (vitest, an SSR transform) has to
      // import the file itself, so the dev form follows the environment rather than assuming a browser.
      const servesFs = this.environment?.name === 'client';

      // `src` is a JS expression because rollup substitutes `import.meta.ROLLUP_FILE_URL_*` only in
      // code position, and each module is serialized alone so no authored field can capture it.
      const modules = declared.map((module) => {
        const absolute = resolve(dir, module.src);
        const src = isBuild
          ? `import.meta.ROLLUP_FILE_URL_${this.emitFile({ type: 'chunk', id: absolute, preserveSignature: 'exports-only' })}`
          : JSON.stringify(servesFs ? `/@fs/${absolute}` : pathToFileURL(absolute).href);
        const { src: _src, ...rest } = module;
        return `{ ...${JSON.stringify(rest)}, src: ${src} }`;
      });

      const body = `{ ...${JSON.stringify(profile, null, 2)}, modules: [${modules.join(', ')}] }`;

      // Named `make`/`meta` alongside the data, so a consumer imports the descriptor as it would a
      // plugin namespace and never restates `fromManifest` at the call site. Only the loader can
      // offer them: a host reading the raw file gets data and calls `Plugin.fromManifest` itself.
      const code = [
        "import * as Plugin from '@dxos/app-framework/Plugin';",
        `const descriptor = ${body};`,
        'export const meta = Plugin.getMetaFromDescriptor(descriptor);',
        'export const make = Plugin.fromManifest(descriptor);',
        'export default descriptor;',
        '',
      ].join('\n');

      return { code, moduleSideEffects: false };
    },
  };
};
