//
// Copyright 2025 DXOS.org
//

/**
 * Types and utilities for sourceExports and sourceImports.
 *
 * sourceExports is the source-of-truth for source-mode entrypoints.
 * It replaces the old "source" condition inside package.json exports.
 */

/**
 * Condition map for platform-specific source files.
 * Fallback rules:
 * - workerd -> browser -> default
 * - browser -> default
 * - node -> default
 */
export interface ConditionMap {
  default?: string;
  node?: string;
  browser?: string;
  workerd?: string;
}

/**
 * sourceExports field in package.json.
 * Keys are export subpaths: ".", "./util", etc.
 * Values are condition maps.
 */
export type SourceExports = Record<string, ConditionMap>;

/**
 * sourceImports field in package.json.
 * Keys must start with # (hard error otherwise).
 * Values are condition maps.
 */
export type SourceImports = Record<string, ConditionMap>;

/**
 * Platform type for condition resolution.
 */
export type Platform = 'node' | 'browser' | 'workerd';

/**
 * Resolves a condition map to a specific file path based on platform.
 * Follows fallback rules:
 * - workerd -> browser -> default
 * - browser -> default
 * - node -> default
 */
export const resolveCondition = (conditionMap: ConditionMap, platform: Platform): string | undefined => {
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
 * Extracts unique entrypoints from sourceExports for all platforms.
 * Returns an array of unique source file paths.
 */
export const getEntrypointsFromSourceExports = (sourceExports: SourceExports): string[] => {
  const entrypoints = new Set<string>();

  for (const subpath of Object.keys(sourceExports)) {
    const conditionMap = sourceExports[subpath];
    for (const condition of Object.values(conditionMap)) {
      if (condition) {
        entrypoints.add(condition);
      }
    }
  }

  return Array.from(entrypoints);
};

/**
 * Extracts entrypoints from sourceExports for a specific platform.
 * Uses fallback rules to resolve each subpath.
 */
export const getEntrypointsForPlatform = (sourceExports: SourceExports, platform: Platform): string[] => {
  const entrypoints = new Set<string>();

  for (const subpath of Object.keys(sourceExports)) {
    const resolved = resolveCondition(sourceExports[subpath], platform);
    if (resolved) {
      entrypoints.add(resolved);
    }
  }

  return Array.from(entrypoints);
};

/**
 * Validates sourceImports keys - all keys must start with #.
 * Returns an array of invalid keys, or empty array if all valid.
 */
export const validateSourceImportsKeys = (sourceImports: SourceImports): string[] => {
  const invalidKeys: string[] = [];

  for (const key of Object.keys(sourceImports)) {
    if (!key.startsWith('#')) {
      invalidKeys.push(key);
    }
  }

  return invalidKeys;
};

/**
 * Generates runtime exports object from sourceExports.
 * Maps source files to their dist equivalents based on platform and format.
 *
 * @param sourceExports - The sourceExports from package.json.
 * @param distLayout - Configuration for dist path generation.
 */
export interface DistLayout {
  browser: { dir: string; ext: string };
  node: { dir: string; ext: string };
  nodeEsm: { dir: string; ext: string };
  workerd: { dir: string; ext: string };
  types: { dir: string; ext: string };
}

const DEFAULT_DIST_LAYOUT: DistLayout = {
  browser: { dir: 'dist/lib/browser', ext: '.mjs' },
  node: { dir: 'dist/lib/node', ext: '.cjs' },
  nodeEsm: { dir: 'dist/lib/node-esm', ext: '.mjs' },
  workerd: { dir: 'dist/lib/workerd', ext: '.mjs' },
  types: { dir: 'dist/types', ext: '.d.ts' },
};

/**
 * Converts a source path to a dist path.
 * e.g., "./src/index.ts" -> "./dist/lib/browser/index.mjs"
 */
export const sourcePathToDist = (sourcePath: string, dir: string, ext: string): string => {
  // Remove ./ prefix if present.
  const normalized = sourcePath.startsWith('./') ? sourcePath.slice(2) : sourcePath;

  // Replace src/ with the dist directory and change extension.
  const withoutExt = normalized.replace(/\.[tj]sx?$/, '');
  return `./${dir}/${withoutExt.replace(/^src\//, '')}${ext}`;
};

/**
 * Generates runtime exports from sourceExports.
 * Preserves the subpath structure but maps source paths to dist paths.
 */
export const generateRuntimeExports = (
  sourceExports: SourceExports,
  platforms: Platform[] = ['browser', 'node'],
  distLayout: DistLayout = DEFAULT_DIST_LAYOUT,
): Record<string, Record<string, string | Record<string, string>>> => {
  const exports: Record<string, Record<string, string | Record<string, string>>> = {};

  for (const [subpath, conditionMap] of Object.entries(sourceExports)) {
    const exportEntry: Record<string, string | Record<string, string>> = {};

    // Add types first (always).
    if (conditionMap.default) {
      exportEntry.types = sourcePathToDist(conditionMap.default, distLayout.types.dir, distLayout.types.ext);
    }

    // Add browser condition if browser platform is targeted.
    if (platforms.includes('browser')) {
      const browserSource = conditionMap.browser ?? conditionMap.default;
      if (browserSource) {
        exportEntry.browser = sourcePathToDist(browserSource, distLayout.browser.dir, distLayout.browser.ext);
      }
    }

    // Add node condition if node platform is targeted.
    if (platforms.includes('node')) {
      const nodeSource = conditionMap.node ?? conditionMap.default;
      if (nodeSource) {
        exportEntry.node = sourcePathToDist(nodeSource, distLayout.nodeEsm.dir, distLayout.nodeEsm.ext);
      }
    }

    // Add workerd condition if workerd platform is targeted.
    if (platforms.includes('workerd')) {
      const workerdSource = conditionMap.workerd ?? conditionMap.browser ?? conditionMap.default;
      if (workerdSource) {
        exportEntry.workerd = sourcePathToDist(workerdSource, distLayout.workerd.dir, distLayout.workerd.ext);
      }
    }

    exports[subpath] = exportEntry;
  }

  return exports;
};

/**
 * Generates runtime imports from sourceImports.
 * For external specifiers (not starting with ./), keeps them as-is.
 * For local source files, maps to dist paths.
 */
export const generateRuntimeImports = (
  sourceImports: SourceImports,
  platforms: Platform[] = ['browser', 'node'],
  distLayout: DistLayout = DEFAULT_DIST_LAYOUT,
): Record<string, Record<string, string>> => {
  const imports: Record<string, Record<string, string>> = {};

  for (const [key, conditionMap] of Object.entries(sourceImports)) {
    const importEntry: Record<string, string> = {};

    for (const [condition, target] of Object.entries(conditionMap)) {
      if (!target) {
        continue;
      }

      // Check if target is a local source file.
      const isLocalSource = target.startsWith('./') && (target.includes('/src/') || target.startsWith('./src/'));

      if (isLocalSource) {
        // Map to dist path based on condition.
        let layout: { dir: string; ext: string };
        switch (condition) {
          case 'browser':
            layout = distLayout.browser;
            break;
          case 'node':
            layout = distLayout.nodeEsm;
            break;
          case 'workerd':
            layout = distLayout.workerd;
            break;
          default:
            layout = distLayout.browser; // Default to browser.
        }
        importEntry[condition] = sourcePathToDist(target, layout.dir, layout.ext);
      } else {
        // External specifier - keep as-is.
        importEntry[condition] = target;
      }
    }

    imports[key] = importEntry;
  }

  return imports;
};
