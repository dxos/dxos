//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { normalizeFsPath, packageNameFromSpecifier } from './matcher.ts';

type ConditionalEntry = string | { readonly [condition: string]: ConditionalEntry };

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs', '.cjs'] as const;

const readJsonFile = <T>(filePath: string): T | null => {
  try {
    // Boundary: package.json contents are untyped JSON; callers pass the expected shape.
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
};

/**
 * Resolve a conditional export/import entry against the given conditions, following
 * nested condition maps and falling back to `default`/`import`. Returns `null` when no
 * branch applies so callers can try other resolution strategies.
 */
const tryResolveConditionalEntry = (entry: ConditionalEntry, conditions: readonly string[]): string | null => {
  if (typeof entry === 'string') {
    return entry;
  }
  for (const condition of conditions) {
    const value = entry[condition];
    if (value !== undefined) {
      return tryResolveConditionalEntry(value, conditions);
    }
  }
  const fallback = entry.default ?? entry.import;
  if (fallback !== undefined) {
    return tryResolveConditionalEntry(fallback, conditions);
  }
  return null;
};

/**
 * Collapse pnpm symlinks so the same physical module reached through different
 * virtual-store paths resolves to one canonical key. Without this the crawl parses
 * shared `@dxos/*` dependencies once per consumer and explodes combinatorially.
 */
const canonicalize = (filePath: string): string => {
  try {
    return fs.realpathSync.native(filePath);
  } catch {
    return normalizeFsPath(filePath);
  }
};

const tryResolveFile = (candidate: string): string | null => {
  const normalizedCandidate = normalizeFsPath(candidate);
  try {
    const stat = fs.statSync(normalizedCandidate);
    if (stat.isFile()) {
      return canonicalize(normalizedCandidate);
    }
    if (stat.isDirectory()) {
      for (const extension of SOURCE_EXTENSIONS) {
        const indexFile = path.join(normalizedCandidate, `index${extension}`);
        if (fs.existsSync(indexFile)) {
          return canonicalize(indexFile);
        }
      }
    }
  } catch {
    // Fall through to extension probing.
  }

  for (const extension of SOURCE_EXTENSIONS) {
    const withExtension = `${normalizedCandidate}${extension}`;
    if (fs.existsSync(withExtension)) {
      return canonicalize(withExtension);
    }
  }
  return null;
};

const findOwningPackageRoot = (fromFile: string): string | null => {
  let directory = path.dirname(fromFile);
  while (true) {
    const packageJsonPath = path.join(directory, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return null;
    }
    directory = parent;
  }
};

const findInstalledPackageRoot = (fromFile: string, packageName: string): string | null => {
  let directory = path.dirname(fromFile);
  while (true) {
    const packageRoot = path.join(directory, 'node_modules', packageName);
    if (fs.existsSync(path.join(packageRoot, 'package.json'))) {
      return packageRoot;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return null;
    }
    directory = parent;
  }
};

const splitPackageSpecifier = (specifier: string): { packageName: string; subpath: string } => {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    if (parts.length >= 2) {
      const packageName = `${parts[0]}/${parts[1]}`;
      const rest = parts.slice(2).join('/');
      return { packageName, subpath: rest.length > 0 ? `./${rest}` : '.' };
    }
  }
  const slashIndex = specifier.indexOf('/');
  if (slashIndex === -1) {
    return { packageName: specifier, subpath: '.' };
  }
  return {
    packageName: specifier.slice(0, slashIndex),
    subpath: `./${specifier.slice(slashIndex + 1)}`,
  };
};

const lookupConditionalMap = (
  map: Record<string, ConditionalEntry> | undefined,
  subpath: string,
): ConditionalEntry | undefined => {
  if (!map) {
    return undefined;
  }
  if (map[subpath] !== undefined) {
    return map[subpath];
  }
  if (subpath === '.' && map['./'] !== undefined) {
    return map['./'];
  }
  if (subpath === './' && map['.'] !== undefined) {
    return map['.'];
  }
  return undefined;
};

