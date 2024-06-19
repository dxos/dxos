//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';

import { asyncTimeout } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

import { type SnapshotDescription, SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { copyDirSync, createConfig, getBaseDataDir } from './util';
import { SpaceState } from '@dxos/client/echo';

describe('Load client from storage snapshot', () => {
  const baseDir = getBaseDataDir();

  const copySnapshotToTmp = (snapshot: SnapshotDescription) => {
    const testStoragePath = path.join('/', 'tmp', `proto-guard-${PublicKey.random().toHex()}`);

    const storagePath = path.join(baseDir, snapshot.dataRoot);
    log.info('Copy storage', { src: storagePath, dest: testStoragePath });
    copyDirSync(storagePath, testStoragePath);
    afterTest(() => fs.rmSync(testStoragePath, { recursive: true }));

    return testStoragePath;
  };

  test
    .skip('check if space loads for Automerge on nodeFS snapshot', async () => {
      const snapshot = SnapshotsRegistry.getSnapshot('automerge-nodeFS');
      invariant(snapshot, 'Snapshot not found');
      log.info('Testing snapshot', { snapshot });

      const expectedData = await SpacesDumper.load(path.join(baseDir, snapshot.jsonDataPath));
      const tmp = copySnapshotToTmp(snapshot);

      const client = new Client({ config: createConfig({ dataRoot: tmp }) });
      await asyncTimeout(client.initialize(), 2_000);
      afterTest(() => client.destroy());
      await client.spaces.isReady.wait();

      expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
    })
    .timeout(10_000);

  test('check if space loads for LevelDb snapshot', async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('echo-levelDB-transition');
    invariant(snapshot, 'Snapshot not found');
    log.info('Testing snapshot', { snapshot });

    const expectedData = await SpacesDumper.load(path.join(baseDir, snapshot.jsonDataPath));
    const tmp = copySnapshotToTmp(snapshot);

    const client = new Client({ config: createConfig({ dataRoot: tmp }) });
    await asyncTimeout(client.initialize(), 2_000);
    afterTest(() => client.destroy());

    log.break();

    await client.spaces.defaultSpaceLocated;

    log.info('Preparing for migration');

    if (client.spaces.default.state.get() === SpaceState.REQUIRES_MIGRATION) {
      await client.spaces.default.internal.migrate();
    }

    log.info('Default space migration completed');

    await client.spaces.isReady.wait();

    for (const space of client.spaces.get()) {
      if (space.state.get() === SpaceState.REQUIRES_MIGRATION) {
        log.info('migrating space', { id: space.id });
        await space.internal.migrate();
      }
    }

    log.break();

    expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
  }).timeout(10_000);
});
