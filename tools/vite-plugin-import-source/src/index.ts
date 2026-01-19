//
// Copyright 2025 DXOS.org
//

import Minimatch from 'minimatch';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin } from 'vite';

/**
 * Platform type for condition resolution.
 */
type Platform = 'node' | 'browser' | 'workerd';

/**
 * Returns the condition names for a given platform, with 'source' first.
 * This allows the resolver to handle both flat and nested source conditions natively.
 *
 * Condition order (source first, then platform-specific):
 * - browser: ['source', 'browser', 'default']
 * - node: ['source', 'node', 'default']
 * - workerd: ['source', 'workerd', 'browser', 'default']
 */
const getConditionNames = (platform: Platform): string[] => {
  switch (platform) {
    case 'workerd':
      return ['source', 'workerd', 'browser', 'default'];
    case 'browser':
      return ['source', 'browser', 'default'];
    case 'node':
      return ['source', 'node', 'default'];
    default:
      return ['source', 'default'];
  }
};

interface PluginImportSourceOptions {
  include?: string[];
  exclude?: string[];
  verbose?: boolean;
  /**
   * Platform for condition resolution.
   * Defaults to 'browser'.
   */
  platform?: Platform;
}

const PluginImportSource = ({
  include = ['**'],
  exclude = ['**/node_modules/**'],
  verbose = !!process.env.IMPORT_SOURCE_DEBUG,
  platform = 'browser',
}: PluginImportSourceOptions = {}): Plugin => {
  const globOptions = { dot: true };

  // Create resolver with 'source' condition first, followed by platform conditions.
  // This handles both flat ("source": "./src/index.ts") and nested
  // ("source": { "browser": "...", "node": "...", "default": "..." }) formats.
  const conditionNames = getConditionNames(platform);
  const resolver = new ResolverFactory({ conditionNames });

  verbose && console.log(`[plugin-import-source] Using conditions: ${conditionNames.join(', ')}`);

  return {
    name: 'plugin-import-source',
    resolveId: {
      order: 'pre',
      async handler(source, importer) {
        // Check if source looks like an npm package name or subpath export.
        if (!source.match(/^[a-zA-Z@][a-zA-Z0-9._-]*(\/[a-zA-Z0-9._-]+)*$/)) {
          return null; // Skip to next resolver.
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
              include: include.map((pattern) => [pattern, Minimatch(resolvedPath, pattern, globOptions)]),
              exclude: exclude.map((pattern) => [pattern, Minimatch(resolvedPath, pattern, globOptions)]),
            });

          if (!match) {
            return null;
          }

          this.addWatchFile(resolvedPath);
          verbose && console.log(`${source} -> ${resolvedPath}`);
          return resolvedPath;
        } catch (error) {
          verbose && console.error(error);
          // If resolution fails, return null to skip to next resolver.
          return null;
        }
      },
    },
  };
};

export default PluginImportSource;
export type { PluginImportSourceOptions };