const resolveFromPackageRoot = (
  packageRoot: string,
  subpath: string,
  field: 'exports' | 'imports',
  conditions: readonly string[],
): string | null => {
  const packageJson = readJsonFile<{
    exports?: Record<string, ConditionalEntry>;
    imports?: Record<string, ConditionalEntry>;
    main?: string;
    module?: string;
  }>(path.join(packageRoot, 'package.json'));
  if (!packageJson) {
    return null;
  }

  const map = field === 'exports' ? packageJson.exports : packageJson.imports;
  const entry = lookupConditionalMap(map, subpath);
  if (entry !== undefined) {
    const relativePath = tryResolveConditionalEntry(entry, conditions);
    if (!relativePath) {
      return null;
    }
    return tryResolveFile(path.resolve(packageRoot, relativePath));
  }

  if (field === 'exports' && subpath === '.') {
    const fallback = packageJson.module ?? packageJson.main;
    if (fallback) {
      return tryResolveFile(path.resolve(packageRoot, fallback));
    }
  }

  if (field === 'exports' && subpath.startsWith('./')) {
    return tryResolveFile(path.resolve(packageRoot, subpath));
  }

  return null;
};

export type ImportResolver = {
  resolve(fromFile: string, specifier: string): string | null;
};

/**
 * Resolve authored import specifiers to absolute files, including package.json
 * `imports`, conditional `exports`, and workspace/node_modules installs.
 */
export const createImportResolver = (conditions: readonly string[]): ImportResolver => {
  const packageRootCache = new Map<string, string | null>();
  const installedPackageCache = new Map<string, string | null>();

  const owningPackageRoot = (fromFile: string): string | null => {
    const cached = packageRootCache.get(fromFile);
    if (cached !== undefined) {
      return cached;
    }
    const resolved = findOwningPackageRoot(fromFile);
    packageRootCache.set(fromFile, resolved);
    return resolved;
  };

  const installedPackageRoot = (fromFile: string, packageName: string): string | null => {
    const cacheKey = `${fromFile}\0${packageName}`;
    const cached = installedPackageCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const resolved = findInstalledPackageRoot(fromFile, packageName);
    installedPackageCache.set(cacheKey, resolved);
    return resolved;
  };

  const resolve = (fromFile: string, specifier: string): string | null => {
    if (specifier.startsWith('node:') || specifier.startsWith('cloudflare:')) {
      return null;
    }

    if (specifier.startsWith('#')) {
      const packageRoot = owningPackageRoot(fromFile);
      if (!packageRoot) {
        return null;
      }
      return resolveFromPackageRoot(packageRoot, specifier, 'imports', conditions);
    }

    if (specifier.startsWith('.')) {
      return tryResolveFile(path.resolve(path.dirname(fromFile), specifier));
    }

    if (specifier.startsWith('/')) {
      return tryResolveFile(specifier);
    }

    const { packageName, subpath } = splitPackageSpecifier(specifier);
    if (!packageNameFromSpecifier(packageName)) {
      return null;
    }

    const packageRoot = installedPackageRoot(fromFile, packageName);
    if (!packageRoot) {
      return null;
    }

    const resolved = resolveFromPackageRoot(packageRoot, subpath, 'exports', conditions);
    if (resolved) {
      return resolved;
    }

    if (subpath !== '.') {
      return tryResolveFile(path.join(packageRoot, subpath.slice(2)));
    }

    return null;
  };

  return { resolve };
};

/**
 * Resolve a package export subpath (e.g. `./plugin`) to a source file using conditional exports.
 */
export const resolvePackageExport = (
  absWorkingDir: string,
  exportSubpath: string,
  conditions: readonly string[],
): string => {
  const resolved = resolveFromPackageRoot(absWorkingDir, exportSubpath, 'exports', conditions);
  if (!resolved) {
    throw new Error(`Export "${exportSubpath}" could not be resolved in ${path.join(absWorkingDir, 'package.json')}.`);
  }
  return resolved;
};
