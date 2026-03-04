//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import pkgUp from 'pkg-up';

import { Config } from '@dxos/client';
import { raise } from '@dxos/debug';
import { create } from '@dxos/protocols/buf';
import {
  ConfigSchema,
  RuntimeSchema,
  Runtime_ClientSchema,
  Runtime_Client_StorageSchema,
} from '@dxos/protocols/buf/dxos/config_pb';

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
  new Config(
    create(ConfigSchema, {
      version: 1,
      runtime: create(RuntimeSchema, {
        client: create(Runtime_ClientSchema, {
          storage: create(Runtime_Client_StorageSchema, { persistent: true, dataRoot }),
        }),
      }),
    }),
  );

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
