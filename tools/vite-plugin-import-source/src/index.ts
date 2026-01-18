//
// Copyright 2025 DXOS.org
//

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import Minimatch from 'minimatch';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin } from 'vite';

/**
 * Condition map for platform-specific source files.
 */
interface ConditionMap {
  default?: string;
  node?: string;
  browser?: string;
  workerd?: string;
}

/**
 * sourceExports field in package.json.
 */
type SourceExports = Record<string, ConditionMap>;

/**
 * Platform type for condition resolution.
 */
type Platform = 'node' | 'browser' | 'workerd';

/**
 * Resolves a condition map to a specific file path based on platform.
 * Follows fallback rules:
 * - workerd -> browser -> default
 * - browser -> default
 * - node -> default
 */
const resolveCondition = (conditionMap: ConditionMap, platform: Platform): string | undefined => {
  switch (platform) {
    case 'workerd':
      return conditionMap.workerd ?? conditionMap.browser ?? conditionMap.default;
    case 'browser':
      return conditionMap.browser ?? conditionMap.default;
    case 'node':
      return conditionMap.node ?? conditionMap.default;
    default:
      return conditionMap.default;
  }
};

/**
 * Finds package.json by walking up the directory tree.
 */
const findPackageJson = (startDir: string): string | undefined => {
  let dir = startDir;
  while (dir !== '/') {
    const packageJsonPath = join(dir, 'package.json');
    try {
      readFileSync(packageJsonPath);
      return packageJsonPath;
    } catch {
      dir = dirname(dir);
    }
  }
  return undefined;
};

/**
 * Cache for package.json contents.
 */
const packageJsonCache = new Map<string, { sourceExports?: SourceExports; exports?: Record<string, unknown> }>();

/**
 * Reads and caches package.json.
 */
const getPackageJson = (packageJsonPath: string): { sourceExports?: SourceExports; exports?: Record<string, unknown> } => {
  const cached = packageJsonCache.get(packageJsonPath);
  if (cached) {
    return cached;
  }

  try {
    const content = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const result = {
      sourceExports: content.sourceExports as SourceExports | undefined,
      exports: content.exports as Record<string, unknown> | undefined,
    };
    packageJsonCache.set(packageJsonPath, result);
    return result;
  } catch {
    return {};
  }
};

/**
 * Resolves source path from sourceExports.
 */
const resolveFromSourceExports = (
  sourceExports: SourceExports,
  subpath: string,
  platform: Platform,
  packageDir: string,
): string | undefined => {
  const conditionMap = sourceExports[subpath];
  if (!conditionMap) {
    return undefined;
  }

  const resolved = resolveCondition(conditionMap, platform);
  if (!resolved) {
    return undefined;
  }

  return resolve(packageDir, resolved);
};

/**
 * Extracts source path from old "source" condition in exports.
 */
const resolveFromLegacyExports = (
  exports: Record<string, unknown>,
  subpath: string,
  packageDir: string,
): string | undefined => {
  const exportEntry = exports[subpath];

  if (!exportEntry || typeof exportEntry !== 'object') {
    return undefined;
  }

  const entry = exportEntry as Record<string, unknown>;
  const sourcePath = entry.source;

  if (typeof sourcePath !== 'string') {
    return undefined;
  }

  return resolve(packageDir, sourcePath);
};

// Create resolver for fallback (old behavior).
const legacyResolver = new ResolverFactory({
  conditionNames: ['source'],
});

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

  return {
    name: 'plugin-import-source',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        // Check if source looks like an npm package name or subpath export.
        if (!source.match(/^[a-zA-Z@][a-zA-Z0-9._-]*(\/[a-zA-Z0-9._-]+)*$/)) {
          return null; // Skip to next resolver.
        }

        try {
          if (!importer) {
            return null;
          }

          // Parse package name and subpath from source.
          const parts = source.startsWith('@') ? source.split('/').slice(0, 2) : [source.split('/')[0]];
          const packageName = parts.join('/');
          const subpathRest = source.slice(packageName.length);
          const subpath = subpathRest ? `.${subpathRest}` : '.';

          // Try to find the package directory by resolving the package.json.
          const importerDir = dirname(importer);

          // Find package.json using oxc-resolver for the package.
          const legacyResolved = await legacyResolver.async(importerDir, source);
          if (legacyResolved.error || !legacyResolved.path) {
            return null;
          }

          // Find the package.json for the resolved path.
          const resolvedDir = dirname(legacyResolved.path);
          const packageJsonPath = findPackageJson(resolvedDir);
          if (!packageJsonPath) {
            return null;
          }

          const packageDir = dirname(packageJsonPath);
          const { sourceExports, exports } = getPackageJson(packageJsonPath);

          let resolvedPath: string | undefined;

          // Try sourceExports first (new method).
          if (sourceExports) {
            resolvedPath = resolveFromSourceExports(sourceExports, subpath, platform, packageDir);
            verbose && console.log(`[sourceExports] ${source} subpath=${subpath} -> ${resolvedPath}`);
          }

          // Fall back to legacy "source" condition in exports.
          if (!resolvedPath && exports) {
            resolvedPath = resolveFromLegacyExports(exports, subpath, packageDir);
            verbose && console.log(`[legacy exports.source] ${source} subpath=${subpath} -> ${resolvedPath}`);
          }

          // Final fallback: use the legacy resolver result.
          if (!resolvedPath) {
            resolvedPath = legacyResolved.path;
            verbose && console.log(`[legacy resolver] ${source} -> ${resolvedPath}`);
          }

          if (!resolvedPath) {
            return null;
          }

          const match =
            include.some((pattern) => Minimatch(resolvedPath!, pattern, globOptions)) &&
            !exclude.some((pattern) => Minimatch(resolvedPath!, pattern, globOptions));

          verbose &&
            console.log({
              match,
              path: resolvedPath,
              include: include.map((pattern) => [pattern, Minimatch(resolvedPath!, pattern, globOptions)]),
              exclude: exclude.map((pattern) => [pattern, Minimatch(resolvedPath!, pattern, globOptions)]),
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
