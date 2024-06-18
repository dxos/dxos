//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';

import { asyncTimeout } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

import { type SnapshotDescription, SnapshotsRegistry } from './snapshots-registry';
import { checkIfSpacesMatchDump } from './space-json-dump';
import { copyDirSync, createConfig, getBaseDataDir } from './util';

describe('Tests against storage', () => {
  const baseDir = getBaseDataDir();

  const copySnapshotToTmp = (snapshot: SnapshotDescription) => {
    const testStoragePath = path.join('tmp', `proto-guard-${PublicKey.random().toHex()}`);

    const storagePath = path.join(baseDir, snapshot.dataRoot);
    log.info('Copy storage', { src: storagePath, dest: testStoragePath });
    copyDirSync(storagePath, testStoragePath);
    afterTest(() => fs.rmSync(testStoragePath, { recursive: true }));

    return testStoragePath;
  };

  test('check if space loads for LevelDb snapshot', async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('levelDB');
    invariant(snapshot, 'Snapshot not found');
    log.info('Testing snapshot', { snapshot });

    const spacesDump = JSON.parse(fs.readFileSync(path.join(baseDir, snapshot.jsonDataPath), 'utf-8'));

    const tmp = copySnapshotToTmp(snapshot);
    const builder = new TestBuilder(createConfig({ dataRoot: tmp }));
    afterTest(() => builder.destroy());
    const services = builder.createLocalClientServices();

    const client = new Client({ services });
    await asyncTimeout(client.initialize(), 1_000);
    await client.spaces.isReady.wait();
    afterTest(() => services.close());
    afterTest(() => client.destroy());

    expect(await checkIfSpacesMatchDump(client, spacesDump)).to.be.true;
  });

  test('check if space loads for Automerge on nodeFS snapshot', async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('automerge');
    invariant(snapshot, 'Snapshot not found');
    log.info('Testing snapshot', { snapshot });

    const spacesDump = JSON.parse(fs.readFileSync(path.join(baseDir, snapshot.jsonDataPath), 'utf-8'));

    const tmp = copySnapshotToTmp(snapshot);
    const builder = new TestBuilder(createConfig({ dataRoot: tmp }));
    afterTest(() => builder.destroy());
    const services = builder.createLocalClientServices();

    const client = new Client({ services });
    await asyncTimeout(client.initialize(), 1_000);
    await client.spaces.isReady.wait();
    afterTest(() => services.close());
    afterTest(() => client.destroy());

    expect(await checkIfSpacesMatchDump(client, spacesDump)).to.be.true;
  });
});
