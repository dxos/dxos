import path from 'node:path';
import { Plugin } from 'esbuild';

/**
 * ESBuild plugin that restricts relative imports to be within a specified directory.
 * Only applies to files that are already within the allowed directory.
 * @param opts.allowedDirectory - The directory path within which all relative imports must resolve.
 * @returns ESBuild plugin.
 */
export const restrictRelativeImportsPlugin = (opts: { allowedDirectory: string }): Plugin => {
  const absoluteAllowedDir = path.resolve(opts.allowedDirectory);

  return {
    name: 'restrict-relative-imports',
    setup(build) {
      build.onResolve({ filter: /^\.\.?\// }, async (args) => {
        // Get the directory of the importing file
        const importerDir = path.dirname(args.importer);

        // First check if the importer itself is within the allowed directory
        const importerRelativePath = path.relative(absoluteAllowedDir, args.importer);
        if (importerRelativePath.startsWith('..') || path.isAbsolute(importerRelativePath)) {
          // Importer is outside the allowed directory, so we don't restrict its imports
          return null;
        }

        // Resolve the imported path relative to the importer
        const resolvedPath = path.resolve(importerDir, args.path);

        // Check if the resolved path is within the allowed directory
        const relativePath = path.relative(absoluteAllowedDir, resolvedPath);

        // If the relative path starts with '..' it means it's outside the allowed directory
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
          return {
            errors: [
              {
                text: `Import "${args.path}" from "${args.importer}" resolves outside the allowed directory "${absoluteAllowedDir}"`,
              },
            ],
          };
        }

        // If the import is within the allowed directory, delegate to default resolution
        return null;
      });
    },
  };
};
