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

import { spawnSync } from 'node:child_process';
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
  /**
   * Git tree SHA at HEAD for `<path>/src`. Empty string when:
   * - the working tree has uncommitted changes under `<path>/src`,
   * - we're not in a git checkout, or
   * - the path doesn't exist in HEAD.
   *
   * Tree SHAs are content-addressed and identical across machines for the
   * same git ref, which makes a cache built in CI reusable on any clone of
   * the same commit. The mtime field stays as a same-machine fallback for
   * uncommitted edits.
   */
  srcTreeSha: string;
};

export type CacheEntry = {
  /** Most-recent mtime (ms) under the package's src/. */
  srcMtime: number;
  /** Git tree SHA — see CachePackageEntry.srcTreeSha. */
  srcTreeSha: string;
  /** Package path relative to monorepo root, kept for debug visibility. */
  path: string;
  /** Extracted symbols. */
  symbols: PackageSymbols;
};

export type CacheFile = {
  /** Schema version — bump when CacheFile / extracted symbol shape changes. */
  version: 3;
  /** Per-package entries keyed by package name. */
  entries: Record<string, CacheEntry>;
};

const CACHE_VERSION = 3;
// node_modules/.cache/<tool> is the standard convention for build-tool caches
// (babel, swc, eslint, vite all live here). Pros: auto-gitignored, easy to
// nuke via `pnpm clean`/`rm -rf node_modules`, lives next to the deps the
// cache indexes. Cons: a fresh `pnpm install` wipes it (rebuild ~80s once).
const DEFAULT_CACHE_PATH = 'node_modules/.cache/dxos-introspect/core.json';
const DEFAULT_PLUGINS_PATH = 'node_modules/.cache/dxos-introspect/plugins.json';

export const cacheFilePath = (rootPath: string): string => join(rootPath, DEFAULT_CACHE_PATH);

/**
 * Path to the plugin metadata sidecar (`{plugins, surfaces, capabilities,
 * operations, schemas}` — the runtime output of `extractPlugins`). Lives next
 * to `core.json` but versioned and uploaded independently because plugin
 * extraction is cheap (~seconds) and changes far more often than the
 * full-monorepo symbol cache (~minutes).
 */
export const pluginsFilePath = (rootPath: string): string => join(rootPath, DEFAULT_PLUGINS_PATH);

/**
 * Compute the current src/ mtime + git tree SHA for every package. Used both
 * to build the cache and to decide which cached entries are still valid.
 *
 * Two git subprocess calls are made once for the whole repo (not per package):
 *   - `git ls-tree -r -d HEAD` resolves directory tree SHAs in bulk.
 *   - `git status --porcelain` flags any package whose `src/` has uncommitted
 *     changes, so its srcTreeSha is left empty (forces mtime fallback).
 *
 * Both calls are best-effort: if the cwd isn't a git checkout, every package
 * gets `srcTreeSha = ''` and we silently degrade to mtime-only invalidation.
 */
export const computePackageMtimes = (rootPath: string, packagePaths: string[]): Record<string, CachePackageEntry> => {
  const treeShas = readGitTreeShas(rootPath);
  const dirtyPaths = readGitDirtyPaths(rootPath);
  const entries: Record<string, CachePackageEntry> = {};
  for (const path of packagePaths) {
    const srcDir = join(rootPath, path, 'src');
    let srcMtime = 0;
    if (existsSync(srcDir)) {
      try {
        srcMtime = walkMaxMtime(srcDir);
      } catch (err) {
        warn(`mtime walk failed for ${path}`, err);
      }
    }
    const srcRel = `${path}/src`;
    // If anything under `<path>/src` is dirty, fall back to mtime invalidation.
    // The HEAD tree SHA wouldn't reflect the live contents.
    const srcTreeSha = isPathDirty(dirtyPaths, srcRel) ? '' : (treeShas.get(srcRel) ?? '');
    entries[path] = { path, srcMtime, srcTreeSha };
  }
  return entries;
};

/**
 * One subprocess call gives us every directory tree SHA in HEAD. Format per
 * line: `<mode> <type> <sha>\t<path>` (NUL-separated). We only keep `tree`
 * entries — blob SHAs are per-file and not used here.
 */
