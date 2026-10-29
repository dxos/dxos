//
// Copyright 2026 DXOS.org
//

import type { Plugin as EsbuildPlugin } from 'esbuild';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type BundleResult, bundleModule } from '@dxos/edge-compute/native';
import { trim } from '@dxos/util';

export type BundlePluginOptions = {
  /** A module that exports the plugin's `make`: a file path, or a package specifier resolved from `resolveDir`. */
  entryPoint: string;
  /**
   * Modules exporting the `make` of plugins the primary may depend on, in the same forms as `entryPoint`. The release
   * activates those in its `dependsOn` closure; bundling one it does not need costs only bytes.
   */
  dependencies?: readonly string[];
  /** Where `entryPoint` resolves from; defaults to the working directory. */
  resolveDir?: string;
  verbose?: boolean;
};

/** The host modules the generated main module imports, which the plugin package itself does not depend on. */
const HOST_MODULES = /^@dxos\/(plugin-host-cloudflare|functions-runtime-cloudflare)$/;

/**
 * Bundles a Composer plugin as an EDGE release: its `workerd` modules and a `PluginHost` main module, as one
 * self-contained module graph a Dynamic Worker loads from its `modules` map alone.
 *
 * The entry resolves under the `workerd` condition, so a plugin package's `./<X>Plugin` export picks its workerd
 * build and no browser-only module enters the bundle.
 */
export const bundlePlugin = async (options: BundlePluginOptions): Promise<BundleResult> => {
  const resolveDir = options.resolveDir ?? process.cwd();
  return bundleModule({
    sourcePath: isAbsolute(options.entryPoint) ? options.entryPoint : join(resolveDir, 'package.json'),
    verbose: options.verbose,
    resolveDir,
    plugins: [hostModules()],
    contents: trim`
      import { WorkerEntrypoint } from 'cloudflare:workers';

      let host;

      // Imported inside a request: module evaluation runs in global scope, where workerd disallows timers.
      const getHost = async () => {
        if (host === undefined) {
          const [{ PluginHost }, { setupFunctionsLogger }, primary, ...dependencies] = await Promise.all([
            import('@dxos/plugin-host-cloudflare'),
            import('@dxos/functions-runtime-cloudflare'),
            import(${JSON.stringify(options.entryPoint)}),
            ${(options.dependencies ?? []).map((entry) => `import(${JSON.stringify(entry)}),`).join('\n            ')}
          ]);
          setupFunctionsLogger();
          host ??= PluginHost.make(() => ({
            primary: primary.make(),
            dependencies: dependencies.map((module) => module.make()),
          }));
        }
        return host;
      };

      export default class PluginEntrypoint extends WorkerEntrypoint {
        async fetch(request) {
          return (await getHost()).fetch(request, this.env);
        }

        async describe() {
          return (await getHost()).describe();
        }

        async invoke(request, scope) {
          return (await getHost()).invoke(request, this.env, scope);
        }
      }
    `,
  });
};

/** Resolves the host modules from this package rather than from the plugin's. */
const hostModules = (): EsbuildPlugin => ({
  name: 'plugin-host-modules',
  setup: (build) => {
    // NOTE: `fileURLToPath`, not `new URL('.', import.meta.url)`, which Vite's library build inlines as a data URL.
    const modulePath = fileURLToPath(import.meta.url);
    const hostDir = dirname(modulePath);
    // The host itself is this package's main module: its source beside this one, or its build beside this chunk.
    const hostEntry = modulePath.endsWith('.ts') ? join(hostDir, '..', 'index.ts') : join(hostDir, 'index.mjs');
    build.onResolve({ filter: HOST_MODULES }, async (args) => {
      if (args.path === '@dxos/plugin-host-cloudflare') {
        return { path: hostEntry };
      }
      if (args.pluginData === hostDir) {
        return undefined;
      }
      const result = await build.resolve(args.path, { kind: args.kind, resolveDir: hostDir, pluginData: hostDir });
      return result.errors.length > 0 ? { errors: result.errors } : { path: result.path };
    });
  },
});
