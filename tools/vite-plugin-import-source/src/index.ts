//
// Copyright 2025 DXOS.org
//

import Minimatch from 'minimatch';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin, type ResolvedConfig } from 'vite';

interface PluginImportSourceOptions {
  include?: string[];
  exclude?: string[];
  verbose?: boolean;
}

const PluginImportSource = ({
  include = ['**'],
  exclude = ['**/node_modules/**'],
  verbose = !!process.env.IMPORT_SOURCE_DEBUG,
}: PluginImportSourceOptions = {}): Plugin => {
  const globOptions = { dot: true };
  let resolver: ResolverFactory;

  return {
    name: 'plugin-import-source',

    configResolved(config: ResolvedConfig) {
      // Get Vite's conditions and prepend 'source'.
      const viteConditions = config.resolve.conditions ?? [];
      const conditionNames = ['source', ...viteConditions];

      verbose && console.log(`[plugin-import-source] Using conditions: ${conditionNames.join(', ')}`);

      // Create resolver with 'source' prepended to Vite's conditions.
      resolver = new ResolverFactory({ conditionNames });
    },

    resolveId: {
      order: 'pre',
      async handler(source, importer) {
        // Check if source looks like an npm package name or subpath export.
        if (!source.match(/^[a-zA-Z@][a-zA-Z0-9._-]*(\/[a-zA-Z0-9._-]+)*$/)) {
          return null;
        }

        try {
          if (!importer) {
            return null;
          }

          const resolved = await resolver.async(importer, source);

          verbose &&
            console.log({
              source,
              importer,
              resolved,
            });

          if (resolved.error || !resolved.path) {
            return null;
          }

          const resolvedPath = resolved.path;

          const match =
            include.some((pattern) => Minimatch(resolvedPath, pattern, globOptions)) &&
            !exclude.some((pattern) => Minimatch(resolvedPath, pattern, globOptions));

          verbose &&
            console.log({
              match,
              path: resolvedPath,
            });

          if (!match) {
            return null;
          }

          this.addWatchFile(resolvedPath);
          verbose && console.log(`${source} -> ${resolvedPath}`);
          return resolvedPath;
        } catch (error) {
          verbose && console.error(error);
          return null;
        }
      },
    },
  };
};

export default PluginImportSource;
export type { PluginImportSourceOptions };
