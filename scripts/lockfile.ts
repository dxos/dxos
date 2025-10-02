#!/usr/bin/env vite-node --script

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type VersionId = string;

/**
 * Represents a dependency specification in the lockfile.
 */
export interface DependencySpec {
  /** The version specifier from package.json. */
  specifier: string;
  /** The resolved version. */
  version: string;
}

/**
 * Represents a single importer (workspace package) in the lockfile.
 */
export interface Importer {
  /** Production dependencies. */
  dependencies?: Record<string, DependencySpec>;
  /** Development dependencies. */
  devDependencies?: Record<string, DependencySpec>;
  /** Peer dependencies. */
  peerDependencies?: Record<string, DependencySpec>;
  /** Optional dependencies. */
  optionalDependencies?: Record<string, DependencySpec>;
}

/**
 * Represents a resolved package in the lockfile.
 */
export interface Package {
  /** Direct dependencies of this package. */
  dependencies?: Record<string, string>;
  /** Development dependencies of this package. */
  devDependencies?: Record<string, string>;
  /** Peer dependencies of this package. */
  peerDependencies?: Record<string, string>;
  /** Optional dependencies of this package. */
  optionalDependencies?: Record<string, string>;
  /** Transitive peer dependencies. */
  transitivePeerDependencies?: string[];
  /** The resolved version. */
  resolution?: {
    /** Integrity hash for verification. */
    integrity?: string;
    /** Tarball URL. */
    tarball?: string;
    /** Registry URL. */
    registry?: string;
    /** Git repository information. */
    repo?: string;
    /** Git commit hash. */
    commit?: string;
    /** Directory path for local packages. */
    directory?: string;
  };
  /** Package ID for deduplication. */
  id?: string;
  /** Name of the package. */
  name?: string;
  /** Version of the package. */
  version?: string;
  /** Engines requirements. */
  engines?: {
    node?: string;
    npm?: string;
    pnpm?: string;
  };
  /** CPU architectures supported. */
  cpu?: string[];
  /** Operating systems supported. */
  os?: string[];
  /** Whether the package is deprecated. */
  deprecated?: string;
  /** Whether the package has a prepare script. */
  requiresBuild?: boolean;
  /** Binary executables provided by the package. */
  bin?: Record<string, string>;
}

/**
 * Represents a snapshot of a package.
 */
export interface Snapshot {
  /** The resolved version. */
  dependencies?: Record<string, VersionId>;
}

/**
 * Represents patches applied to dependencies.
 */
export interface PatchedDependency {
  /** SHA256 hash of the patch. */
  hash: string;
  /** Path to the patch file. */
  path: string;
}

/**
 * Settings for pnpm lockfile.
 */
export interface Settings {
  /** Whether to auto-install peer dependencies. */
  autoInstallPeers?: boolean;
  /** Whether to exclude links from lockfile. */
  excludeLinksFromLockfile?: boolean;
}

/**
 * The root structure of a pnpm lockfile.
 */
export interface PnpmLockfile {
  /** Version of the lockfile format. */
  lockfileVersion: string | number;
  /** pnpm settings. */
  settings?: Settings;
  /** Dependency version overrides. */
  overrides?: Record<string, string>;
  /** Checksum of the pnpmfile.cjs if present. */
  pnpmfileChecksum?: string;
  /** Patches applied to dependencies. */
  patchedDependencies?: Record<string, PatchedDependency | string>;
  /** Workspace packages and their dependencies. */
  importers: Record<string, Importer>;
  /** All resolved packages in the lockfile. */
  packages?: Record<PackageId, Package>;
  snapshots?: Record<PackageId, Snapshot>;
  /** Specifiers for packages. */
  specifiers?: Record<string, string>;
  /** Time when packages were resolved. */
  time?: Record<string, string>;
  /** Catalog of reusable dependency groups. */
  catalogs?: Record<string, Record<string, string>>;
  /** Packages that should never be hoisted. */
  neverBuiltDependencies?: string[];
  /** Packages that are only built in specific conditions. */
  onlyBuiltDependencies?: string[];
}

