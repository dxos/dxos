//
// Copyright 2024 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { failUndefined } from '@dxos/debug';

import { type SnapshotDescription } from './types';
import { getStorageDir } from './util';

const SNAPSHOTS_PATH = join(getStorageDir(), 'snapshots.json');

export class SnapshotsRegistry {
  static snapshots: SnapshotDescription[] = JSON.parse(readFileSync(SNAPSHOTS_PATH, 'utf-8').toString());

  static registerSnapshot(snapshot: SnapshotDescription) {
    SnapshotsRegistry.snapshots.push(snapshot);
    writeFileSync(SNAPSHOTS_PATH, JSON.stringify(SnapshotsRegistry.snapshots, null, 2));
  }

  static getSnapshot(version: number): SnapshotDescription {
    return SnapshotsRegistry.snapshots.find((snapshot) => snapshot.version === version) ?? failUndefined();
  }
}
