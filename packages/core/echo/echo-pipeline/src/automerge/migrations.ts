//
// Copyright 2024 DXOS.org
//

import { type StorageKey } from '@dxos/automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@dxos/automerge/automerge-repo-storage-indexeddb';
import { log } from '@dxos/log';
import { StorageType, type Directory } from '@dxos/random-access-storage';

import { AutomergeStorageAdapter } from './automerge-storage-adapter';
import { type MySublevel } from './types';

export const levelMigration = async ({ db, directory }: { db: MySublevel; directory: Directory }) => {
  // Note: Make automigration from previous storage to leveldb here.
  const isNewLevel = !(await db
    .iterator<StorageKey, Uint8Array>({
      keyEncoding: 'buffer',
      valueEncoding: 'buffer',
    })
    .next());

  if (!isNewLevel) {
    return;
  }

  const oldStorageAdapter =
    directory.type === StorageType.IDB
      ? new IndexedDBStorageAdapter(directory.path, 'data')
      : new AutomergeStorageAdapter(directory);

  const batch = db.batch();
  const chunks = await oldStorageAdapter.loadRange([]);
  log.info('found chunks on old storage adapter', { chunks: chunks.length });
  for (const { key, data } of await oldStorageAdapter.loadRange([])) {
    data && batch.put<StorageKey, Uint8Array>(key, data, { keyEncoding: 'buffer', valueEncoding: 'buffer' });
  }
  await batch.write();
};
