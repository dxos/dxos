//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import pkgUp from 'pkg-up';

import { Config } from '@dxos/client';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';

export const getPackageDir = () =>
  path.dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('No package.json found')));

export const getStorageDir = () => {
  const packageDirname = getPackageDir();
  const storageDir = path.join(packageDirname, 'data');
  fs.mkdirSync(storageDir, { recursive: true });
  return storageDir;
};

export const getLatestStorage = () => {
  const versions = fs
    .readdirSync(getStorageDir())
    .map((version) => Number(version))
    .filter((version) => !Number.isNaN(version));
  return Math.max(...versions, 0);
};

export const getConfig = (dataRoot: string) =>
  new Config({
    version: 1,
    runtime: { client: { storage: { persistent: true, dataRoot } } },
  });

export const contains = (container: Record<string, any>, contained: Record<string, any>): boolean => {
  for (const [key, value] of Object.entries(contained)) {
    if (!valuesEqual(value, container[key])) {
      return false;
    }
  }

  return true;
};

export const valuesEqual = (a: any, b: any): boolean => {
  try {
    if (Array.isArray(a)) {
      return (b as any[]).every((item1) => a.some((item2) => valuesEqual(item1, item2)));
    }
    if (typeof a === 'object' && a !== null && !Array.isArray(a)) {
      return contains(a, b) && contains(b, a);
    }
    if (a !== b) {
      return false;
    }
  } catch (err) {
    log.warn('Error', err);
    return false;
  }

  return true;
};
