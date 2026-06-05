//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { failUndefined } from '@dxos/debug';

import { SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { withSnapshot } from './util';

describe('Load client from storage snapshot', () => {
  // Snapshot regenerated on the SQLite storage migration (2026-06-03).
  // The previous `2026-05-29` baseline used LevelDB/IndexedDB storage which
  // is incompatible with the new SQLite-backed storage layer. This becomes the
  // new backwards-compat baseline going forward.
  test('2026-06-03', { timeout: 30_000 }, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('2026-06-03') ?? failUndefined();
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
    });
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedDataUsingQuery(client, expectedData)).to.be.true;
    });
  });
});
