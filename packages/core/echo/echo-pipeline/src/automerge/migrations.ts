//
// Copyright 2024 DXOS.org
//

import { type StorageKey } from '@dxos/automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@dxos/automerge/automerge-repo-storage-indexeddb';
import { type SublevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { StorageType, type Directory } from '@dxos/random-access-storage';

import { AutomergeStorageAdapter } from './automerge-storage-adapter';
import { encodingOptions } from './leveldb-storage-adapter';

export const levelMigration = async ({ db, directory }: { db: SublevelDB; directory: Directory }) => {
  // Note: Make auto-migration from previous storage to leveldb here.
  const isNewLevel = !(await db
    .iterator<StorageKey, Uint8Array>({
      ...encodingOptions,
    })
    .next());

  if (!isNewLevel) {
    return;
  }

  const oldStorageAdapter =
    directory.type === StorageType.IDB
      ? new IndexedDBStorageAdapter(directory.path, 'data')
      : new AutomergeStorageAdapter(directory);

  const chunks = await oldStorageAdapter.loadRange([]);
  if (chunks.length === 0) {
    return;
  }

  const batch = db.batch();
  log.info('found chunks on old storage adapter', { chunks: chunks.length });
  for (const { key, data } of await oldStorageAdapter.loadRange([])) {
    data && batch.put<StorageKey, Uint8Array>(key, data, { ...encodingOptions });
  }
  await batch.write();
};
