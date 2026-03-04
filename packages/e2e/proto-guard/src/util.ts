//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import pkgUp from 'pkg-up';

import { asyncTimeout } from '@dxos/async';
import { Client, Config, PublicKey } from '@dxos/client';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { type SnapshotDescription } from './snapshots-registry';
import { SpacesDumper, type SpacesDump } from './space-json-dump';

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

export const copySnapshotToTmp = (snapshot: SnapshotDescription) => {
  const testStoragePath = path.join('/', 'tmp', `proto-guard-${PublicKey.random().toHex()}`);

  const storagePath = path.join(getBaseDataDir(), snapshot.dataRoot);
  log.info('Copy storage', { src: storagePath, dest: testStoragePath });
  copyDirSync(storagePath, testStoragePath);

  return testStoragePath;
};

export const withSnapshot = async (
  snapshot: SnapshotDescription,
  callback: (client: Client, expectedData: SpacesDump) => Promise<void>,
): Promise<void> => {
  const expectedData = await SpacesDumper.load(path.join(getBaseDataDir(), snapshot.jsonDataPath));
  const tmp = copySnapshotToTmp(snapshot);
  const client = new Client({ config: createConfig({ dataRoot: tmp }) });
  await asyncTimeout(client.initialize(), 2_000);
  await client.spaces.waitUntilReady();

  try {
    await callback(client, expectedData);
  } finally {
    await client.destroy();
  }
};
