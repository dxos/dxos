//
// Copyright 2025 DXOS.org
//

import Minimatch from 'minimatch';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin } from 'vite';

const resolver = new ResolverFactory({
  conditionNames: ['source'],
});

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

  const isMatch = (filePath: string) =>
    include.some((pattern) => Minimatch(filePath, pattern, globOptions)) &&
    !exclude.some((pattern) => Minimatch(filePath, pattern, globOptions));

  return {
    name: 'plugin-import-source',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        // Check if source looks like an npm package name or a subpath import (#).
        if (!source.match(/^[a-zA-Z@#][a-zA-Z0-9._-]*(\/[a-zA-Z0-9._-]+)*$/)) {
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
          const resolvedPath = resolved.path!;
          const match = isMatch(resolvedPath);
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

    // Hook into load to add all matching files to watch list (including relative imports).
    load(id) {
      // Skip virtual modules and non-file paths.
      if (id.startsWith('\0') || !id.startsWith('/')) {
        return null;
      }

      // Strip query params (e.g., ?v=123).
      const filePath = id.split('?')[0];

      if (isMatch(filePath)) {
        this.addWatchFile(filePath);
        verbose && console.log(`[watch] ${filePath}`);
      }

      // Return null to let Vite load the file normally.
      return null;
    },
  };
};

export default PluginImportSource;
export type { PluginImportSourceOptions };
