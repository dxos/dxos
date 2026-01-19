#!/usr/bin/env npx tsx
//
// Copyright 2025 DXOS.org
//

/**
 * Migration script to convert packages to use nested exports.source format.
 *
 * Usage:
 *   npx tsx tools/codemorph/src/migrate-to-nested-source.ts --dry-run   # Preview changes
 *   npx tsx tools/codemorph/src/migrate-to-nested-source.ts --apply      # Apply changes
 *
 * This script converts packages to use standard exports.source condition:
 * - Flat source: "source": "./src/index.ts" (for simple packages)
 * - Nested source: "source": { "node": "...", "browser": "...", "default": "..." } (for platform-specific)
 *
 * Migration rules:
 * - If package has sourceExports, convert it back to exports.source
 * - If package needs platform-specific behavior, use nested source
 * - Otherwise, use flat source
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

interface ConditionMap {
  default?: string;
  node?: string;
  browser?: string;
  workerd?: string;
}

type SourceExports = Record<string, ConditionMap>;

interface ExportConditions {
  source?: string | ConditionMap;
  types?: string;
  browser?: string;
  node?: string | Record<string, string>;
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
  details?: string;
}

/**
 * Checks if exports have complex patterns that should be skipped.
 */
const hasComplexPatterns = (exports: Record<string, unknown>): { skip: boolean; reason?: string } => {
  for (const [key, value] of Object.entries(exports)) {
    // Check for wildcard exports.
    if (key.includes('*')) {
      return { skip: true, reason: `Wildcard export pattern: ${key}` };
    }

    // Check for string-only exports (direct path without conditions).
    if (typeof value === 'string') {
      continue;
    }

    if (typeof value !== 'object' || value === null) {
      return { skip: true, reason: `Unexpected export type for ${key}` };
    }
  }
  return { skip: false };
};

/**
 * Checks if a package needs nested source (has platform-specific source files).
 * Only use nested source if the SOURCE files differ by platform, not just runtime exports.
 */
const needsNestedSource = (sourceExportsEntry: ConditionMap): boolean => {
  // Check if sourceExports has platform-specific entries (not just default).
  const platforms = ['node', 'browser', 'workerd'];
  const hasPlatformSource = platforms.some((p) => sourceExportsEntry[p as keyof ConditionMap]);

  return hasPlatformSource;
};

/**
 * Creates the source condition value (flat or nested).
 */
const createSourceCondition = (
  sourceExportsEntry: ConditionMap,
  useNested: boolean,
): string | ConditionMap => {
  if (!useNested) {
    // Flat source - just return the default path.
    return sourceExportsEntry.default || '';
  }

  // Nested source - create condition map.
  const nested: ConditionMap = {};

  // Add in specific order: workerd, browser, node, default.
  if (sourceExportsEntry.workerd) {
    nested.workerd = sourceExportsEntry.workerd;
  }
  if (sourceExportsEntry.browser) {
    nested.browser = sourceExportsEntry.browser;
  }
  if (sourceExportsEntry.node) {
    nested.node = sourceExportsEntry.node;
  }
  if (sourceExportsEntry.default) {
    nested.default = sourceExportsEntry.default;
  }

  return nested;
};

/**
 * Converts sourceExports back to exports.source.
 */
const convertToExportsSource = (
  exports: Record<string, ExportConditions | string>,
  sourceExports: SourceExports,
): Record<string, ExportConditions | string> => {
  const newExports: Record<string, ExportConditions | string> = {};

  for (const [subpath, entry] of Object.entries(exports)) {
    const sourceExportEntry = sourceExports[subpath];

    if (!sourceExportEntry) {
      // No sourceExports for this subpath, keep as-is.
      newExports[subpath] = entry;
      continue;
    }

    if (typeof entry === 'string') {
      // Simple string export - add source condition.
      newExports[subpath] = {
        source: sourceExportEntry.default || '',
        default: entry,
      };
      continue;
    }

    // Object export - add source condition.
    const runtimeEntry = entry as ExportConditions;
    const useNested = needsNestedSource(sourceExportEntry);
    const sourceCondition = createSourceCondition(sourceExportEntry, useNested);

    // Build new export entry with source first.
    const newEntry: ExportConditions = {
      source: sourceCondition,
    };

    // Copy other conditions in order: types, browser, node, workerd, default, etc.
    const orderedKeys = ['types', 'browser', 'node', 'workerd', 'default', 'import', 'require'];
    for (const key of orderedKeys) {
      if (key in runtimeEntry) {
        newEntry[key] = runtimeEntry[key];
      }
    }

    // Copy any remaining keys not in the ordered list.
    for (const [key, value] of Object.entries(runtimeEntry)) {
      if (!orderedKeys.includes(key) && key !== 'source') {
        newEntry[key] = value;
      }
    }

    newExports[subpath] = newEntry;
  }

  // Handle any sourceExports entries that don't have corresponding runtime exports.
  for (const [subpath, sourceEntry] of Object.entries(sourceExports)) {
    if (!(subpath in newExports)) {
      // Create a new export entry just with source.
      newExports[subpath] = {
        source: sourceEntry.default || '',
      };
    }
  }

  return newExports;
};

