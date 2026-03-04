//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { failUndefined } from '@dxos/debug';

import { SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { withSnapshot } from './util';

describe('Load client from storage snapshot', () => {
  test('2026-03-04', { timeout: 10_000 }, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('2026-03-04') ?? failUndefined();
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
    });
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedDataUsingQuery(client, expectedData)).to.be.true;
    });
  });
});
