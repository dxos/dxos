//
// Copyright 2026 DXOS.org
//

import { basename, extname, posix, resolve } from 'node:path';
import { type Plugin, type Rolldown } from 'vite';

const QUERY = '?module-url';

/** Modules built together in a build environment of their own. */
export type ModuleUrlEnvironment = {
  /**
   * Environment name.
   * @default 'moduleUrl'
   */
  name?: string;
  /** Module paths, relative to the project root; each becomes an entry named after its file. */
  entries: readonly string[];
};

export type ModuleUrlPluginOptions = {
  /**
   * Builds these modules as one graph, in an environment built before the client, so a realm that
   * loads several of them (a worker entry and the plugins it `import()`s) shares one instance of
   * every module they have in common. A `?module-url` import of any other file stays a
   * self-contained bundle.
   */
  environment?: ModuleUrlEnvironment;
};

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

const entryName = (file: string): string => basename(file, extname(file));

/**
 * Resolves `import url from './module.ts?module-url'` to the URL of that module compiled as an
 * ES module whose exports are preserved, so another realm (e.g. a worker) can `import()` it.
 *
 * Vite's built-ins cannot do this: `new URL('./x.ts', import.meta.url)` and `?url` copy the raw
 * source as an asset, and `?worker&url` bundles a worker entry with its exports tree-shaken away.
 *
 * Dev serves the source module through `/@fs/`, as a module worker entry. In a build, a module listed in `environment.entries`
 * is an entry of that environment's build, whose output files are emitted into the client's. Any
 * other module goes through Vite's worker bundler (`?worker&url`) with its exports kept: a
 * self-contained bundle, never a chunk of the importing build, whose shared chunks could carry DOM
 * code into a worker or break a chunking scheme that assumes it sees the whole graph. That path needs
 * the plugin in `worker.plugins` too, and `worker.format: 'es'`.
 */
export const ModuleUrlPlugin = ({ environment }: ModuleUrlPluginOptions = {}): Plugin => {
  const environmentName = environment?.name ?? 'moduleUrl';
  let command: 'serve' | 'build' = 'serve';
  let base = '/';
  let root = process.cwd();
  let entries: string[] = [];
  /** The environment's output, emitted into the client build. */
  let output: (Rolldown.OutputChunk | Rolldown.OutputAsset)[] = [];
  /** Asset reference of each entry's output file, per client build. */
  const references = new Map<string, string>();

  return {
    name: 'dxos:module-url',
    // One instance across environments: the client build reads what the environment's build produced.
    sharedDuringBuild: true,
    config: (config, { command }) => {
      if (!environment || command !== 'build') {
        return;
      }

      root = resolve(config.root ?? process.cwd());
      entries = environment.entries.map((entry) => resolve(root, entry));
      const names = entries.map(entryName);
      const duplicate = names.find((name, index) => names.indexOf(name) !== index);
      if (duplicate) {
        throw new Error(`ModuleUrlPlugin: two entries are named "${duplicate}".`);
      }

      return { builder: {}, environments: { [environmentName]: { consumer: 'client' } } };
    },
    // After the environment has inherited the top-level build options: replace, not merge, the ones
    // that describe the client's own output (its HTML inputs, its chunking, its manifest).
    configEnvironment: (name, config) => {
      if (!environment || name !== environmentName) {
        return;
      }

      const assetsDir = config.build?.assetsDir ?? 'assets';
      const fileNames = posix.join(assetsDir, '[name]-[hash].js');
      config.build = {
        ...config.build,
        write: false,
        emptyOutDir: false,
        copyPublicDir: false,
        manifest: false,
        ssrManifest: false,
        // Vite's preload helper touches `document`, which a worker does not have: no preloads, and no
        // per-chunk CSS, which a dynamic import would preload even then.
        modulePreload: false,
        cssCodeSplit: false,
        rolldownOptions: {
          external: config.build?.rolldownOptions?.external,
          input: Object.fromEntries(entries.map((entry) => [entryName(entry), entry])),
          preserveEntrySignatures: 'strict',
          output: {
            format: 'es',
            entryFileNames: fileNames,
            chunkFileNames: fileNames,
            assetFileNames: posix.join(assetsDir, '[name]-[hash][extname]'),
            // Default splitting over several entries can put the two sides of a module cycle in chunks
            // that import each other, and a class then extends a binding its chunk has not evaluated.
            strictExecutionOrder: true,
          },
        },
      };
    },
    configResolved: (config) => {
      command = config.command;
      base = config.base;
      if (command === 'build' && config.worker.format !== 'es') {
        throw new Error('ModuleUrlPlugin needs `worker.format: "es"`: a module URL is imported, not run as a script.');
      }
    },
    buildApp: {
      order: 'pre',
      handler: async (builder) => {
        const target = environment && builder.environments[environmentName];
        if (!target || target.isBuilt) {
          return;
        }

        const result = await builder.build(target);
        // A watcher (`build.watch`) has no output to hand over.
        output = (Array.isArray(result) ? result : [result]).flatMap((entry) =>
          'output' in entry ? entry.output : [],
        );
        // Building one environment turns off Vite's fallback of building them all.
        const client = builder.environments.client;
        if (client && !client.isBuilt) {
          await builder.build(client);
        }
      },
    },
    // Runs in each worker bundle's own build (see `worker.plugins`): Vite drops a worker entry's
    // exports, which are the point of a module URL.
    options: (options) =>
      typeof options.input === 'string' && targets.has(options.input)
        ? { ...options, preserveEntrySignatures: 'strict' }
        : undefined,
    buildStart() {
      references.clear();
      if (this.environment.name !== 'client') {
        return;
      }

      for (const file of output) {
        const reference = this.emitFile({
          type: 'asset',
          fileName: file.fileName,
          source: file.type === 'chunk' ? file.code : file.source,
        });
        if (file.type === 'chunk' && file.isEntry && file.facadeModuleId) {
          references.set(file.facadeModuleId, reference);
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
        // Served as a module worker's entry, which Vite prefixes with the `define` globals: the URL
        // may start a worker, and in one that was already started the prefix is a no-op.
        const path = JSON.stringify(`${posix.join(devBasePath(base), '@fs', file)}?worker_file&type=module`);
        return `export default new URL(${path}, location.href).href;`;
      }

      const reference = references.get(file);
      if (reference) {
        return `export default import.meta.ROLLUP_FILE_URL_${reference};`;
      }
      if (entries.includes(file) && this.environment.name === 'client') {
        this.error(`ModuleUrlPlugin: "${file}" is an entry of "${environmentName}", which was not built first.`);
      }

      targets.add(file);
      return [
        `import url from ${JSON.stringify(`${file}?worker&url`)};`,
        'export default new URL(url, globalThis.location?.href ?? import.meta.url).href;',
      ].join('\n');
    },
  };
};
