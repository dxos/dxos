//
// Copyright 2026 DXOS.org
//

import { glob } from 'glob';
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { promisify } from 'node:util';

import type { PackageDetail } from '../types';

// stderr-only — stdout is reserved for the MCP JSON-RPC stream.
const warn = (msg: string, err?: unknown): void => {
  console.error(err ? `[introspect packages] ${msg}: ${String(err)}` : `[introspect packages] ${msg}`);
};

const execAsync = promisify(exec);

type PackageJson = {
  name?: string;
  version?: string;
  description?: string;
  private?: boolean;
  main?: string;
  module?: string;
  types?: string;
  exports?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * Walk the monorepo and produce a normalized list of packages.
 *
 * Tries Moon's project graph first (`moon query projects`). Falls back to
 * globbing `packages/**\/package.json` when Moon is not on PATH or the command
 * fails — this keeps the package usable in fixture trees that don't ship Moon.
 */
export const discoverPackages = async (monorepoRoot: string): Promise<PackageDetail[]> => {
  const fromMoon = await tryMoon(monorepoRoot);
  if (fromMoon) {
    return fromMoon;
  }
  return await fromGlob(monorepoRoot);
};

const tryMoon = async (monorepoRoot: string): Promise<PackageDetail[] | null> => {
  // Moon walks up to find its workspace root, so calling it from a directory
  // that isn't itself a Moon workspace would return the parent's project graph.
  // Gate on `.moon/` existing in the given root to avoid that.
  if (!existsSync(join(monorepoRoot, '.moon'))) {
    return null;
  }
  try {
    // moon query projects returns JSON to stdout by default. Bound the wait so
    // a hung moon process can't block `introspector.ready` indefinitely — fall
    // through to glob if it doesn't return promptly.
    const { stdout } = await execAsync('moon query projects', {
      cwd: monorepoRoot,
      maxBuffer: 32 * 1024 * 1024,
      timeout: 30_000,
    });
    const parsed = JSON.parse(stdout) as { projects?: Array<{ source?: string }> };
    const sources = (parsed.projects ?? [])
      .map((p) => p.source)
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    if (sources.length === 0) {
      return null;
    }
    return await loadPackages(monorepoRoot, sources);
  } catch (err) {
    warn('moon query failed, falling back to glob', err);
    return null;
  }
};

const fromGlob = async (monorepoRoot: string): Promise<PackageDetail[]> => {
  const matches = await glob('packages/**/package.json', {
    cwd: monorepoRoot,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    nodir: true,
  });
  const sources = matches.map((m) => normalizePath(m).replace(/\/package\.json$/, ''));
  return await loadPackages(monorepoRoot, sources);
};

const loadPackages = async (monorepoRoot: string, sources: string[]): Promise<PackageDetail[]> => {
  // Dedupe normalized sources, then read all package.json files concurrently.
  // Sequential await burns wall-clock on large monorepos for no benefit.
  const unique = [...new Set(sources.map(normalizePath))];
  const settled = await Promise.all(unique.map((src) => readPackageJson(monorepoRoot, src)));
  const results = settled.filter((pkg): pkg is PackageDetail => pkg !== null);
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
};

const readPackageJson = async (monorepoRoot: string, source: string): Promise<PackageDetail | null> => {
  const pkgPath = join(monorepoRoot, source, 'package.json');
  if (!existsSync(pkgPath)) {
    return null;
  }
  try {
    const content = await readFile(pkgPath, 'utf8');
    const json = JSON.parse(content) as PackageJson;
    if (!json.name) {
      return null;
    }
    const workspace: string[] = [];
    const external: string[] = [];
    for (const [name, spec] of Object.entries({ ...json.dependencies, ...json.peerDependencies })) {
      if (spec.startsWith('workspace:')) {
        workspace.push(name);
      } else {
        external.push(name);
      }
    }
    workspace.sort();
    external.sort();
    return {
      name: json.name,
      version: json.version ?? '0.0.0',
      private: json.private === true,
      path: source,
      description: json.description,
      workspaceDependencies: workspace,
      externalDependencies: external,
      entryPoints: resolveEntryPoints(json),
      exportCount: 0, // Filled in lazily by the symbol indexer.
    };
  } catch (err) {
    warn(`failed to read package.json at ${pkgPath}`, err);
    return null;
  }
};

const resolveEntryPoints = (pkg: PackageJson): string[] => {
  // Prefer the `source` field in `exports."."` (DXOS convention) — it points at TS.
  // Fall back to `main` / common defaults so non-DXOS shapes still produce something.
  const candidates: string[] = [];
  const exports = pkg.exports;
  if (exports && typeof exports === 'object' && !Array.isArray(exports)) {
    const dot = (exports as Record<string, unknown>)['.'];
    if (dot && typeof dot === 'object' && !Array.isArray(dot)) {
      const dotEntry = dot as Record<string, unknown>;
      const source = dotEntry.source;
      if (typeof source === 'string') {
        candidates.push(source);
      }
      const types = dotEntry.types;
      if (typeof types === 'string' && candidates.length === 0) {
        candidates.push(types);
      }
    }
  }
  if (candidates.length === 0 && typeof pkg.main === 'string') {
    candidates.push(pkg.main);
  }
  if (candidates.length === 0) {
    candidates.push('src/index.ts');
  }
  return candidates.map((p) => p.replace(/^\.\//, ''));
};

const normalizePath = (p: string): string => (sep === '/' ? p : p.split(sep).join('/'));

// Re-exported for use by other indexer modules.
export { relative as relativePath };