/**
 * Package identifier in the lockfile packages section.
 * Format: <package-name>@<version>(peer-deps)
 * Examples:
 * - "react@18.2.0"
 * - "@babel/core@7.25.2(@babel/types@7.26.5)"
 * - "eslint-plugin-react@7.37.5(eslint@9.35.0)(typescript@5.9.2)"
 */
type PackageId = string;

type PackageInfo = {
  name: string;
  version: string;
};

/**
 * All packages that depend on a given package.
 */
const dependants = new Map<PackageId, Set<PackageId>>();

/**
 * Parse a package ID to extract the package name and version.
 */
function parsePackageId(packageId: PackageId): PackageInfo | null {
  // Handle scoped packages like @babel/core@7.25.2
  const scopedMatch = packageId.match(/^(@[^/]+\/[^@]+)@(.+)$/);
  if (scopedMatch) {
    return { name: scopedMatch[1], version: scopedMatch[2] };
  }

  // Handle non-scoped packages like react@18.2.0
  const match = packageId.match(/^([^@]+)@(.+)$/);
  if (match) {
    return { name: match[1], version: match[2] };
  }

  return null;
}

// Read the pnpm-lock.yaml file.
const lockfilePath = join(process.cwd(), 'pnpm-lock.yaml');
const lockfileContent = await readFile(lockfilePath, 'utf-8');
const lockfileData = parse(lockfileContent) as PnpmLockfile;

// Fill dependants map from lockfile.
if (lockfileData.snapshots) {
  for (const [snapshotId, snapshotData] of Object.entries(lockfileData.snapshots)) {
    // Collect all dependencies from different fields.
    const allDeps: string[] = [];

    for (const [depName, depVersionId] of Object.entries(snapshotData.dependencies ?? {})) {
      const depPackageId = `${depName}@${depVersionId}`;
      if (!dependants.has(depPackageId)) {
        dependants.set(depPackageId, new Set<PackageId>());
      }
      dependants.get(depPackageId)!.add(snapshotId);
    }
  }
}

// Also process importers (workspace packages).
for (const [importerPath, importerData] of Object.entries(lockfileData.importers)) {
  const allDeps: Array<[string, string]> = [];

  if (importerData.dependencies) {
    for (const [depName, depSpec] of Object.entries(importerData.dependencies)) {
      allDeps.push([depName, depSpec.version]);
    }
  }
  if (importerData.devDependencies) {
    for (const [depName, depSpec] of Object.entries(importerData.devDependencies)) {
      allDeps.push([depName, depSpec.version]);
    }
  }
  if (importerData.peerDependencies) {
    for (const [depName, depSpec] of Object.entries(importerData.peerDependencies)) {
      allDeps.push([depName, depSpec.version]);
    }
  }
  if (importerData.optionalDependencies) {
    for (const [depName, depSpec] of Object.entries(importerData.optionalDependencies)) {
      allDeps.push([depName, depSpec.version]);
    }
  }

  // For each dependency, find it in packages and add the importer as a dependant.
  for (const [depName, depVersion] of allDeps) {
    // The version might be a reference like "link:../path" or a package ID reference.
    // If it starts with "link:", it's a local workspace package.
    if (depVersion.startsWith('link:')) {
      continue; // Skip local workspace links for now.
    }

    // Find the matching package in the packages section.
    const packageId = `${depName}@${depVersion}`;
    if (!dependants.has(packageId)) {
      dependants.set(packageId, new Set<PackageId>());
    }
    // Use the importer path as the dependant ID for workspace packages.
    dependants.get(packageId)!.add(`importer:${importerPath}`);
  }
}

