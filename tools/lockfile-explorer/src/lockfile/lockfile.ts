//
// Copyright 2025 DXOS.org
//

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import * as yaml from 'yaml';

import { entries } from '@dxos/util';

import type { Lockfile, PackageId, PackageIndex, PackageName, VersionId, VersionSpecifier } from './types';

export const findLockfile = (path: string): string => {
  if (path.endsWith('pnpm-lock.yaml') && existsSync(path)) {
    return path;
  }

  if (existsSync(join(path, 'pnpm-lock.yaml'))) {
    return join(path, 'pnpm-lock.yaml');
  }

  if (path === '/') {
    throw new Error('No lockfile found');
  }

  return findLockfile(dirname(path));
};

export const loadLockfile = async (path: string): Promise<LockfileResult> => {
  const lockfilePath = findLockfile(path);
  const content = await readFile(lockfilePath, 'utf8');
  const lockfile = yaml.parse(content);

  return {
    path: lockfilePath,
    lockfile,
    packageIndex: buildIndex(lockfile),
  };
};

export type LockfileResult = {
  path: string;
  lockfile: Lockfile;
  packageIndex: PackageIndex;
};

export const parsePackageId = (packageId: PackageId): { name: PackageName; version: VersionId } => {
  const splitAt = packageId.indexOf('@', 1);
  const name = packageId.slice(0, splitAt) as PackageName;
  const version = packageId.slice(splitAt + 1) as VersionId;
  return { name, version };
};

const buildIndex = (lockfile: Lockfile): PackageIndex => {
  const index: PackageIndex = {
    packages: {},
  };

  // for (const packageId of keys(lockfile.packages)) {
  //   const { name, version } = parsePackageId(packageId);
  //   index.packages[name] ??= { versions: {} };
  //   index.packages[name].versions[version] ??= { dependents: [], importers: [] };
  // }

  for (const [packageId, pkg] of entries(lockfile.snapshots)) {
    const { name, version } = parsePackageId(packageId);
    index.packages[name] ??= { versions: {} };
    index.packages[name].versions[preprocessVersionId(version)] ??= { dependents: [], importers: [] };

    const allDeps: [PackageName, VersionId][] = [
      ...entries(pkg.dependencies ?? {}),
      ...entries(pkg.devDependencies ?? {}),
      ...entries(pkg.optionalDependencies ?? {}),
    ];

    for (const [depName, depVersion] of allDeps) {
      index.packages[depName] ??= { versions: {} };
      index.packages[depName].versions[preprocessVersionId(depVersion)] ??= { dependents: [], importers: [] };
      index.packages[depName].versions[preprocessVersionId(depVersion)].dependents.push(packageId);
    }
  }

  for (const [path, manifest] of entries(lockfile.importers)) {
    const allDeps = [
      ...entries(manifest.dependencies ?? {}),
      ...entries(manifest.devDependencies ?? {}),
      ...entries(manifest.optionalDependencies ?? {}),
    ];

    for (const [depName, { version }] of allDeps) {
      index.packages[depName] ??= { versions: {} };
      index.packages[depName].versions[preprocessVersionId(version)] ??= { dependents: [], importers: [] };
      index.packages[depName].versions[preprocessVersionId(version)].importers.push(path);
    }
  }

  return index;
};

const preprocessVersionId = (versionId: VersionId): VersionId => {
  if (versionId.startsWith('link:.')) {
    return 'link:<internal>' as VersionId;
  }

  return versionId;
};

export const setAllToVersion = async (
  lockfile: LockfileResult,
  packageName: PackageName,
  versionSpecifier: VersionSpecifier,
) => {
  for (const [importer, manifest] of entries(lockfile.lockfile.importers)) {
    for (const [depName, { specifier }] of entries({
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
      ...(manifest.optionalDependencies ?? {}),
    })) {
      if (depName !== packageName || specifier === versionSpecifier) {
        continue;
      }

      const manifestPath = resolve(dirname(lockfile.path), importer, 'package.json');
      const contents = await readFile(manifestPath, 'utf8');
      const json = JSON.parse(contents);
      if (manifest.dependencies?.[depName]) {
        json.dependencies[depName] = versionSpecifier;
      } else if (manifest.devDependencies?.[depName]) {
        json.devDependencies[depName] = versionSpecifier;
      } else if (manifest.optionalDependencies?.[depName]) {
        json.optionalDependencies[depName] = versionSpecifier;
      }

      await writeFile(manifestPath, JSON.stringify(json, null, 2), { encoding: 'utf8' });
    }
  }
};
