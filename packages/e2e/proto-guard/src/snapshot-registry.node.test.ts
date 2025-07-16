//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SnapshotsRegistry } from './snapshots-registry';

describe('SnapshotRegistry', () => {
  test('loads correctly', async () => {
    expect(SnapshotsRegistry.snapshots).to.deep.contains({
      name: 'echo-levelDB-transition',
      version: 2,
      dataRoot: 'snapshots/echo-levelDB-transition/snapshot',
      jsonDataPath: 'snapshots/echo-levelDB-transition/expected.json',
      timestamp: '2024-06-19T13:36:43.418Z',
    });
  });
});
