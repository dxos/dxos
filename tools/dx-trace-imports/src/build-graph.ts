//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';

import { type Matcher, type WorkspacePackageResolver, externalKey, matchesKey } from './matcher.ts';
import { createImportResolver } from './package-resolution.ts';
import { parseImportSpecifiers } from './parse-imports.ts';

/**
 * Recurse into resolved files that belong to workspace `@dxos/*` packages (including
 * in-repo sources). Stop at the matcher target so we do not walk past terminals, and
 * skip third-party packages to keep the crawl fast.
 */
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
): Map<string, string[]> => {
  const resolver = createImportResolver(conditions);
  const graph = new Map<string, string[]>();
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
    } catch {
      continue;
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

      // Unresolvable bare specifiers (missing install, virtual modules) stay as external leaves.
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        const external = externalKey(specifier);
        deps.add(external);
        ensureNode(external);
      }
    }

    graph.set(fileKey, [...deps]);
  }

  return graph;
};
