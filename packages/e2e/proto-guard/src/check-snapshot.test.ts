//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { failUndefined } from '@dxos/debug';

import { SnapshotsRegistry } from './snapshots-registry.ts';
import { SpacesDumper } from './space-json-dump.ts';
import { withSnapshot } from './util.ts';

const checkSnapshot = async (name: string) => {
  const snapshot = SnapshotsRegistry.getSnapshot(name) ?? failUndefined();
  await withSnapshot(snapshot, async (client, expectedData) => {
    expect(await SpacesDumper.checkIfSpacesMatchExpectedData(client, expectedData)).to.be.true;
  });
  await withSnapshot(snapshot, async (client, expectedData) => {
    expect(await SpacesDumper.checkIfSpacesMatchExpectedDataUsingQuery(client, expectedData)).to.be.true;
  });
};

describe('Load client from storage snapshot', () => {
  // Snapshot regenerated on the canonical-URI migration (2026-06-12), which dropped all legacy
  // DXN forms (`dxn:echo:@:`, `dxn:type:`, …). Snapshots predating it are incompatible and were
  // removed; this is the new baseline going forward.
  test('2026-06-12', { timeout: 30_000 }, async () => {
    await checkSnapshot('2026-06-12');
  });

  // First snapshot written by buf codecs (protobuf.js was removed in #12990); the 2026-06-12
  // snapshot only covers bytes protobuf.js wrote.
  test('2026-09-23', { timeout: 30_000 }, async () => {
    await checkSnapshot('2026-09-23');
  });
});
