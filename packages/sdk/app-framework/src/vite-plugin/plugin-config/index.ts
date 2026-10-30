//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve as resolvePath } from 'node:path';
import type * as Vite from 'vite';
import { type RunnableDevEnvironment, type Plugin as VitePlugin } from 'vite';

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

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

/**
 * Prefix of the generated body of an operations module: `dx-operations:<module name>:<config file>`,
 * the file relative to the build root so no machine path reaches the output. The body is generated
 * rather than authored, from the handler set the config declares literally.
 */
const OPERATIONS_PREFIX = 'dx-operations:';

const toOperationsId = (root: string, configFile: string, moduleName: string) =>
  `${OPERATIONS_PREFIX}${encodeURIComponent(moduleName)}:${relative(root, configFile)}`;

const parseOperationsId = (root: string, id: string): { file: string; module: string } | undefined => {
  const body = id.startsWith('\0') ? id.slice(1) : id;
  if (!body.startsWith(OPERATIONS_PREFIX)) {
    return undefined;
  }
  const rest = body.slice(OPERATIONS_PREFIX.length);
  const separator = rest.indexOf(':');
  return { module: decodeURIComponent(rest.slice(0, separator)), file: resolvePath(root, rest.slice(separator + 1)) };
};

/** A module the config evaluation loaded, kept so a definition can be traced to the module exporting it. */
type EvaluatedExports = { file: string; exports: unknown };

/** Where a definition can be imported from: the file (or package subpath) and its export name. */
type DefinitionLocation = { specifier: string; name: string };

const findPackageRoot = (file: string): string | undefined => {
  for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) {
    try {
      readFileSync(join(dir, 'package.json'));
      return dir;
    } catch {
      continue;
    }
  }
  return undefined;
};

/**
 * The package subpath (`@scope/pkg/Sub`) whose `source` condition is `file`, so code generated for
 * one package imports another package's module through its public exports.
 */
const toPackageSpecifier = (file: string): string | undefined => {
  const root = findPackageRoot(file);
  if (!root) {
    return undefined;
  }
  const pkg: unknown = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (!isRecord(pkg) || typeof pkg.name !== 'string' || !isRecord(pkg.exports)) {
    return undefined;
  }
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    const source = isRecord(target) ? target.source : target;
    if (typeof source === 'string' && resolvePath(root, source) === file) {
      return subpath === '.' ? pkg.name : `${pkg.name}${subpath.slice(1)}`;
    }
  }
  return undefined;
};

/**
 * Generates the body of an operations module: imports each definition from the module that exports it
 * and pairs it with a dynamic import of its handler, so every handler is its own chunk and the module
 * itself carries only definitions.
 */
const generateOperationsModule = async ({
  configFile,
  set,
  evaluated,
  resolve,
}: {
  configFile: string;
  set: OperationHandlerSet.OperationHandlerSet;
  evaluated: readonly EvaluatedExports[];
  resolve: (specifier: string, importer: string) => Promise<string | undefined>;
}): Promise<{ code: string; keys: string[] }> => {
  const entries = OperationHandlerSet.getLazyEntries(set);
  if (!entries) {
    throw new Error(
      `The operation handler set in ${configFile} is not an \`OperationHandlerSet.lazy\` set; only lazy handlers can be split into chunks.`,
    );
  }
  const packageRoot = dirname(configFile);
  const locate = (definition: unknown, key: string): DefinitionLocation => {
    for (const { file, exports } of evaluated) {
      if (file === configFile || !isRecord(exports)) {
        continue;
      }
      const name = Object.keys(exports).find((exportName) => exports[exportName] === definition);
      if (name) {
        const specifier = file.startsWith(`${packageRoot}/`) ? file : toPackageSpecifier(file);
        if (specifier) {
          return { specifier, name };
        }
      }
    }
    throw new Error(
      `Operation '${key}' in ${configFile} is not a named export of an importable module; export its definition by name.`,
    );
  };

  const imports: string[] = [];
  const pairs: string[] = [];
  const keys: string[] = [];
  for (const [index, { definition, load }] of entries.entries()) {
    const key = definition.meta.key;
    const handlerSpecifier = readModuleRef(await load());
    if (!handlerSpecifier) {
      throw new Error(
        `Handler of operation '${key}' in ${configFile} needs \`() => import(..., { with: { type: '${MODULE_BODY_TYPE}' } })\`.`,
      );
    }
    const handlerFile = await resolve(handlerSpecifier, configFile);
    if (!handlerFile) {
      throw new Error(`Cannot resolve handler '${handlerSpecifier}' of operation '${key}' in ${configFile}.`);
    }
    const { specifier, name } = locate(definition, key);
    imports.push(`import { ${name} as definition${index} } from ${JSON.stringify(specifier)};`);
    pairs.push(`  Operation.lazyHandler(definition${index}, () => import(${JSON.stringify(handlerFile)})),`);
    keys.push(key);
  }

  const code = [
    "import * as Capabilities from '@dxos/app-framework/Capabilities';",
    "import * as Capability from '@dxos/app-framework/Capability';",
    "import * as Operation from '@dxos/compute/Operation';",
    "import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';",
    "import * as Effect from 'effect/Effect';",
    ...imports,
    'export const handlers = OperationHandlerSet.lazy([',
    ...pairs,
    ']);',
    'export default () => Effect.succeed(Capability.contribute(Capabilities.OperationHandler, handlers));',
  ].join('\n');
  return { code, keys };
};

