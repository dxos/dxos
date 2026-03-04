//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import { SpaceState } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type SnapshotDescription, SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { copyDirSync, createConfig, getBaseDataDir } from './util';

describe('Load client from storage snapshot', () => {
  const baseDir = getBaseDataDir();

  const copySnapshotToTmp = (snapshot: SnapshotDescription) => {
    const testStoragePath = path.join('/', 'tmp', `proto-guard-${PublicKey.random().toHex()}`);

    const storagePath = path.join(baseDir, snapshot.dataRoot);
    log.info('Copy storage', { src: storagePath, dest: testStoragePath });
    copyDirSync(storagePath, testStoragePath);
    onTestFinished(() => fs.rmSync(testStoragePath, { recursive: true }));

    return testStoragePath;
  };

  test('2026-03-04', { timeout: 10_000 }, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('2026-03-04');
    const expectedData = await SpacesDumper.load(path.join(baseDir, snapshot.jsonDataPath));
    const tmp = copySnapshotToTmp(snapshot);
    const client = new Client({ config: createConfig({ dataRoot: tmp }) });
    await asyncTimeout(client.initialize(), 2_000);
    onTestFinished(() => client.destroy());
    await client.spaces.waitUntilReady();
    expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
  });
});
