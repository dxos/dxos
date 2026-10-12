//
// Copyright 2026 DXOS.org
//

import {
  type Plugin as VitePlugin,
  type RunnableDevEnvironment,
  createRunnableDevEnvironment,
  resolveConfig,
} from 'vite';

import * as Capability from '../../core/capability.ts';
import type * as Plugin from '../../core/plugin.ts';

const CONFIG_FILE = /\/dx\.config\.ts$/;

const MODULE_REF = Symbol.for('@dxos/app-framework/vite-plugin/ModuleRef');

// Literal-specifier dynamic imports only: a computed specifier cannot be resolved at build time.
const DYNAMIC_IMPORT = /\bimport\(\s*(['"])([^'"]+)\1\s*\)/g;

/**
 * Rewrites each `import('…')` in a `dx.config.ts` to a promise of a marker holding the resolved
 * file, so evaluating the config at build time records module locations without loading any body.
 */
const moduleRefPlugin = (): VitePlugin => ({
  name: 'dx-plugin-config:module-ref',
  enforce: 'pre',
  async transform(code, id) {
    if (!CONFIG_FILE.test(id)) {
      return null;
    }
    let out = code;
    for (const [match, , specifier] of code.matchAll(DYNAMIC_IMPORT)) {
      const resolved = await this.resolve(specifier, id);
      if (!resolved) {
        this.error(`Cannot resolve module body '${specifier}' in ${id}.`);
      }
      out = out.replace(
        match,
        `Promise.resolve({ [Symbol.for('@dxos/app-framework/vite-plugin/ModuleRef')]: ${JSON.stringify(resolved.id)} })`,
      );
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
 * Evaluates every `dx.config.ts` defined with `Plugin.config` at build time and replaces it, for the
 * app, with its {@link Plugin.Manifest}: static JSON listing the modules for the target environment
 * and the URL of each body. Module bodies become their own chunks; bodies for other environments are
 * never emitted. In dev the config is re-evaluated on every load, so edits hot-reload.
 */
export const pluginConfigPlugin = (): VitePlugin => {
  let evaluator: Promise<RunnableDevEnvironment> | undefined;
  const getEvaluator = (root: string) =>
    (evaluator ??= (async () => {
      const config = await resolveConfig(
        {
          configFile: false,
          root,
          logLevel: 'error',
          plugins: [moduleRefPlugin()],
          environments: { dxconfig: { consumer: 'server', dev: { moduleRunnerTransform: true } } },
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

  return {
    name: 'dx-plugin-config',
    enforce: 'pre',
    async load(id) {
      const file = id.split('?')[0];
      if (!CONFIG_FILE.test(file)) {
        return null;
      }

      const runner = (await getEvaluator(this.environment.config.root)).runner;
      runner.evaluatedModules.clear();
      const { default: config } = await runner.import(file);
      // A `Config2.make` config carries metadata only; it is served as authored.
      if (!isPluginConfig(config)) {
        return null;
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

      const chunkRefs: string[] = [];
      // Dev serves the source file directly; a build emits it as a chunk whose URL replaces the token.
      const toUrl = (moduleFile: string) => {
        this.addWatchFile(moduleFile);
        if (this.environment.mode !== 'build') {
          return `/@fs${moduleFile}`;
        }
        chunkRefs.push(this.emitFile({ type: 'chunk', id: moduleFile }));
        return `__DX_CHUNK_${chunkRefs.length - 1}__`;
      };
      const modules: Plugin.ManifestModule[] = [];
      for (const module of config.modules) {
        if (!module || (module.environments && !module.environments.includes(target))) {
          continue;
        }
        // Both tags are `Symbol.for` keys, so they match the copy of the framework the config loaded.
        const name = Capability.getModuleTag(module);
        const loader = module[Capability.LoaderTag];
        const body = loader ? readModuleRef(await loader()) : undefined;
        if (!name || !body) {
          this.error(`Module '${name ?? '?'}' in ${file} has no lazy body; manifests need one per module.`);
        }
        const adapter = module[Capability.AdapterTag];
        const adapterFile = adapter ? (await this.resolve(adapter.module, file))?.id : undefined;
        if (adapter && !adapterFile) {
          this.error(`Cannot resolve adapter '${adapter.module}' of module '${name}' in ${file}.`);
        }
        modules.push({
          id: name,
          url: toUrl(body),
          activatesOn: module.activatesOn,
          requires: toManifestTags(module.requires),
          provides: toManifestTags(module.provides),
          ...(adapter && adapterFile ? { adapter: { url: toUrl(adapterFile), args: adapter.args } } : {}),
        });
      }

      const manifest: Plugin.Manifest = { plugin: config.plugin, publish: config.publish, modules };
      const json = JSON.stringify(manifest, null, 2).replace(
        /"__DX_CHUNK_(\d+)__"/g,
        (_match, index) => `import.meta.ROLLUP_FILE_URL_${chunkRefs[Number(index)]}`,
      );
      return [
        "import * as Plugin from '@dxos/app-framework/Plugin';",
        `const plugin = Plugin.fromManifest(${json});`,
        'export const { meta, make } = plugin;',
        'export default plugin;',
      ].join('\n');
    },
  };
};
