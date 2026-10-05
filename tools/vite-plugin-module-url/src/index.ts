//
// Copyright 2026 DXOS.org
//

import { dirname, posix, relative, resolve } from 'node:path';
import { RolldownMagicString } from 'rolldown';
import { type Plugin } from 'vite';

const QUERY = '?module-url';

export type ModuleUrlPluginOptions = {
  /**
   * Modules built as extra entries of a worker's own build, keyed by that worker's entry (paths relative
   * to the project root). The worker then loads one instance of every module they share with it, where a
   * self-contained bundle would carry copies of its own. Pass the same options to the instance in
   * `worker.plugins`, which is the one that sees the worker's build.
   */
  workers?: Readonly<Record<string, readonly string[]>>;
};

/**
 * Files imported with `?module-url` in a build. Module scope rather than per instance: the tab's
 * build and the worker bundles it spawns each run their own instance of the plugin.
 */
const targets = new Set<string>();

/** Output file of each module built into a host worker's build, recorded by that build for the tab's. */
const hostedFiles = new Map<string, string>();

/** Hosted modules in placeholder order; a placeholder names its module by index. */
const placeholderModules: string[] = [];

const PLACEHOLDER_RE = /__DX_MODULE_URL_(\d+)__/g;

/** Where a host worker's entry lists the loaders of the modules built into its build. */
const HOSTED_GLOBAL = '__dxModuleUrlHosted';

const placeholderFor = (file: string): string => {
  let index = placeholderModules.indexOf(file);
  if (index === -1) {
    index = placeholderModules.push(file) - 1;
  }
  return `__DX_MODULE_URL_${index}__`;
};

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
 * Resolves `import url from './module.ts?module-url'` to the URL of that module compiled as an
 * ES module whose exports are preserved, so another realm (e.g. a worker) can `import()` it.
 *
 * Vite's built-ins cannot do this: `new URL('./x.ts', import.meta.url)` and `?url` copy the raw
 * source as an asset, and `?worker&url` bundles a worker entry with its exports tree-shaken away.
 *
 * Dev serves the source module through `/@fs/`. In a build, a module listed under a worker in `workers`
 * is a dynamically imported chunk of that worker's build, so it shares the worker's chunks; Vite copies that
 * build's files into the importing build, and the URL is resolved once both exist. Any other module
 * goes through Vite's worker bundler (`?worker&url`) with its exports kept: a self-contained bundle,
 * never a chunk of the importing build, whose shared chunks could carry DOM code into a worker or break
 * a chunking scheme that assumes it sees the whole graph. Either way the plugin must be in
 * `worker.plugins` too, and `worker.format` must be `'es'`.
 */
export const ModuleUrlPlugin = ({ workers = {} }: ModuleUrlPluginOptions = {}): Plugin => {
  let command: 'serve' | 'build' = 'serve';
  let base = '/';
  /** Each hosted module, by its host worker's entry. */
  let hosts = new Map<string, string[]>();
  /** The host each hosted module is built into. */
  let hostOf = new Map<string, string>();
  /** This build's single input, when it is a worker bundle. */
  let workerInput: string | undefined;

  return {
    name: 'dxos:module-url',
    configResolved: (config) => {
      command = config.command;
      base = config.base;
      hosts = new Map(
        Object.entries(workers).map(([host, modules]) => [
          resolve(config.root, host),
          modules.map((hosted) => resolve(config.root, hosted)),
        ]),
      );
      hostOf = new Map([...hosts].flatMap(([host, modules]) => modules.map((hosted) => [hosted, host] as const)));
      if (command === 'build' && config.worker.format !== 'es') {
        throw new Error('ModuleUrlPlugin needs `worker.format: "es"`: a module URL is imported, not run as a script.');
      }
    },
    // Runs in each worker bundle's own build (see `worker.plugins`): Vite drops a worker entry's
    // exports, which are the point of a module URL.
    options: (options) => {
      workerInput = typeof options.input === 'string' ? options.input : undefined;
      return workerInput && targets.has(workerInput) ? { ...options, preserveEntrySignatures: 'strict' } : undefined;
    },
    // A dynamic import from the worker entry, rather than an extra entry chunk: Vite takes a worker
    // build's first output chunk as the worker, and entries are ordered by name. Recorded on a global so
    // tree-shaking keeps it; a dynamically imported chunk keeps all of its exports.
    transform(code, id) {
      const hosted = id === workerInput ? hosts.get(id) : undefined;
      if (!hosted?.length) {
        return;
      }
      const loaders = hosted.map((file) => `() => import(${JSON.stringify(file)})`).join(', ');
      return { code: `${code}\n;(globalThis.${HOSTED_GLOBAL} ??= []).push(${loaders});\n`, map: null };
    },
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk' && file.isDynamicEntry && file.facadeModuleId && hostOf.has(file.facadeModuleId)) {
          hostedFiles.set(file.facadeModuleId, file.fileName);
        }
      }
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

      // The host worker's build may not have run yet, so its file name is filled in when the chunk renders.
      // Through a binding: a literal `new URL('...', import.meta.url)` would be taken for an asset reference.
      if (hostOf.has(file)) {
        return [
          `const path = ${JSON.stringify(placeholderFor(file))};`,
          'export default new URL(path, import.meta.url).href;',
        ].join('\n');
      }

      targets.add(file);
      return [
        `import url from ${JSON.stringify(`${file}?worker&url`)};`,
        'export default new URL(url, globalThis.location?.href ?? import.meta.url).href;',
      ].join('\n');
    },
    renderChunk(code, chunk) {
      if (!code.includes('__DX_MODULE_URL_')) {
        return;
      }

      const output = new RolldownMagicString(code);
      for (const match of code.matchAll(PLACEHOLDER_RE)) {
        const hosted = placeholderModules[Number(match[1])];
        const fileName = hosted && hostedFiles.get(hosted);
        if (!fileName) {
          return this.error(`ModuleUrlPlugin: "${hosted}" was not built; is its host worker started from this build?`);
        }
        const path = relative(dirname(chunk.fileName), fileName).split('\\').join('/');
        output.overwrite(match.index, match.index + match[0].length, path.startsWith('.') ? path : `./${path}`);
      }
      return output;
    },
  };
};
