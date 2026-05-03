//
// Copyright 2026 DXOS.org
//

// On-disk symbol cache.
//
// Per-package keying: the cache stores a (path, srcMtime) tuple alongside the
// extracted symbols for every package. On load, we keep entries whose
// (path, srcMtime) pair still matches the live filesystem and discard the
// rest. Editing one package only invalidates that package's entry; everything
// else is reused.
//
// We deliberately don't track every individual file — just per-package src/
// directory mtimes — because that's what changes when a developer edits code,
// and walking deep mtimes for every symbol would be more expensive than the
// extraction we're trying to cache.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pid } from 'node:process';

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

export type CacheEntry = {
  /** Most-recent mtime (ms) under the package's src/. */
  srcMtime: number;
  /** Package path relative to monorepo root, kept for debug visibility. */
  path: string;
  /** Extracted symbols. */
  symbols: PackageSymbols;
};

export type CacheFile = {
  /** Schema version — bump when CacheFile / extracted symbol shape changes. */
  version: number;
  /** Per-package entries keyed by package name. */
  entries: Record<string, CacheEntry>;
};

const CACHE_VERSION = 2;
// node_modules/.cache/<tool> is the standard convention for build-tool caches
// (babel, swc, eslint, vite all live here). Pros: auto-gitignored, easy to
// nuke via `pnpm clean`/`rm -rf node_modules`, lives next to the deps the
// cache indexes. Cons: a fresh `pnpm install` wipes it (rebuild ~80s once).
const DEFAULT_CACHE_PATH = 'node_modules/.cache/dxos-introspect/cache.json';

export const cacheFilePath = (monorepoRoot: string): string => join(monorepoRoot, DEFAULT_CACHE_PATH);

/**
 * Compute the current src/ mtime for every package. Used both to build the
 * cache and to decide which cached entries are still valid.
 */
export const computePackageMtimes = (
  monorepoRoot: string,
  packagePaths: string[],
): Record<string, CachePackageEntry> => {
  const entries: Record<string, CachePackageEntry> = {};
  for (const path of packagePaths) {
    const srcDir = join(monorepoRoot, path, 'src');
    let srcMtime = 0;
    if (existsSync(srcDir)) {
      try {
        srcMtime = walkMaxMtime(srcDir);
      } catch (err) {
        warn(`mtime walk failed for ${path}`, err);
      }
    }
    entries[path] = { path, srcMtime };
  }
  return entries;
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

export type LoadedCache = {
  /** Symbols by package name, populated only for entries whose mtime still matches. */
  symbols: Record<string, PackageSymbols>;
  /** Number of entries that were valid (subset of file's total). */
  validCount: number;
  /** Number of entries that were stale (mtime mismatch) and discarded. */
  staleCount: number;
};

/**
 * Load the cache file and return only those entries whose (path, srcMtime)
 * still matches the live filesystem. Stale entries are silently dropped — the
 * caller will re-extract them. Returns null if the file doesn't exist or is
 * unparseable.
 */
export const loadCache = async (
  cachePath: string,
  liveMtimes: Record<string, CachePackageEntry>,
  packageNamesByPath: Record<string, string>,
): Promise<LoadedCache | null> => {
  if (!existsSync(cachePath)) {
    return null;
  }
  let parsed: CacheFile;
  try {
    const content = await readFile(cachePath, 'utf8');
    parsed = JSON.parse(content) as CacheFile;
  } catch (err) {
    warn('load failed — re-indexing', err);
    return null;
  }
  if (parsed.version !== CACHE_VERSION) {
    warn(`version mismatch (saved=${parsed.version} expected=${CACHE_VERSION}) — re-indexing`);
    return null;
  }
  const symbols: Record<string, PackageSymbols> = {};
  let valid = 0;
  let stale = 0;
  for (const [path, live] of Object.entries(liveMtimes)) {
    const name = packageNamesByPath[path];
    if (!name) {
      continue;
    }
    const cached = parsed.entries?.[name];
    if (cached && cached.srcMtime === live.srcMtime && cached.path === path) {
      symbols[name] = cached.symbols;
      valid++;
    } else if (cached) {
      stale++;
    }
  }
  return { symbols, validCount: valid, staleCount: stale };
};

/**
 * Persist the cache. Writes to a per-process temp file then atomically
 * renames into place — readers never see a half-written file even if
 * multiple introspector processes (Inspector, Claude Code, Claude Desktop)
 * race to rebuild the cache.
 *
 * Errors are logged and swallowed — caching is a performance optimization,
 * never a correctness requirement.
 */
export const saveCache = async (
  cachePath: string,
  liveMtimes: Record<string, CachePackageEntry>,
  packageNamesByPath: Record<string, string>,
  symbolsByName: Record<string, PackageSymbols>,
): Promise<void> => {
  const tmpPath = `${cachePath}.${pid}.tmp`;
  try {
    const entries: Record<string, CacheEntry> = {};
    for (const [name, syms] of Object.entries(symbolsByName)) {
      // Reverse-look up the path for this package so the entry can be
      // independently validated on next load.
      const path = Object.keys(packageNamesByPath).find((p) => packageNamesByPath[p] === name);
      if (!path) {
        continue;
      }
      const live = liveMtimes[path];
      if (!live) {
        continue;
      }
      entries[name] = { path, srcMtime: live.srcMtime, symbols: syms };
    }
    await mkdir(dirname(cachePath), { recursive: true });
    const file: CacheFile = { version: CACHE_VERSION, entries };
    await writeFile(tmpPath, JSON.stringify(file), 'utf8');
    // Atomic on POSIX — readers see either the old file or the new one,
    // never a partially-written stream.
    await rename(tmpPath, cachePath);
  } catch (err) {
    warn('save failed', err);
    await unlink(tmpPath).catch(() => undefined);
  }
};
