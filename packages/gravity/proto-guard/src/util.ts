//
// Copyright 2023 DXOS.org
//
import fs from 'node:fs';
import path from 'node:path';
import pkgUp from 'pkg-up';

import { Config } from '@dxos/client';
import { raise } from '@dxos/debug';

export const getStorageDir = () => {
  const packageDirname = path.dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('No package.json found')));
  const storageDir = path.join(packageDirname, 'storage');
  fs.mkdirSync(storageDir, { recursive: true });
  return storageDir;
};

export const getLastVersion = () => {
  const versions = fs.readdirSync(getStorageDir()).map((version) => Number(version));

  return Math.max(...versions, 0);
};

export const getConfig = (storageVersion?: number) => {
  storageVersion ??= getLastVersion();

  return new Config({
    version: 1,
    runtime: { client: { storage: { persistent: true, path: path.join(getStorageDir(), storageVersion.toString()) } } },
  });
};
