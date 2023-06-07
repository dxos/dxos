//
// Copyright 2023 DXOS.org
//
import fs from 'node:fs';
import path from 'node:path';
import pkgUp from 'pkg-up';

import { Config } from '@dxos/client';
import { raise } from '@dxos/debug';

export const getPackageDir = () =>
  path.dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('No package.json found')));

export const getStorageDir = () => {
  const packageDirname = getPackageDir();
  const storageDir = path.join(packageDirname, 'storage');
  fs.mkdirSync(storageDir, { recursive: true });
  return storageDir;
};

export const getLatestStorage = () => {
  const versions = fs
    .readdirSync(getStorageDir())
    .map((version) => Number(version))
    .filter((version) => !Number.isNaN(version));
  return Math.max(...versions, 1);
};

export const getConfig = (path: string) =>
  new Config({
    version: 1,
    runtime: { client: { storage: { persistent: true, path } } },
  });
