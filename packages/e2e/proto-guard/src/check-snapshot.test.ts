//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { failUndefined } from '@dxos/debug';

import { SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { withSnapshot } from './util';

describe('Load client from storage snapshot', () => {
  // Snapshot regenerated on the Option-B refactor branch (2026-05-27). The
  // previous `2026-05-25-main` baseline was dropped: Option B persists a new
  // `system.kind=type` brand on stored-schema objects, and pre-Option-B
  // snapshots lack it, so they are intentionally no longer loadable. This
  // becomes the new backwards-compat baseline going forward.
  test('2026-05-27', { timeout: 30_000 }, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('2026-05-27') ?? failUndefined();
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
    });
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedDataUsingQuery(client, expectedData)).to.be.true;
    });
  });
});