const readGitTreeShas = (monorepoRoot: string): Map<string, string> => {
  const map = new Map<string, string>();
  let result;
  try {
    result = spawnSync('git', ['ls-tree', '-r', '-d', '-z', 'HEAD'], {
      cwd: monorepoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    warn('git ls-tree failed — falling back to mtime-only invalidation', err);
    return map;
  }
  if (result.status !== 0) {
    return map; // Not a git checkout, or HEAD doesn't exist.
  }
  for (const entry of result.stdout.split('\0')) {
    const tab = entry.indexOf('\t');
    if (tab < 0) {
      continue;
    }
    const meta = entry.slice(0, tab);
    const path = entry.slice(tab + 1);
    // `<mode> <type> <sha>` — split on space (no spaces inside any field).
    const parts = meta.split(' ');
    if (parts.length !== 3 || parts[1] !== 'tree') {
      continue;
    }
    map.set(path, parts[2]);
  }
  return map;
};

/**
 * Set of repo-relative paths that have uncommitted changes. Used to flag
 * packages whose src/ tree SHA can't be trusted.
 */
const readGitDirtyPaths = (monorepoRoot: string): Set<string> => {
  const dirty = new Set<string>();
  let result;
  try {
    result = spawnSync('git', ['status', '--porcelain', '-z'], {
      cwd: monorepoRoot,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return dirty;
  }
  if (result.status !== 0) {
    return dirty;
  }
  for (const record of result.stdout.split('\0')) {
    if (record.length < 4) {
      continue;
    }
    // Two-byte status, one space, then the path. Renames (`R `) emit two
    // null-separated paths in a row; we don't try to be clever there — both
    // paths get marked dirty if the rename touches a watched src/ tree.
    dirty.add(record.slice(3));
  }
  return dirty;
};

const isPathDirty = (dirty: Set<string>, prefix: string): boolean => {
  for (const p of dirty) {
    if (p === prefix || p.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
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

// Legacy v1 schema — kept here so we can migrate the on-disk file forward
// without forcing a full re-extraction on every schema bump.
type CacheFileV1 = {
  version: 1;
  hash: string;
  packages: CachePackageEntry[];
  symbols: Record<string, PackageSymbols>;
};

// Legacy v2 schema — same shape as v3 minus `srcTreeSha`. Read but only
// match by mtime; the artifact uploaded by CI uses v3 for portability.
type CacheFileV2 = {
  version: 2;
  entries: Record<string, Omit<CacheEntry, 'srcTreeSha'>>;
};

/**
 * Load the cache file and return only those entries that still match the
 * live filesystem. Stale entries are silently dropped — the caller will
 * re-extract them. Returns null if the file doesn't exist or is unparseable.
 *
 * Match preference: a v3 entry's tree SHA (portable across machines) beats
 * mtime (same-machine only). Older schemas degrade gracefully — a v1/v2
 * cache file behaves exactly as it did before this PR.
 */
export const loadCache = async (
  cachePath: string,
  liveMtimes: Record<string, CachePackageEntry>,
  packageNamesByPath: Record<string, string>,
): Promise<LoadedCache | null> => {
  if (!existsSync(cachePath)) {
    return null;
  }
  let parsed: CacheFile | CacheFileV2 | CacheFileV1;
  try {
    const content = await readFile(cachePath, 'utf8');
    parsed = JSON.parse(content) as CacheFile | CacheFileV2 | CacheFileV1;
  } catch (err) {
    warn('load failed — re-indexing', err);
    return null;
  }
  // Version-discriminated union narrowing — compare against literals so TS
  // narrows the union, instead of `=== CACHE_VERSION` (which is just `number`).
  if (parsed.version === 3) {
    return matchV3(parsed, liveMtimes, packageNamesByPath);
  }
  if (parsed.version === 2) {
    return matchV2(parsed, liveMtimes, packageNamesByPath);
  }
  if (parsed.version === 1) {
    return matchV1(parsed, liveMtimes, packageNamesByPath);
  }
  warn(`unknown cache version (saved=${(parsed as { version: number }).version}) — re-indexing`);
  return null;
};

const matchV3 = (
  parsed: CacheFile,
  liveMtimes: Record<string, CachePackageEntry>,
  packageNamesByPath: Record<string, string>,
): LoadedCache => {
  const symbols: Record<string, PackageSymbols> = {};
  let valid = 0;
  let stale = 0;
  let treeMatches = 0;
  let mtimeMatches = 0;
  for (const [path, live] of Object.entries(liveMtimes)) {
    const name = packageNamesByPath[path];
    if (!name) {
      continue;
    }
    const cached = parsed.entries?.[name];
    if (!cached) {
      continue;
    }
    // Prefer tree-SHA invalidation when both sides have a SHA. This matches
    // across machines (CI ↔ developer) for the same git ref.
    if (cached.srcTreeSha && live.srcTreeSha && cached.srcTreeSha === live.srcTreeSha && cached.path === path) {
      symbols[name] = cached.symbols;
      valid++;
      treeMatches++;
    } else if (cached.srcMtime === live.srcMtime && cached.path === path) {
      // Same-machine fallback. Useful for fresh local edits where mtimes
      // change but the developer hasn't committed yet.
      symbols[name] = cached.symbols;
      valid++;
      mtimeMatches++;
    } else {
      stale++;
    }
  }
  if (treeMatches > 0 || mtimeMatches > 0) {
    // stderr only — stdout is reserved for MCP JSON-RPC.
    console.error(`[introspect cache] reused ${treeMatches} via tree-sha + ${mtimeMatches} via mtime`);
  }
  return { symbols, validCount: valid, staleCount: stale };
};

const matchV2 = (
  parsed: CacheFileV2,
  liveMtimes: Record<string, CachePackageEntry>,
  packageNamesByPath: Record<string, string>,
): LoadedCache => {
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

const matchV1 = (
  parsed: CacheFileV1,
  liveMtimes: Record<string, CachePackageEntry>,
  packageNamesByPath: Record<string, string>,
): LoadedCache => {
  // v1 stored mtimes in `packages[]` and symbols by name in `symbols{}`.
  // For each package whose v1 mtime matches the live mtime, reuse the
  // symbols. Mismatched ones get re-extracted by the caller.
  const v1Mtimes = new Map<string, number>();
  for (const entry of parsed.packages ?? []) {
    v1Mtimes.set(entry.path, entry.srcMtime);
  }
  const symbols: Record<string, PackageSymbols> = {};
  let valid = 0;
  let stale = 0;
  for (const [path, live] of Object.entries(liveMtimes)) {
    const name = packageNamesByPath[path];
    if (!name) {
      continue;
    }
    const cachedMtime = v1Mtimes.get(path);
    const syms = parsed.symbols?.[name];
    if (syms && cachedMtime === live.srcMtime) {
      symbols[name] = syms;
      valid++;
    } else if (syms) {
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
      entries[name] = { path, srcMtime: live.srcMtime, srcTreeSha: live.srcTreeSha, symbols: syms };
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
