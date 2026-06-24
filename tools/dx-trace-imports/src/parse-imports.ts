//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';

/**
 * Extract static module specifiers from TypeScript/JavaScript source.
 * Madge can omit unresolved package imports; parsing source keeps those edges.
 */
export const parseModuleSpecifiers = (source: string): string[] => {
  const specifiers = new Set<string>();
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }
  return [...specifiers];
};

/**
 * Merge parsed import specifiers into the adjacency graph for files madge analyzed.
 */
export const augmentGraphWithParsedImports = (
  graph: Map<string, string[]>,
  resolveGraphKey: (dependency: string, knownKeys: Set<string>) => string | null,
): void => {
  for (const [fileKey, deps] of [...graph.entries()]) {
    if (fileKey.startsWith('[external] ')) {
      continue;
    }
    if (!fileKey.endsWith('.ts') && !fileKey.endsWith('.tsx')) {
      continue;
    }
    let source: string;
    try {
      source = fs.readFileSync(fileKey, 'utf8');
    } catch {
      continue;
    }
    const knownKeys = new Set(graph.keys());
    const merged = new Set(deps);
    for (const specifier of parseModuleSpecifiers(source)) {
      // Madge resolves relative imports; only supplement bare package specifiers it omits.
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        continue;
      }
      const resolved = resolveGraphKey(specifier, knownKeys);
      if (resolved) {
        merged.add(resolved);
        if (!graph.has(resolved)) {
          graph.set(resolved, []);
          knownKeys.add(resolved);
        }
      }
    }
    graph.set(fileKey, [...merged]);
  }
};
