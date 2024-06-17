//
// Copyright 2024 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { failUndefined } from '@dxos/debug';

import { getBaseDataDir } from './util';

const REGISTRY_FILE = join(getBaseDataDir(), 'registry.json');

export type SnapshotDescription = {
  /**
   * User defined name of the snapshot.
   */
  name: string;

  /**
   * Protocols STORAGE_VERSION of the snapshot.
   */
  version: number;

  /**
   * Relative path from root of the package for snapshot dataRoot .
   * Used in Client's config.
   */
  dataRoot: string;

  /**
   * Relative path from root of the package to the JSON data file generated on snapshot creation.
   * Compared with loaded data in tests.
   */
  jsonDataPath: string;

  /**
   * ISO string timestamp of the snapshot creation.
   */
  timestamp?: string;
};

export class SnapshotsRegistry {
  static snapshots: SnapshotDescription[] = JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8').toString());

  static registerSnapshot(snapshot: SnapshotDescription) {
    SnapshotsRegistry.snapshots.push(snapshot);
    writeFileSync(REGISTRY_FILE, JSON.stringify(SnapshotsRegistry.snapshots, null, 2));
  }

  static getSnapshot(version: number): SnapshotDescription {
    return SnapshotsRegistry.snapshots.find((snapshot) => snapshot.version === version) ?? failUndefined();
  }

  static getSnapshotByName(name: string): SnapshotDescription {
    return SnapshotsRegistry.snapshots.find((snapshot) => snapshot.name === name) ?? failUndefined();
  }

  static getLatestSnapshot(): SnapshotDescription {
    return SnapshotsRegistry.snapshots.reduce((latest, snapshot) =>
      snapshot.version > latest.version ? snapshot : latest,
    );
  }
}
