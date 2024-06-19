//
// Copyright 2024 DXOS.org
//
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { SnapshotsRegistry } from './snapshots-registry';

describe('SnapshotRegistry', () => {
  test('loads correctly', async () => {
    expect(SnapshotsRegistry.snapshots).to.deep.contains({
      name: 'automerge-nodeFS',
      version: 2,
      dataRoot: 'snapshots/2/snapshot',
      jsonDataPath: 'snapshots/2/expected.json',
    });
  });
});
