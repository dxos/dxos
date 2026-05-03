//
// Copyright 2026 DXOS.org
//

// On-disk symbol cache.
//
// Cache key: a content hash over the list of (package path, src/ tree mtime).
// On load: if the recomputed key matches the saved key, the cache is reusable.
// On any mismatch (file added/removed/edited), the cache is invalidated and
// the indexer falls back to a fresh ts-morph extraction.
//
// We deliberately don't track every individual file — just per-package src/
// directory mtimes — because that's what changes when a developer edits code,
// and walking deep mtimes for every symbol would be more expensive than the
// extraction we're trying to cache.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { PackageSymbols } from './symbols';

// All warnings go to stderr — stdout is reserved for the MCP JSON-RPC stream
// when this module runs inside the MCP server process.
const warn = (msg: string, err?: unknown): void => {
  console.error(err ? `[introspect cache] ${msg}: ${String(err)}` : `[introspect cache] ${msg}`);
};

export type CachePackageEntry = {
  /** Package path relative to monorepo root. */
  path: string;
  /** Most-recent mtime (ms) found under <path>/src/, or 0 if no src/. */
  srcMtime: number;
};

export type CacheFile = {
  /** Schema version — bump when CacheFile / extracted symbol shape changes. */
  version: number;
  /** Hash of the package list — recomputed on load to detect changes. */
  hash: string;
  /** Per-package entries used to compute the hash; kept for debug visibility. */
  packages: CachePackageEntry[];
  /** Extracted symbols per package, keyed by package name. */
  symbols: Record<string, PackageSymbols>;
};

const CACHE_VERSION = 1;
const DEFAULT_CACHE_PATH = '.dxos-introspect/cache.json';

export type CacheKey = {
  hash: string;
  packages: CachePackageEntry[];
};

export const cacheFilePath = (monorepoRoot: string): string => join(monorepoRoot, DEFAULT_CACHE_PATH);

/**
 * Build a cache key from the current state of the package list. Walks each
 * package's `src/` directory once to find the most-recent mtime; combines
 * them into a stable hash.
 */
export const computeCacheKey = (monorepoRoot: string, packagePaths: string[]): CacheKey => {
  const entries: CachePackageEntry[] = [];
  for (const path of [...packagePaths].sort()) {
    const srcDir = join(monorepoRoot, path, 'src');
    let srcMtime = 0;
    if (existsSync(srcDir)) {
      try {
        srcMtime = walkMaxMtime(srcDir);
      } catch (err) {
        warn(`mtime walk failed for ${path}`, err);
      }
    }
    entries.push({ path, srcMtime });
  }
  const hash = createHash('sha256');
  for (const entry of entries) {
    hash.update(`${entry.path}\0${entry.srcMtime}\n`);
  }
  return { hash: hash.digest('hex'), packages: entries };
};

const walkMaxMtime = (dir: string): number => {
  // Recursive; ignores common build/test artifacts.
  let max = 0;
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const name of readdirSync(current)) {
        if (name === 'node_modules' || name === 'dist' || name === 'build' || name === '__fixtures__') {
          continue;
        }
        stack.push(join(current, name));
      }
    } else if (stat.mtimeMs > max) {
      max = stat.mtimeMs;
    }
  }
  return max;
};

/**
 * Load the cache if it exists and the key matches. Returns null on miss
 * (no file, parse error, key mismatch, or version mismatch).
 */
export const loadCache = async (cachePath: string, expectedKey: CacheKey): Promise<CacheFile | null> => {
  if (!existsSync(cachePath)) {
    return null;
  }
  try {
    const content = await readFile(cachePath, 'utf8');
    const parsed = JSON.parse(content) as CacheFile;
    if (parsed.version !== CACHE_VERSION) {
      warn(`version mismatch (saved=${parsed.version} expected=${CACHE_VERSION}) — re-indexing`);
      return null;
    }
    if (parsed.hash !== expectedKey.hash) {
      warn('hash mismatch — re-indexing');
      return null;
    }
    return parsed;
  } catch (err) {
    warn('load failed — re-indexing', err);
    return null;
  }
};

/**
 * Persist the cache. Errors are logged and swallowed — caching is a
 * performance optimization, never a correctness requirement.
 */
export const saveCache = async (
  cachePath: string,
  key: CacheKey,
  symbols: Record<string, PackageSymbols>,
): Promise<void> => {
  try {
    await mkdir(dirname(cachePath), { recursive: true });
    const file: CacheFile = {
      version: CACHE_VERSION,
      hash: key.hash,
      packages: key.packages,
      symbols,
    };
    await writeFile(cachePath, JSON.stringify(file), 'utf8');
  } catch (err) {
    warn('save failed', err);
  }
};
