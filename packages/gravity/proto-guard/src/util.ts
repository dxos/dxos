//
// Copyright 2023 DXOS.org
//
import fs from 'node:fs';
import path from 'node:path';
import pkgUp from 'pkg-up';

import { Config } from '@dxos/client';
import { raise } from '@dxos/debug';

const STORAGE_VERSION_FILENAME = '.storage-version';

export const getPackageDir = () =>
  path.dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('No package.json found')));

export const getStorageDir = () => {
  const packageDirname = getPackageDir();
  const storageDir = path.join(packageDirname, 'storage');
  fs.mkdirSync(storageDir, { recursive: true });
  return storageDir;
};

export const getStorageVersion = () => {
  const filePath = path.join(getPackageDir(), STORAGE_VERSION_FILENAME);
  return Number(fs.readFileSync(filePath).toString());
};

/**
 * Bumps storage version in .storage-version file
 */
export const bumpStorageVersion = () => {
  const filePath = path.join(getPackageDir(), STORAGE_VERSION_FILENAME);
  const version = Number(fs.readFileSync(filePath).toString());
  fs.writeFileSync(filePath, `${(version + 1).toString()}\n`);
};

export const getConfig = (path: string) =>
  new Config({
    version: 1,
    runtime: { client: { storage: { persistent: true, path } } },
  });
