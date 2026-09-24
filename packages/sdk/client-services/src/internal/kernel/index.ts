//
// Copyright 2026 DXOS.org
//

import * as LayerSpec from '@dxos/compute/LayerSpec';

import * as Readiness from '../../Readiness.ts';
import * as SqliteStorage from '../../SqliteStorage.ts';
import { HypercoreFactorySpec, HypercoreStoreSpec, KeyringSpec } from './bindings.ts';
import { MetadataStoreSpec } from './metadata/index.ts';
import { StorageLifecycleSpec, StorageMigrationSpec } from './storage-lifecycle.ts';

export * from './bindings.ts';
export * from './storage-lifecycle.ts';

/**
 * Persistence and the readiness gate: the tier every other subsystem sits on.
 */
export const specs = (): LayerSpec.LayerSpec[] => [
  SqliteStorage.SqliteStorageSpec,
  SqliteStorage.HypercoreStorageDirectorySpec,
  KeyringSpec,
  MetadataStoreSpec,
  HypercoreFactorySpec,
  HypercoreStoreSpec,
  StorageMigrationSpec,
  StorageLifecycleSpec,
  Readiness.StackReadinessSpec,
];
