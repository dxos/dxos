//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { failUndefined } from '@dxos/debug';

import { SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { withSnapshot } from './util';

describe('Load client from storage snapshot', () => {
  // Snapshot generated on `origin/main` (commit ce9ee36543) prior to the
  // URI/EchoURI/DXN refactor on this branch. Exercises that the new code
  // can load spaces written by the previous storage layout.
  test('2026-05-25-main', { timeout: 30_000 }, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('2026-05-25-main') ?? failUndefined();
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
    });
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedDataUsingQuery(client, expectedData)).to.be.true;
    });
  });
});
