//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { failUndefined } from '@dxos/debug';

import { SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { withSnapshot } from './util';

describe('Load client from storage snapshot', () => {
  // Snapshot regenerated on the credential-signing-canonical fix (2026-05-29).
  // The previous `2026-05-27` baseline was dropped: this branch strips proto3
  // default scalar values (`0`, `""`, `false`) from the credential signing
  // payload to match the post-wire canonical, which changes the bytes signed
  // by ED25519. Pre-fix credentials (e.g. `SpaceGenesis` with
  // `membershipPolicy: 0`) signed the unstripped canonical, so their
  // signatures no longer verify under this branch. This becomes the new
  // backwards-compat baseline going forward.
  test('2026-05-29', { timeout: 30_000 }, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot('2026-05-29') ?? failUndefined();
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
    });
    await withSnapshot(snapshot, async (client, expectedData) => {
      expect(await SpacesDumper.checkIfSpacesMatchExpectedDataUsingQuery(client, expectedData)).to.be.true;
    });
  });
});
