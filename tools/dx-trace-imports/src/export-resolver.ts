//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

type ConditionalExport = string | { readonly [condition: string]: ConditionalExport };

const resolveConditionalExport = (entry: ConditionalExport, conditions: readonly string[]): string => {
  if (typeof entry === 'string') {
    return entry;
  }
  for (const condition of conditions) {
    const value = entry[condition];
    if (value !== undefined) {
      return resolveConditionalExport(value, conditions);
    }
  }
  const fallback = entry.default;
  if (fallback !== undefined) {
    return resolveConditionalExport(fallback, conditions);
  }
  throw new Error(`Could not resolve conditional export with conditions: ${conditions.join(', ')}`);
};

/**
 * Resolve a package export subpath (e.g. `./plugin`) to a source file using conditional exports.
 */
export const resolvePackageExport = (
  absWorkingDir: string,
  exportSubpath: string,
  conditions: readonly string[],
): string => {
  const packageJsonPath = path.join(absWorkingDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    exports?: Record<string, ConditionalExport>;
  };
  const exportsMap = packageJson.exports;
  if (!exportsMap) {
    throw new Error(`No "exports" field in ${packageJsonPath}.`);
  }
  const exportEntry = exportsMap[exportSubpath];
  if (exportEntry === undefined) {
    throw new Error(`Export "${exportSubpath}" not found in ${packageJsonPath}.`);
  }
  const resolvedRelative = resolveConditionalExport(exportEntry, conditions);
  return path.resolve(absWorkingDir, resolvedRelative);
};
