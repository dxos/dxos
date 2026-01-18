#!/usr/bin/env npx tsx
//
// Copyright 2025 DXOS.org
//

/**
 * Migration script to convert packages from old "source" export condition to sourceExports.
 *
 * Usage:
 *   npx tsx tools/codemorph/src/migrate-source-exports.ts --dry-run   # Preview changes
 *   npx tsx tools/codemorph/src/migrate-source-exports.ts --apply      # Apply changes
 *
 * Scope restriction:
 *   Only modifies packages that currently use the "source" condition in exports.
 *   Packages without "source" condition are NOT touched.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface ConditionMap {
  default?: string;
  node?: string;
  browser?: string;
  workerd?: string;
}

type SourceExports = Record<string, ConditionMap>;

interface ExportConditions {
  source?: string;
  types?: string;
  browser?: string;
  node?: string;
  workerd?: string;
  default?: string;
  import?: string;
  require?: string;
  [key: string]: unknown;
}

interface PackageJson {
  name: string;
  exports?: Record<string, ExportConditions | string>;
  sourceExports?: SourceExports;
  [key: string]: unknown;
}

interface MigrationResult {
  path: string;
  packageName: string;
  status: 'converted' | 'skipped' | 'unchanged';
  reason?: string;
  sourceExports?: SourceExports;
}

/**
 * Checks if exports contain the "source" condition that needs migration.
 */
const hasSourceCondition = (exports: Record<string, unknown>): boolean => {
  for (const value of Object.values(exports)) {
    if (typeof value === 'object' && value !== null) {
      const entry = value as Record<string, unknown>;
      if ('source' in entry && typeof entry.source === 'string') {
        return true;
      }
    }
  }
  return false;
};

/**
 * Checks if exports have complex patterns that should be skipped.
 */
const hasComplexPatterns = (exports: Record<string, unknown>): { skip: boolean; reason?: string } => {
  for (const [key, value] of Object.entries(exports)) {
    // Check for wildcard exports.
    if (key.includes('*')) {
      return { skip: true, reason: `Wildcard export pattern: ${key}` };
    }

    // Check for string-only exports (no conditions object).
    if (typeof value === 'string') {
      continue; // Simple string exports are OK, we just won't migrate them.
    }

    if (typeof value !== 'object' || value === null) {
      return { skip: true, reason: `Unexpected export type for ${key}` };
    }

    const entry = value as Record<string, unknown>;

    // Check for deeply nested conditions (like node.require/node.import).
    for (const [condKey, condValue] of Object.entries(entry)) {
      if (typeof condValue === 'object' && condValue !== null && !Array.isArray(condValue)) {
        // Nested condition object - might be complex.
        if (condKey === 'node' || condKey === 'browser' || condKey === 'default') {
          return { skip: true, reason: `Nested condition object at ${key}.${condKey}` };
        }
      }
    }
  }
  return { skip: false };
};

/**
 * Extracts sourceExports from the old exports format.
 */
const extractSourceExports = (exports: Record<string, ExportConditions | string>): SourceExports => {
  const sourceExports: SourceExports = {};

  for (const [subpath, entry] of Object.entries(exports)) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const conditions = entry as ExportConditions;

    // Only process entries that have a "source" condition.
    if (!conditions.source) {
      continue;
    }

    const conditionMap: ConditionMap = {
      default: conditions.source,
    };

    // If there are platform-specific conditions in the source field usage,
    // we need to check if the source paths are different per platform.
    // For now, we assume "source" is the common source and use it as default.

    sourceExports[subpath] = conditionMap;
  }

  return sourceExports;
};

/**
 * Removes the "source" condition from exports while preserving other conditions.
 */
const removeSourceFromExports = (
  exports: Record<string, ExportConditions | string>,
): Record<string, ExportConditions | string> => {
  const newExports: Record<string, ExportConditions | string> = {};

  for (const [subpath, entry] of Object.entries(exports)) {
    if (typeof entry !== 'object' || entry === null) {
      newExports[subpath] = entry;
      continue;
    }

    const conditions = entry as ExportConditions;

    // Create a new entry without "source".
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { source, ...rest } = conditions;
    newExports[subpath] = rest as ExportConditions;
  }

  return newExports;
};

/**
 * Migrates a single package.json file.
 */