function getImporterSpecifier(importer: string, dep: string): string | undefined {
  if (!lockfileData.importers[importer]) {
    return;
  }
  if (lockfileData.importers[importer].dependencies?.[dep]) {
    return lockfileData.importers[importer].dependencies[dep].specifier;
  }
  if (lockfileData.importers[importer].devDependencies?.[dep]) {
    return lockfileData.importers[importer].devDependencies[dep].specifier;
  }
  if (lockfileData.importers[importer].peerDependencies?.[dep]) {
    return lockfileData.importers[importer].peerDependencies[dep].specifier;
  }
  if (lockfileData.importers[importer].optionalDependencies?.[dep]) {
    return lockfileData.importers[importer].optionalDependencies[dep].specifier;
  }
}

/**
 * Print a tree of dependants for a given package.
 */
function printDependantsTree(
  packageId: PackageId,
  depth: number,
  maxDepth: number,
  visited: Set<PackageId> = new Set(),
  indent: string = '',
  isLast: boolean = true,
  parent?: PackageId,
): void {
  if (depth > maxDepth || visited.has(packageId)) {
    return;
  }

  visited.add(packageId);

  // Determine the display name.
  let displayName = packageId;
  const packageInfo = parsePackageId(packageId);
  if (packageInfo) {
    displayName = `${packageInfo.name}@${packageInfo.version}`;
  }

  // Print the current item with proper tree characters.
  if (depth === 0) {
    console.log(displayName);
  } else {
    const connector = isLast ? '└─' : '├─';
    let extraData = '';
    if (packageId.startsWith('importer:') && parent) {
      const parentInfo = parsePackageId(parent);
      if (parentInfo) {
        const specifier = getImporterSpecifier(packageId.slice('importer:'.length), parentInfo.name);
        if (specifier) {
          extraData += ` (${specifier})`;
        }
      }
    }
    console.log(`${indent}${connector} ${displayName}${extraData}`);
  }

  const deps = dependants.get(packageId);
  if (deps && depth < maxDepth) {
    const sortedDeps = Array.from(deps).sort();
    const newIndent = depth === 0 ? '' : indent + (isLast ? '   ' : '│  ');

    sortedDeps.forEach((dep, index) => {
      const isLastChild = index === sortedDeps.length - 1;
      printDependantsTree(dep, depth + 1, maxDepth, visited, newIndent, isLastChild, packageId);
    });
  }
}

/**
 * Find all package IDs that match the given package name.
 */
function findPackagesByName(packageName: string): PackageId[] {
  const matches: PackageId[] = [];

  if (lockfileData.packages) {
    for (const packageId of Object.keys(lockfileData.snapshots ?? {})) {
      const packageInfo = parsePackageId(packageId);
      if (packageInfo && packageInfo.name === packageName) {
        matches.push(packageId);
      }
    }
  }

  return matches;
}

// Parse command-line arguments.
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <package-name> [options]')
  .command('$0 <package-name>', 'Print dependants tree for a package', (yargs) => {
    return yargs.positional('package-name', {
      describe: 'Package name (without version)',
      type: 'string',
      demandOption: true,
    });
  })
  .option('depth', {
    alias: 'd',
    describe: 'Maximum depth to traverse',
    type: 'number',
    default: 5,
  })
  .help()
  .alias('help', 'h')
  .parse();

const packageName = argv['package-name'] as string;
const maxDepth = argv.depth;

console.log(`\nSearching for dependants of "${packageName}" up to depth ${maxDepth}...\n`);

// Find all versions of the specified package.
const matchingPackages = findPackagesByName(packageName);

if (matchingPackages.length === 0) {
  console.error(`No packages found matching "${packageName}"`);
  process.exit(1);
}

console.log(`Found ${matchingPackages.length} version(s) of ${packageName}:\n`);

// Print dependants tree for each version.
for (const packageId of matchingPackages) {
  console.log('='.repeat(36));
  printDependantsTree(packageId, 0, maxDepth);
  console.log();
}
