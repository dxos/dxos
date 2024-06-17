//
// Copyright 2023 DXOS.org
//

import isEqual from 'lodash.isequal';
import fs from 'node:fs';
import path from 'node:path';
import pkgUp from 'pkg-up';

import { Config } from '@dxos/client';
import { raise } from '@dxos/debug';

export const SNAPSHOTS_DIR = 'snapshots';
export const SNAPSHOT_DIR = 'snapshot';
export const EXPECTED_JSON_DATA = 'expected.json';
export const DATA_DIR = 'data';

export const getPackageDir = () =>
  path.dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('No package.json found')));

export const getBaseDataDir = () => {
  const packageDirname = getPackageDir();
  const storageDir = path.join(packageDirname, DATA_DIR);
  fs.mkdirSync(storageDir, { recursive: true });
  return storageDir;
};

export const createConfig = ({ dataRoot }: { dataRoot: string }) =>
  new Config({
    version: 1,
    runtime: { client: { storage: { persistent: true, dataRoot } } },
  });

export const contains = (container: Record<string, any>, contained: Record<string, any>): boolean => {
  for (const [key, value] of Object.entries(contained)) {
    if (!isEqual(value, container[key])) {
      return false;
    }
  }

  return true;
};

export const copyDirSync = (src: string, dest: string) => {
  const files = fs.readdirSync(src);

  for (const file of files) {
    const fromPath = path.join(src, file);
    const toPath = path.join(dest, file);
    fs.mkdirSync(dest, { recursive: true });

    const stat = fs.statSync(fromPath);

    if (stat.isFile()) {
      fs.copyFileSync(fromPath, toPath);
    } else if (stat.isDirectory()) {
      copyDirSync(fromPath, toPath);
    }
  }
};
