//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { failUndefined } from '@dxos/debug';

import { SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { withSnapshot } from './util';

describe('Load client from storage snapshot', () => {
  // Snapshot regenerated on the canonical-URI migration (2026-06-12), which dropped all legacy
  // DXN forms (`dxn:echo:@:`, `dxn:type:`, …). Snapshots predating it are incompatible and were
  // removed; this is the new baseline going forward.
  test('2026-06-12', { timeout: 30_000 }, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('2026-06-12') ?? failUndefined();
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
    });
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedDataUsingQuery(client, expectedData)).to.be.true;
    });
  });
});
