//
// Copyright 2023 DXOS.org
//

import { Plugin } from 'esbuild';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type BundleDepsPluginOptions = {
  /**
   * List of packages to bundle.
   */
  packages: string[];

  /**
   * Aliases. Mimics https://esbuild.github.io/api/#alias.
   */
  alias?: Record<string, string>;

  packageDir: string;
};

/**
 * Ensures all external dependencies are marked as external unless specifically listed for being included in the package bundle.
 */
export const bundleDepsPlugin = (options: BundleDepsPluginOptions): Plugin => ({
  name: 'bundle-deps',
  setup: (build) => {
    const packageJson = JSON.parse(readFileSync(join(options.packageDir, 'package.json'), 'utf-8'));
    const runtimeDeps = new Set([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.peerDependencies ?? {}),
    ]);

    build.onResolve({ namespace: 'file', filter: /.*/ }, (args) => {
      // Ignore aliased imports.
      if (options.alias?.[args.path]) {
        return build.resolve(options.alias[args.path], {
          importer: args.importer,
          kind: args.kind,
          namespace: args.namespace,
          resolveDir: options.packageDir,
        });
      }

      // Ignore `node:` imports.
      if (args.path.startsWith('node:')) {
        return null;
      }

      // Ignore local imports.
      if (args.path.startsWith('.')) {
        return null;
      }

      let moduleName = args.path.split('/')[0];
      if (args.path.startsWith('@')) {
        const split = args.path.split('/');
        moduleName = `${split[0]}/${split[1]}`;
      }

      if (options.packages.includes(moduleName)) {
        return null; // Bundle this dependency.
      }

      if (!runtimeDeps.has(moduleName)) {
        return {
          errors: [
            {
              text: `Missing dependency: ${moduleName}`,
            },
          ],
        };
      }

      return { external: true, path: args.path };
    });
  },
});
