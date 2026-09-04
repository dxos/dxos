//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { type Matcher, type WorkspacePackageResolver, externalKey, matchesKey } from './matcher.ts';
import { createImportResolver } from './package-resolution.ts';
import { parseImportSpecifiers } from './parse-imports.ts';

const findPackageRoot = (filePath: string): string | null => {
  let dir = path.dirname(filePath);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return `${dir}${path.sep}`;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};

const shouldRecurseInto = (
  resolved: string,
  matcher: Matcher,
  resolveWorkspacePackage: WorkspacePackageResolver,
): boolean => {
  if (matchesKey(resolved, matcher, resolveWorkspacePackage)) {
    return false;
  }
  const packageName = resolveWorkspacePackage(resolved);
  return packageName?.startsWith('@dxos/') ?? false;
};

export type ImportGraph = {
  readonly graph: Map<string, string[]>;
  /**
   * `#`-prefixed specifiers in the traced package's OWN files that failed to resolve, as
   * `<importer> -> <specifier>`. The package under test defines its own subpath imports, so a
   * failure means the condition set resolves to a file that was never built, and the crawl stops
   * at that edge. Only the traced package's own files are policed.
   */
  readonly unresolvedSubpaths: string[];
};

/**
 * Build a static import graph by crawling from the entry file with the SWC parser and
 * resolving each specifier through `package.json` `imports`/`exports`. Edges to files
 * outside workspace packages (or the matcher target) are recorded but not traversed.
 */
export const buildImportGraph = (
  entryKey: string,
  conditions: readonly string[],
  matcher: Matcher,
  resolveWorkspacePackage: WorkspacePackageResolver,
): ImportGraph => {
  const resolver = createImportResolver(conditions);
  const graph = new Map<string, string[]>();
  const unresolvedSubpaths: string[] = [];
  const entryPackageRoot = findPackageRoot(entryKey);
  const queue = [entryKey];
  const queued = new Set(queue);

  const ensureNode = (key: string): void => {
    if (!graph.has(key)) {
      graph.set(key, []);
    }
  };

  let fileKey: string | undefined;
  while ((fileKey = queue.shift()) !== undefined) {
    ensureNode(fileKey);

    let source: string;
    try {
      source = fs.readFileSync(fileKey, 'utf8');
    } catch (err) {
      throw new Error(`failed to read ${fileKey}: ${err instanceof Error ? err.message : String(err)}`);
    }

    const deps = new Set<string>();
    for (const specifier of parseImportSpecifiers(source, fileKey)) {
      const resolved = resolver.resolve(fileKey, specifier);
      if (resolved) {
        deps.add(resolved);
        ensureNode(resolved);
        if (shouldRecurseInto(resolved, matcher, resolveWorkspacePackage) && !queued.has(resolved)) {
          queued.add(resolved);
          queue.push(resolved);
        }
        continue;
      }

      if (specifier.startsWith('#') && entryPackageRoot !== null && fileKey.startsWith(entryPackageRoot)) {
        unresolvedSubpaths.push(`${fileKey} -> ${specifier}`);
      }

      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        const external = externalKey(specifier);
        deps.add(external);
        ensureNode(external);
      }
    }

    graph.set(fileKey, [...deps]);
  }

  return { graph, unresolvedSubpaths };
};
