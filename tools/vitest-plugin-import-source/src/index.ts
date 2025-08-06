import { type Plugin } from 'vite';
import { ResolverFactory } from 'oxc-resolver';
import Minimatch from 'minimatch';

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

  return {
    name: 'plugin-import-source',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        // Check if source looks like an npm package name
        if (!source.match(/^[a-zA-Z@][a-zA-Z0-9._-]*(\/[a-zA-Z0-9._-]+)*$/)) {
          return null; // Skip to next importer
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
          // If resolution fails, return null to skip to next resolver
          return null;
        }
      },
    },
  };
};

export default PluginImportSource;
export type { PluginImportSourceOptions };
