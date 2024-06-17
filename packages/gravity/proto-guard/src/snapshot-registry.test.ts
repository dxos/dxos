//
// Copyright 2024 DXOS.org
//
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { SnapshotsRegistry } from './snapshots-registry';

describe('SnapshotRegistry', () => {
  test('loads correctly', async () => {
    expect(SnapshotsRegistry.snapshots).to.deep.contains({
      name: 'hypergraph',
      version: '1',
      dataRoot: 'snapshots/1',
    });
  });
});