/**
 * Removes sourceExports from package.json.
 */
const removeSourceExports = (packageJson: PackageJson): PackageJson => {
  const { sourceExports, ...rest } = packageJson;
  return rest as PackageJson;
};

/**
 * Migrates a single package.json file.
 */
const migratePackage = (packageJsonPath: string, dryRun: boolean): MigrationResult => {
  const content = readFileSync(packageJsonPath, 'utf-8');
  const packageJson: PackageJson = JSON.parse(content);
  const packageName = packageJson.name;

  // Check if package has sourceExports to migrate.
  if (!packageJson.sourceExports || Object.keys(packageJson.sourceExports).length === 0) {
    // Check if it already has source in exports (already migrated or original format).
    if (packageJson.exports) {
      const hasSource = Object.values(packageJson.exports).some(
        (entry) => typeof entry === 'object' && entry !== null && 'source' in entry,
      );
      if (hasSource) {
        return {
          path: packageJsonPath,
          packageName,
          status: 'unchanged',
          reason: 'Already has source in exports',
        };
      }
    }

    return {
      path: packageJsonPath,
      packageName,
      status: 'unchanged',
      reason: 'No sourceExports field',
    };
  }

  // Check if exports exist.
  if (!packageJson.exports || Object.keys(packageJson.exports).length === 0) {
    return {
      path: packageJsonPath,
      packageName,
      status: 'skipped',
      reason: 'No exports field',
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

  // Convert sourceExports to exports.source.
  const newExports = convertToExportsSource(packageJson.exports, packageJson.sourceExports);

  // Remove sourceExports field.
  const newPackageJson = removeSourceExports(packageJson);
  newPackageJson.exports = newExports;

  if (!dryRun) {
    writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2) + '\n');
  }

  // Determine if we used flat or nested source.
  const usedNested = Object.values(newExports).some(
    (entry) => typeof entry === 'object' && entry !== null && typeof entry.source === 'object',
  );

  return {
    path: packageJsonPath,
    packageName,
    status: 'converted',
    details: usedNested ? 'nested source' : 'flat source',
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
    console.log('  npx tsx tools/codemorph/src/migrate-to-nested-source.ts --dry-run   # Preview changes');
    console.log('  npx tsx tools/codemorph/src/migrate-to-nested-source.ts --apply     # Apply changes');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Nested Source Migration Script`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY (changes will be written)'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Find all package.json files.
  const cwd = process.cwd();
  const packageJsonPaths = findPackageJsonFiles(join(cwd, 'packages'));
  const toolsPackageJsonPaths = findPackageJsonFiles(join(cwd, 'tools'));

  const allPaths = [...packageJsonPaths, ...toolsPackageJsonPaths].sort();

  const results: MigrationResult[] = [];

  for (const absolutePath of allPaths) {
    try {
      const result = migratePackage(absolutePath, dryRun);
      results.push(result);
    } catch (error) {
      results.push({
        path: absolutePath,
        packageName: absolutePath,
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
    const flatCount = converted.filter((r) => r.details === 'flat source').length;
    const nestedCount = converted.filter((r) => r.details === 'nested source').length;
    console.log(`  Flat source: ${flatCount}`);
    console.log(`  Nested source: ${nestedCount}`);
    console.log('');
    for (const result of converted) {
      console.log(`  ${result.packageName} (${result.details})`);
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
