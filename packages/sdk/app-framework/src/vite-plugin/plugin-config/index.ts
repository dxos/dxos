//
// Copyright 2026 DXOS.org
//

import { basename, dirname, relative } from 'node:path';
import type * as Vite from 'vite';
import { type RunnableDevEnvironment, type Plugin as VitePlugin } from 'vite';

import * as Capability from '../../core/capability.ts';
import type * as Plugin from '../../core/plugin.ts';

const CONFIG_FILE = /\/dx\.config\.ts$/;

// A specifier Bun cannot follow: the CLI bundles this entry for `dx registry publish`, and Vite's own
// optional imports do not resolve there.
const VITE_MODULE = 'vite';

const MODULE_REF = Symbol.for('@dxos/app-framework/vite-plugin/ModuleRef');

/**
 * Import attribute marking a dynamic import in `dx.config.ts` as a module body, e.g.
 * `() => import('./src/capabilities/state.ts', { with: { type: 'module-url' } })`: the build records
 * its location and never loads it. Other runtimes ignore the attribute, and builds drop it.
 */
export const MODULE_BODY_TYPE = 'module-url';

type ModuleBodyImport = { start: number; end: number; specifier: unknown; marked: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const hasProperty = (node: unknown, name: string, test: (value: unknown) => boolean): boolean =>
  isRecord(node) &&
  Array.isArray(node.properties) &&
  node.properties.some(
    (property) => isRecord(property) && isRecord(property.key) && property.key.name === name && test(property.value),
  );

// Every `import()` in a config, matched on the parsed AST, flagged when it carries the module-body attribute.
const findModuleBodyImports = (node: unknown, found: ModuleBodyImport[] = []): ModuleBodyImport[] => {
  if (Array.isArray(node)) {
    node.forEach((child) => findModuleBodyImports(child, found));
  } else if (isRecord(node)) {
    if (node.type === 'ImportExpression' && typeof node.start === 'number' && typeof node.end === 'number') {
      found.push({
        start: node.start,
        end: node.end,
        specifier: isRecord(node.source) ? node.source.value : undefined,
        marked: hasProperty(node.options, 'with', (attributes) =>
          hasProperty(attributes, 'type', (type) => isRecord(type) && type.value === MODULE_BODY_TYPE),
        ),
      });
    } else {
      Object.values(node).forEach((child) => findModuleBodyImports(child, found));
    }
  }
  return found;
};

/**
 * Replaces each module-body import in a `dx.config.ts` with a promise of a marker holding its specifier,
 * so evaluating the config at build time records module locations without loading any body. The build
 * resolves the specifier for its own target: a body can resolve differently per runtime (`#x` conditions).
 * Runs after TypeScript is stripped, because Vite drops dynamic-import attributes before resolution.
 */
const moduleRefPlugin = (): VitePlugin => ({
  name: 'dx-plugin-config:module-ref',
  async transform(code, id) {
    if (!CONFIG_FILE.test(id)) {
      return null;
    }
    let out = code;
    for (const { start, end, specifier, marked } of findModuleBodyImports(this.parse(code)).reverse()) {
      // An unmarked body would be loaded here, in Node, at build time.
      if (!marked) {
        this.error(
          `Dynamic import of '${String(specifier)}' in ${id} needs \`{ with: { type: '${MODULE_BODY_TYPE}' } }\`.`,
        );
      }
      if (typeof specifier !== 'string') {
        this.error(`A '${MODULE_BODY_TYPE}' import in ${id} needs a literal specifier to be located at build time.`);
      }
      const resolved = await this.resolve(specifier, id);
      if (!resolved) {
        this.error(`Cannot resolve module body '${specifier}' in ${id}.`);
      }
      const marker = `Promise.resolve({ [Symbol.for('@dxos/app-framework/vite-plugin/ModuleRef')]: ${JSON.stringify(specifier)} })`;
      out = out.slice(0, start) + marker + out.slice(end);
    }
    return out;
  },
});

const isPluginConfig = (value: unknown): value is Plugin.PluginConfig =>
  typeof value === 'object' &&
  value !== null &&
  'plugin' in value &&
  'modules' in value &&
  Array.isArray(value.modules);

const readModuleRef = (value: unknown): string | undefined =>
  typeof value === 'object' && value !== null && MODULE_REF in value && typeof value[MODULE_REF] === 'string'
    ? value[MODULE_REF]
    : undefined;

const toManifestTags = (tags: readonly Capability.AnyTag[] = []): Plugin.ManifestTag[] =>
  tags.map(({ identifier, arity }) => ({ identifier, arity }));

/**
 * `code` with the module-body attribute dropped from each marked import, or `null` if it has none.
 * `ast` is `code` parsed as ESTree; browsers reject an unknown import `type`, and only the build-time
 * evaluator needs it.
 */
export const stripModuleBodyAttributes = (code: string, ast: unknown): string | null => {
  let out = code;
  for (const { start, end, specifier, marked } of findModuleBodyImports(ast).reverse()) {
    if (marked && typeof specifier === 'string') {
      out = out.slice(0, start) + `import(${JSON.stringify(specifier)})` + out.slice(end);
    }
  }
  return out === code ? null : out;
};

/** Applies {@link stripModuleBodyAttributes} to every `dx.config.ts` served as authored (tests, storybook). */
export const moduleBodyAttributePlugin = (): VitePlugin => ({
  name: 'dx-plugin-config:module-body-attribute',
  transform(code, id) {
    return CONFIG_FILE.test(id.split('?')[0]) ? stripModuleBodyAttributes(code, this.parse(code)) : null;
  },
});

/** Query parameter for an app's lazily loaded half of a config: the module list a plugin needs once enabled. */
const MODULES_PARAM = 'dx-modules';

/** One module of a library build's manifest, with the source file its body (and adapter) load from. */
export type LibraryModule = Plugin.ManifestModule & { bodyFile: string; adapterFile?: string };

export type PluginConfigPluginOptions = {
  /** Restricts the plugin to one command, e.g. `'build'` for a library whose tests import the config. */
  apply?: 'build' | 'serve';
  /** Called with each config a library build emits, so a caller can map module bodies to the chunks they become. */
  onLibraryManifest?: (manifest: { configFile: string; modules: readonly LibraryModule[] }) => void;
};

/**
 * Evaluates every `dx.config.ts` defined with `Plugin.config` at build time and replaces it, for the
 * app, with its {@link Plugin.Manifest}: static JSON listing the modules for the target environment
 * and the URL of each body. Module bodies become their own chunks; bodies for other environments are
 * never emitted. In dev the config is re-evaluated on every load, so edits hot-reload.
 */
export const pluginConfigPlugin = ({ apply, onLibraryManifest }: PluginConfigPluginOptions = {}): VitePlugin => {
  let evaluator: Promise<RunnableDevEnvironment> | undefined;
  const getEvaluator = (root: string) =>
    (evaluator ??= (async () => {
      const { createRunnableDevEnvironment, defaultServerConditions, resolveConfig }: typeof Vite = await import(
        VITE_MODULE
      );
      const config = await resolveConfig(
        {
          configFile: false,
          root,
          logLevel: 'error',
          plugins: [moduleRefPlugin()],
          environments: {
            dxconfig: {
              consumer: 'server',
              dev: { moduleRunnerTransform: true },
              // Workspace packages resolve to source, so evaluating a config never reads a stale or unbuilt `dist`.
              resolve: { conditions: ['source', ...defaultServerConditions] },
            },
          },
        },
        'serve',
      );
      const environment = createRunnableDevEnvironment('dxconfig', config, {
        runnerOptions: { hmr: false },
        hot: false,
      });
      await environment.init();
      return environment;
    })());

  // Files changed since the last evaluation; the evaluator watches none itself.
  const changed = new Set<string>();
  let queue: Promise<unknown> = Promise.resolve();
  // One at a time: dropping the evaluated modules while another config is mid-import leaves it half-initialized.
  const evaluate = (root: string, file: string): Promise<unknown> => {
    const run = queue.then(async () => {
      const environment = await getEvaluator(root);
      if (changed.size > 0) {
        for (const changedFile of changed) {
          environment.moduleGraph
            .getModulesByFile(changedFile)
            ?.forEach((module) => environment.moduleGraph.invalidateModule(module));
        }
        changed.clear();
        environment.runner.evaluatedModules.clear();
      }
      const { default: config } = await environment.runner.import(file);
      return config;
    });
    queue = run.catch(() => undefined);
    return run;
  };

  return {
    name: 'dx-plugin-config',
    enforce: 'pre',
    apply,
    watchChange(id) {
      changed.add(id);
    },
    async load(id) {
      const file = id.split('?')[0];
      if (!CONFIG_FILE.test(file)) {
        return null;
      }

      const config = await evaluate(this.environment.config.root, file);
      // A `Config2.make` config carries metadata only; it is served as authored.
      if (!isPluginConfig(config)) {
        return null;
      }

      const library = this.environment.mode === 'build' && Boolean(this.environment.config.build.lib);
      const query = new URLSearchParams(id.split('?')[1] ?? '');
      // An app boots with each plugin's metadata only; its module list loads when the plugin is enabled.
      if (!library && !query.has(MODULES_PARAM)) {
        return [
          "import * as Plugin from '@dxos/app-framework/Plugin';",
          `const plugin = ${JSON.stringify(config.plugin)};`,
          'export const meta = Plugin.getMetaFromConfig({ plugin });',
          // Relative, so the dev server's hot-module transform takes the module list for the plugin's definition.
          `export const make = Plugin.lazy(meta, () => import(${JSON.stringify(`./${basename(file)}?${MODULES_PARAM}`)}));`,
          'export default { plugin, meta, make };',
          // An edit re-creates the plugin through its module list; its importers keep the `make` they hold.
          ...(this.environment.mode === 'dev' ? ['if (import.meta.hot) { import.meta.hot.accept(); }'] : []),
        ].join('\n');
      }

      const { conditions } = this.environment.config.resolve;
      const target =
        this.environment.config.consumer === 'client'
          ? conditions.includes('tauri')
            ? 'tauri'
            : 'browser'
          : conditions.includes('workerd')
            ? 'workerd'
            : 'node';

      // A library serves every runtime from one build: it keeps every module with its environments, and
      // each runtime activates only its own (`Plugin.fromModules`); an app build keeps its target's modules.
      const keep = (environments?: readonly string[]) => library || !environments || environments.includes(target);
      const libraryModules: LibraryModule[] = [];
      const loaders: string[] = [];
      const chunkRefs: string[] = [];
      // Dev serves the source file directly; a build emits it as a chunk whose URL replaces the token.
      const toUrl = (moduleFile: string, specifier = `./${relative(dirname(file), moduleFile)}`) => {
        if (moduleFile.startsWith('/')) {
          this.addWatchFile(moduleFile);
        }
        if (library) {
          loaders.push(
            `${JSON.stringify(specifier)}: () => import(${JSON.stringify(specifier.startsWith('.') ? moduleFile : specifier)})`,
          );
          return specifier;
        }
        if (this.environment.mode !== 'build') {
          const url = `/@fs${moduleFile}`;
          // A static import, so the dev server's hot-module transform finds the body and makes it hot-replaceable.
          if (specifier.startsWith('.') || specifier.startsWith('#')) {
            loaders.push(`${JSON.stringify(url)}: () => import(${JSON.stringify(specifier)})`);
          }
          return url;
        }
        // App builds drop entry exports; the body's `default` is the contract the manifest loads.
        chunkRefs.push(this.emitFile({ type: 'chunk', id: moduleFile, preserveSignature: 'exports-only' }));
        return `__DX_CHUNK_${chunkRefs.length - 1}__`;
      };
      const modules: Plugin.ManifestModule[] = [];
      for (const module of config.modules) {
        if (!module || !keep(module.environments)) {
          continue;
        }
        // Both tags are `Symbol.for` keys, so they match the copy of the framework the config loaded.
        const name = Capability.getModuleTag(module);
        const loader = module[Capability.LoaderTag];
        const bodySpecifier = loader ? readModuleRef(await loader()) : undefined;
        if (!name || !bodySpecifier) {
          this.error(`Module '${name ?? '?'}' in ${file} has no lazy body; manifests need one per module.`);
        }
        if (module.mapsProps) {
          this.error(
            `Module '${name}' in ${file} maps plugin options with \`props\`, which a manifest cannot carry; read the options in its body instead.`,
          );
        }
        // A library keeps a bare or `#` body specifier as written, so its consumer's conditions pick the file.
        const external = library && !bodySpecifier.startsWith('.');
        const bodyFile = external ? bodySpecifier : (await this.resolve(bodySpecifier, file))?.id;
        if (!bodyFile) {
          this.error(`Cannot resolve module body '${bodySpecifier}' of module '${name}' in ${file}.`);
        }
        const adapter = module[Capability.AdapterTag];
        const adapterFile = adapter ? (await this.resolve(adapter.module, file))?.id : undefined;
        if (adapter && !adapterFile) {
          this.error(`Cannot resolve adapter '${adapter.module}' of module '${name}' in ${file}.`);
        }
        modules.push({
          id: name,
          url: external || !library ? toUrl(bodyFile, bodySpecifier) : toUrl(bodyFile),
          activatesOn: module.activatesOn,
          requires: toManifestTags(module.requires),
          provides: toManifestTags(module.provides),
          ...(adapter && adapterFile
            ? { adapter: { url: toUrl(adapterFile, adapter.module), args: adapter.args } }
            : {}),
          ...(library && module.environments ? { environments: module.environments } : {}),
        });
        if (library) {
          libraryModules.push({ ...modules[modules.length - 1], bodyFile, adapterFile });
        }
      }
      if (library) {
        onLibraryManifest?.({ configFile: file, modules: libraryModules });
      }

      const manifest: Plugin.Manifest = { plugin: config.plugin, publish: config.publish, modules };
      const json = JSON.stringify(manifest, null, 2).replace(
        /"__DX_CHUNK_(\d+)__"/g,
        (_match, index) => `import.meta.ROLLUP_FILE_URL_${chunkRefs[Number(index)]}`,
      );
      return [
        "import * as Plugin from '@dxos/app-framework/Plugin';",
        `const plugin = Plugin.fromManifest(${json}, {${loaders.join(', ')}});`,
        // The app's lazy half is loaded by `Plugin.lazy`, which takes the factory as the default export.
        ...(library
          ? ['export const { meta, make } = plugin;', 'export default plugin;']
          : ['export default plugin.make;']),
      ].join('\n');
    },
  };
};