const migratePackage = (packageJsonPath: string, dryRun: boolean): MigrationResult => {
  const content = readFileSync(packageJsonPath, 'utf-8');
  const packageJson: PackageJson = JSON.parse(content);
  const packageName = packageJson.name;

  // Check if exports exist.
  if (!packageJson.exports || Object.keys(packageJson.exports).length === 0) {
    return {
      path: packageJsonPath,
      packageName,
      status: 'unchanged',
      reason: 'No exports field',
    };
  }

  // Check if package already has sourceExports.
  if (packageJson.sourceExports) {
    return {
      path: packageJsonPath,
      packageName,
      status: 'skipped',
      reason: 'Already has sourceExports',
    };
  }

  // Check if exports have "source" condition.
  if (!hasSourceCondition(packageJson.exports)) {
    return {
      path: packageJsonPath,
      packageName,
      status: 'unchanged',
      reason: 'No "source" condition in exports',
    };
  }

  // Check for complex patterns.
  const complexCheck = hasComplexPatterns(packageJson.exports);
  if (complexCheck.skip) {
    return {
      path: packageJsonPath,
      packageName,
      status: 'skipped',
      reason: complexCheck.reason,
    };
  }

  // Extract sourceExports.
  const sourceExports = extractSourceExports(packageJson.exports);

  if (Object.keys(sourceExports).length === 0) {
    return {
      path: packageJsonPath,
      packageName,
      status: 'skipped',
      reason: 'No valid source entries to extract',
    };
  }

  // Create new exports without "source".
  const newExports = removeSourceFromExports(packageJson.exports);

  if (!dryRun) {
    // Build new package.json preserving key order.
    const newPackageJson: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(packageJson)) {
      if (key === 'exports') {
        // Insert sourceExports before exports.
        newPackageJson.sourceExports = sourceExports;
        newPackageJson.exports = newExports;
      } else {
        newPackageJson[key] = value;
      }
    }

    // If exports wasn't in the original order, add at end.
    if (!newPackageJson.exports) {
      newPackageJson.sourceExports = sourceExports;
      newPackageJson.exports = newExports;
    }

    writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2) + '\n');
  }

  return {
    path: packageJsonPath,
    packageName,
    status: 'converted',
    sourceExports,
  };
};

/**
 * Recursively finds all package.json files in a directory.
 */
const findPackageJsonFiles = (dir: string, results: string[] = []): string[] => {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip node_modules and dist directories.
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        findPackageJsonFiles(fullPath, results);
      } else if (entry.name === 'package.json') {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore errors (e.g., permission denied).
  }

  return results;
};

/**
 * Main migration function.
 */
const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const apply = args.includes('--apply');

  if (!dryRun && !apply) {
    console.log('Usage:');
    console.log('  npx tsx tools/codemorph/migrate-source-exports.ts --dry-run   # Preview changes');
    console.log('  npx tsx tools/codemorph/migrate-source-exports.ts --apply     # Apply changes');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Source Exports Migration Script`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY (changes will be written)'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Find all package.json files.
  const cwd = process.cwd();
  const packageJsonPaths = findPackageJsonFiles(join(cwd, 'packages'));
  const toolsPackageJsonPaths = findPackageJsonFiles(join(cwd, 'tools'));

  const allPaths = [...packageJsonPaths, ...toolsPackageJsonPaths].sort();

  const results: MigrationResult[] = [];

  for (const relativePath of allPaths) {
    const absolutePath = resolve(cwd, relativePath);
    try {
      const result = migratePackage(absolutePath, dryRun);
      results.push(result);
    } catch (error) {
      results.push({
        path: absolutePath,
        packageName: relativePath,
        status: 'skipped',
        reason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // Print results.
  const converted = results.filter((r) => r.status === 'converted');
  const skipped = results.filter((r) => r.status === 'skipped');
  const unchanged = results.filter((r) => r.status === 'unchanged');

  console.log('\n--- CONVERTED ---');
  if (converted.length === 0) {
    console.log('  (none)');
  } else {
    for (const result of converted) {
      console.log(`  ${result.packageName}`);
      if (result.sourceExports) {
        for (const [subpath, conditions] of Object.entries(result.sourceExports)) {
          console.log(`    ${subpath}: ${JSON.stringify(conditions)}`);
        }
      }
    }
  }

  console.log('\n--- SKIPPED ---');
  if (skipped.length === 0) {
    console.log('  (none)');
  } else {
    for (const result of skipped) {
      console.log(`  ${result.packageName}: ${result.reason}`);
    }
  }

  console.log('\n--- SUMMARY ---');
  console.log(`  Converted: ${converted.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  console.log(`  Unchanged: ${unchanged.length}`);
  console.log(`  Total: ${results.length}`);

  if (dryRun && converted.length > 0) {
    console.log('\n⚠️  Run with --apply to make changes.');
  }

  if (!dryRun && converted.length > 0) {
    console.log('\n✅ Migration complete. Changes have been written.');
  }
};

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
