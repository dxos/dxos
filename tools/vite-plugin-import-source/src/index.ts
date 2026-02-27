//
// Copyright 2025 DXOS.org
//

import { minimatch as Minimatch } from 'minimatch';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin, type ResolvedConfig } from 'vite';

interface PluginImportSourceOptions {
  /**
   * Package patterns to include for 'source' condition resolution.
   * @default ['@dxos/**']
   */
  include?: string[];
  /**
   * Package patterns to exclude from 'source' condition resolution.
   * @default []
   */
  exclude?: string[];
  verbose?: boolean;
}

/**
 * Prefer "source" condition for specifc packages.
 */
const PluginImportSource = ({
  include = ['@dxos/**'],
  exclude = [],
  verbose = !!process.env.IMPORT_SOURCE_DEBUG,
}: PluginImportSourceOptions = {}): Plugin => {
  let resolver: ResolverFactory;

  const globOptions = { dot: true };
  const isMatch = (filePath: string) =>
    include.some((pattern) => Minimatch(filePath, pattern, globOptions)) &&
    !exclude.some((pattern) => Minimatch(filePath, pattern, globOptions));

  return {
    name: 'plugin-import-source',

    configResolved: (config: ResolvedConfig) => {
      // Get Vite's conditions and prepend 'source'.
      const viteConditions = config.resolve.conditions ?? [];
      const conditionNames = ['source', ...viteConditions];

      verbose && console.log(`[plugin-import-source] Using conditions: ${conditionNames.join(', ')}`);
      verbose && console.log(`[plugin-import-source] Include: ${include.join(', ')}`);
      verbose && console.log(`[plugin-import-source] Exclude: ${exclude.join(', ')}`);

      // Create resolver with 'source' prepended to Vite's conditions.
      resolver = new ResolverFactory({ conditionNames });
    },

    resolveId: {
      order: 'pre',
      async handler(source, importer) {
        // Check if source looks like an npm package name or a subpath import (#).
        if (!source.match(/^[a-zA-Z@#][a-zA-Z0-9._-]*(\/[a-zA-Z0-9._-]+)*$/)) {
          return null; // Skip to next resolver.
        }

        // Filter by package name pattern before resolving.
        const match =
          include.some((pattern) => Minimatch(source, pattern, { dot: true })) &&
          !exclude.some((pattern) => Minimatch(source, pattern, { dot: true }));

        if (!match) {
          verbose && console.log(`[plugin-import-source] ${source} -> excluded`);
          return null;
        }

        if (!importer) {
          return null;
        }

        try {
          const resolved = await resolver.async(importer, source);

          if (resolved.error || !resolved.path) {
            return null;
          }

          if (resolved.packageJsonPath) {
            this.addWatchFile(resolved.packageJsonPath);
          }

          this.addWatchFile(resolved.path);
          verbose && console.log(`[plugin-import-source] ${source} -> ${resolved.path}`);
          return resolved.path;
        } catch (error) {
          verbose && console.error('[plugin-import-source]', error);
          return null;
        }
      },
    },

    // Hook into load to add all matching files to watch list (including relative imports).
    load(id) {
      // Skip virtual modules and non-file paths.
      if (id.startsWith('\0') || !id.startsWith('/')) {
        return null;
      }

      // Strip query params (e.g., ?v=123).
      const filePath = id.split('?')[0];

      this.addWatchFile(filePath);
      verbose && console.log(`[watch] ${filePath}`);

      // Return null to let Vite load the file normally.
      return null;
    },
  };
};

export default PluginImportSource;
export type { PluginImportSourceOptions };
