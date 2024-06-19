//
// Copyright 2024 DXOS.org
//
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { SnapshotsRegistry } from './snapshots-registry';

describe('SnapshotRegistry', () => {
  test('loads correctly', async () => {
    expect(SnapshotsRegistry.snapshots).to.deep.contains({
      name: 'echo-levelDB-transition',
      version: 2,
      dataRoot: 'snapshots/echo-levelDB-transition/snapshot',
      jsonDataPath: 'snapshots/echo-levelDB-transition/expected.json',
      timestamp: '2024-06-18T14:38:16.733Z',
    });
  });
});
