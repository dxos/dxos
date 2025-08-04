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

  // TODO(dmaretskyi): Doesn't work with migration code gone.
  test.skip('check if space loads for echo-levelDB-transition snapshot', { timeout: 10_000 }, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('echo-levelDB-transition');
    invariant(snapshot, 'Snapshot not found');
    log.info('Testing snapshot', { snapshot });

    const expectedData = await SpacesDumper.load(path.join(baseDir, snapshot.jsonDataPath));
    const tmp = copySnapshotToTmp(snapshot);

    const client = new Client({ config: createConfig({ dataRoot: tmp }) });
    await asyncTimeout(client.initialize(), 2_000);
    onTestFinished(() => client.destroy());

    log.break();

    await client.spaces.waitUntilReady();

    log.info('Preparing for migration');

    if (client.spaces.default.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
      await client.spaces.default.internal.migrate();
    }

    log.info('Default space migration completed');

    for (const space of client.spaces.get()) {
      if (space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
        log.info('migrating space', { id: space.id });
        await space.internal.migrate();
      }
    }

    log.break();

    expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
  });
});