/** Query parameter on a library entry for `dx.config.ts` that limits it to one runtime's modules. */
export const LIBRARY_ENV_PARAM = 'dx-env';

/** Query parameter for an app's lazily loaded half of a config: the module list a plugin needs once enabled. */
const MODULES_PARAM = 'dx-modules';

export type PluginConfigPluginOptions = {
  /** Restricts the plugin to one command, e.g. `'build'` for a library whose tests import the config. */
  apply?: 'build' | 'serve';
};

/**
 * Evaluates every `dx.config.ts` defined with `Plugin.config` at build time and replaces it, for the
 * app, with its {@link Plugin.Manifest}: static JSON listing the modules for the target environment
 * and the URL of each body. Module bodies become their own chunks; bodies for other environments are
 * never emitted. In dev the config is re-evaluated on every load, so edits hot-reload.
 */
export const pluginConfigPlugin = ({ apply }: PluginConfigPluginOptions = {}): VitePlugin => {
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
  const evaluate = (root: string, file: string): Promise<{ config: unknown; evaluated: EvaluatedExports[] }> => {
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
      // Snapshot now: the next evaluation clears the runner's module graph.
      const evaluated: EvaluatedExports[] = [...environment.runner.evaluatedModules.idToModuleMap.values()].map(
        ({ file: moduleFile, exports }) => ({ file: moduleFile, exports }),
      );
      return { config, evaluated };
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
    async resolveId(source, importer) {
      const { root } = this.environment.config;
      if (parseOperationsId(root, source)) {
        return source.startsWith('\0') ? source : `\0${source}`;
      }
      // A generated operations module imports as if it were its config, which names the same packages.
      const generated = importer ? parseOperationsId(root, importer) : undefined;
      if (generated && !source.startsWith('/')) {
        return this.resolve(source, generated.file, { skipSelf: true });
      }
      return null;
    },
    async load(id) {
      const operationsModule = parseOperationsId(this.environment.config.root, id);
      if (operationsModule && id.startsWith('\0')) {
        const { config, evaluated } = await evaluate(this.environment.config.root, operationsModule.file);
        const set = isPluginConfig(config)
          ? config.modules
              .filter((module) => module && Capability.getModuleTag(module) === operationsModule.module)
              .map((module) => module && Capability.getOperations(module))
              .find((candidate) => candidate !== undefined)
          : undefined;
        if (!set) {
          this.error(`No operations module '${operationsModule.module}' in ${operationsModule.file}.`);
        }
        const { code } = await generateOperationsModule({
          configFile: operationsModule.file,
          set,
          evaluated,
          resolve: async (specifier, importer) => (await this.resolve(specifier, importer))?.id,
        });
        return code;
      }

      const file = id.split('?')[0];
      if (!CONFIG_FILE.test(file)) {
        return null;
      }

      const { config, evaluated } = await evaluate(this.environment.config.root, file);
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

      // A library's dist is re-bundled downstream, so each body loads through an import a bundler can
      // follow. The default entry keeps every module with its environments; a `?dx-env=` entry keeps
      // one runtime's modules, so a headless bundle never reaches a browser-only body.
      const libraryEnv = library ? query.get(LIBRARY_ENV_PARAM) : null;
      const keep = (environments?: readonly string[]) =>
        !environments || (library ? !libraryEnv || environments.includes(libraryEnv) : environments.includes(target));
      const loaders: string[] = [];
      const chunkRefs: string[] = [];
      // Dev serves the source file directly; a build emits it as a chunk whose URL replaces the token.
      const toUrl = (moduleFile: string, specifier = `./${relative(dirname(file), moduleFile)}`) => {
        const generated = moduleFile.startsWith('\0');
        if (generated && !library && this.environment.mode !== 'build') {
          const url = `/@id/__x00__${moduleFile.slice(1)}`;
          loaders.push(`${JSON.stringify(url)}: () => import(${JSON.stringify(moduleFile.slice(1))})`);
          return url;
        }
        if (moduleFile.startsWith('/')) {
          this.addWatchFile(moduleFile);
        }
        if (library) {
          loaders.push(
            // A generated module is imported by its `\0` id, which a library build bundles instead of externalizing.
            `${JSON.stringify(specifier)}: () => import(${JSON.stringify(specifier.startsWith('.') || generated ? moduleFile : specifier)})`,
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
      const operationsIds: string[] = [];
      for (const module of config.modules) {
        if (!module || !keep(module.environments)) {
          continue;
        }
        // Both tags are `Symbol.for` keys, so they match the copy of the framework the config loaded.
        const name = Capability.getModuleTag(module);
        const operations = Capability.getOperations(module);
        if (operations) {
          if (!name) {
            this.error(`An operations module in ${file} has no name.`);
          }
          const operationsId = toOperationsId(this.environment.config.root, file, name);
          const { keys } = await generateOperationsModule({
            configFile: file,
            set: operations,
            evaluated,
            resolve: async (specifier, importer) => (await this.resolve(specifier, importer))?.id,
          }).catch((error: Error) => this.error(error.message));
          operationsIds.push(operationsId);
          modules.push({
            id: name,
            url: toUrl(`\0${operationsId}`, operationsId),
            activatesOn: module.activatesOn,
            requires: toManifestTags(module.requires),
            provides: toManifestTags(module.provides),
            operations: keys,
            ...(library && module.environments ? { environments: module.environments } : {}),
          });
          continue;
        }
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
      }

      const manifest: Plugin.Manifest = { plugin: config.plugin, publish: config.publish, modules };
      const json = JSON.stringify(manifest, null, 2).replace(
        /"__DX_CHUNK_(\d+)__"/g,
        (_match, index) => `import.meta.ROLLUP_FILE_URL_${chunkRefs[Number(index)]}`,
      );
      if (!library) {
        return [
          "import * as Plugin from '@dxos/app-framework/Plugin';",
          `const plugin = Plugin.fromManifest(${json}, {${loaders.join(', ')}});`,
          // The app's lazy half is loaded by `Plugin.lazy`, which takes the factory as the default export.
          'export default plugin.make;',
        ].join('\n');
      }
      // A library also serves hosts with no plugin manager (the CLI), which take its operations directly.
      return [
        "import * as Plugin from '@dxos/app-framework/Plugin';",
        // Only a config with operations modules imports the handler-set package, which it already depends on.
        ...(operationsIds.length > 0
          ? ["import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';"]
          : []),
        ...operationsIds.map(
          (operationsId, index) =>
            `import { handlers as operations${index} } from ${JSON.stringify(`\0${operationsId}`)};`,
        ),
        `const operations = ${
          operationsIds.length > 0
            ? `OperationHandlerSet.merge(${operationsIds.map((_, index) => `operations${index}`).join(', ')})`
            : 'Plugin.getOperations([])'
        };`,
        `const plugin = { ...Plugin.fromManifest(${json}, {${loaders.join(', ')}}), operations };`,
        'export const { meta, make } = plugin;',
        'export { operations };',
        'export default plugin;',
      ].join('\n');
    },
  };
};
