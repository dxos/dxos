//
// Copyright 2023 DXOS.org
//

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Platform, type Plugin } from 'esbuild';

export type BundleDepsPluginOptions = {
  /**
   * List of packages to bundle.
   */
  packages: string[];

  /**
   * List of packages to ignore.
   */
  ignore?: string[];

  /**
   * Aliases. Mimics https://esbuild.github.io/api/#alias.
   */
  alias?: Record<string, string>;

  packageDir: string;
};

/**
 * Result of resolving a subpath import.
 */
interface SubpathResolution {
  /** Resolved file path (for relative imports). */
  path?: string;
  /** External package name (for package imports). */
  external?: string;
}

/**
 * Resolves a `#` import (subpath import) using the package.json imports field.
 * Follows the Node.js resolution algorithm for conditional exports.
 */
const resolveSubpathImport = (
  importPath: string,
  imports: Record<string, any>,
  platform: Platform,
  packageDir: string,
): SubpathResolution | null => {
  const importSpec = imports[importPath];
  if (!importSpec) {
    return null;
  }

  // Helper to resolve a condition object.
  const resolveCondition = (spec: any): SubpathResolution | null => {
    if (typeof spec === 'string') {
      // Check if it's a relative path or an external package.
      if (spec.startsWith('./') || spec.startsWith('../')) {
        return { path: join(packageDir, spec) };
      }
      // It's an external package reference.
      return { external: spec };
    }
    if (typeof spec !== 'object' || spec === null) {
      return null;
    }

    // Check for source condition first (for development/build time resolution).
    if (spec.source) {
      const sourceResolved = resolveCondition(spec.source);
      if (sourceResolved) {
        return sourceResolved;
      }
    }

    // Platform-specific conditions.
    if (platform === 'browser' && spec.browser) {
      return resolveCondition(spec.browser);
    }
    if (platform === 'node' && spec.node) {
      return resolveCondition(spec.node);
    }

    // Default fallbacks.
    if (spec.default) {
      return resolveCondition(spec.default);
    }
    if (spec.import) {
      return resolveCondition(spec.import);
    }

    return null;
  };

  return resolveCondition(importSpec);
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
      ...Object.keys(packageJson.optionalDependencies ?? {}),
    ]);
    const platform = build.initialOptions.platform ?? 'browser';

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

      // Resolve subpath imports (#) using package.json imports field.
      if (args.path.startsWith('#')) {
        if (packageJson.imports) {
          const resolved = resolveSubpathImport(args.path, packageJson.imports, platform, options.packageDir);
          if (resolved) {
            if (resolved.path) {
              return { path: resolved.path };
            }
            if (resolved.external) {
              return { external: true, path: resolved.external };
            }
          }
        }
        // If no resolution found, keep as external (for vendor files etc.).
        return { external: true, path: args.path };
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

      // Check alias again for module aliases.
      if (options.alias?.[moduleName]) {
        return build.resolve(options.alias[moduleName] + args.path.slice(moduleName.length), {
          importer: args.importer,
          kind: args.kind,
          namespace: args.namespace,
          resolveDir: options.packageDir,
        });
      }

      if (options.packages.includes(moduleName)) {
        return null; // Bundle this dependency.
      }

      if (!runtimeDeps.has(moduleName) && !options.ignore?.includes(moduleName)) {
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
